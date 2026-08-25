// ============================================================================
// The outside world, given types.
//
// Six services answer this app: Photon and Nominatim geocode, Overpass finds
// shelters, Open-Meteo says how cold tonight is, Vapi places the call, Gemini
// writes the plan. None of them know about us, none of them are versioned with
// us, and all of them used to be read with optional-chained guesswork —
// `j?.features?.[0]?.geometry?.coordinates` — that types as `any` and lies
// about `[lng, lat]` ordering with a straight face.
//
// Each response is declared here as a schema, once, and adapted straight into
// our own domain types. If a provider changes shape, exactly one file notices,
// and it degrades instead of rendering nonsense.
// ============================================================================

import {
  forgivingList,
  number,
  object,
  optional,
  orElse,
  record,
  text,
  type Infer,
} from "./schema";
import { fetchJson, type FetchResult } from "./fetch";
import { toCoords, type CallId, type Coords } from "./brand";
import { makePin, type MapPin, type Source } from "./types";
import type { TranscriptTurn } from "./api";

// ---------------------------------------------------------------------------
// Photon (komoot) — the primary, key-less geocoder
// ---------------------------------------------------------------------------

/** GeoJSON puts longitude FIRST. Naming it here so nobody has to remember. */
const lngLatPairSchema = object({
  coordinates: forgivingList(number({ coerce: true }), { max: 2 }),
});

const photonPropertiesSchema = object({
  name: optional(text({ max: 120 })),
  housenumber: optional(text({ max: 24 })),
  street: optional(text({ max: 120 })),
  city: optional(text({ max: 80 })),
  state: optional(text({ max: 80 })),
  country: optional(text({ max: 80 })),
});

const photonFeatureSchema = object({
  geometry: optional(lngLatPairSchema),
  properties: orElse(photonPropertiesSchema, {}),
});

export const photonResponseSchema = object({
  features: forgivingList(photonFeatureSchema, { max: 20 }),
});

export type PhotonFeature = Infer<typeof photonFeatureSchema>;

function photonCoords(feature: PhotonFeature): Coords | null {
  const pair = feature.geometry?.coordinates;
  if (!pair || pair.length < 2) return null;
  const [lng, lat] = pair;
  return lng === undefined || lat === undefined ? null : toCoords(lat, lng);
}

/** "Wilshire Blvd, Los Angeles, California" from whichever parts came back. */
export function photonLabel(feature: PhotonFeature, fallback: string): string {
  const p = feature.properties;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  return [p.name, street, p.city, p.state].filter(Boolean).join(", ") || fallback;
}

/** A place the person can pick from the location autocomplete. */
export interface PlaceSuggestion {
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
}

export function photonSuggestions(response: Infer<typeof photonResponseSchema>): PlaceSuggestion[] {
  const seen = new Set<string>();
  const places: PlaceSuggestion[] = [];
  for (const feature of response.features) {
    const coords = photonCoords(feature);
    const name = feature.properties.name;
    if (!coords || !name) continue;
    const label = [name, feature.properties.state, feature.properties.country].filter(Boolean).join(", ");
    if (seen.has(label)) continue;
    seen.add(label);
    places.push({ label, lat: coords.lat, lng: coords.lng });
  }
  return places;
}

export function photonPin(response: Infer<typeof photonResponseSchema>, query: string): MapPin | null {
  const feature = response.features[0];
  if (!feature) return null;
  const coords = photonCoords(feature);
  if (!coords) return null;
  return makePin(feature.properties.name || query, photonLabel(feature, query), coords.lat, coords.lng);
}

export function photonUrl(query: string, params: { limit?: number; placesOnly?: boolean } = {}): string {
  const search = new URLSearchParams({ q: query, limit: String(params.limit ?? 1) });
  if (params.placesOnly) {
    search.set("lang", "en");
    search.set("osm_tag", "place");
  }
  return `https://photon.komoot.io/api/?${search.toString()}`;
}

export function geocodeViaPhoton(query: string, limit = 1): Promise<FetchResult<Infer<typeof photonResponseSchema>>> {
  return fetchJson(photonUrl(query, { limit }), photonResponseSchema);
}

// ---------------------------------------------------------------------------
// Nominatim (OpenStreetMap) — the fallback geocoder
// ---------------------------------------------------------------------------

const nominatimHitSchema = object({
  lat: number({ coerce: true }),
  lon: number({ coerce: true }),
  display_name: orElse(text({ max: 300 }), ""),
});

export const nominatimResponseSchema = forgivingList(nominatimHitSchema, { max: 5 });

export function nominatimPin(response: Infer<typeof nominatimResponseSchema>, query: string): MapPin | null {
  const hit = response[0];
  if (!hit) return null;
  return makePin(query, hit.display_name || query, hit.lat, hit.lon);
}

export function nominatimUrl(query: string, limit = 1): string {
  const search = new URLSearchParams({ q: query, format: "json", limit: String(limit) });
  return `https://nominatim.openstreetmap.org/search?${search.toString()}`;
}

/** Nominatim's usage policy asks for an identifying User-Agent. */
export const NOMINATIM_HEADERS = {
  "User-Agent": "YNorth/1.0 (housing-resource map; hackathon project)",
} as const;

// ---------------------------------------------------------------------------
// Overpass — many real shelters and social-service points near a point
// ---------------------------------------------------------------------------

const overpassElementSchema = object({
  lat: optional(number({ coerce: true })),
  lon: optional(number({ coerce: true })),
  center: optional(object({ lat: number({ coerce: true }), lon: number({ coerce: true }) })),
  tags: orElse(record(text({ max: 200 })), {}),
});

export const overpassResponseSchema = object({
  elements: forgivingList(overpassElementSchema, { max: 200 }),
});

export type OverpassElement = Infer<typeof overpassElementSchema>;

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/** Nodes and ways tagged as shelter / social facilities within `radius` metres. */
export function overpassQuery(lat: number, lng: number, radius = 25_000): string {
  const near = `around:${radius},${lat},${lng}`;
  return (
    `[out:json][timeout:25];(` +
    `node["social_facility"](${near});` +
    `way["social_facility"](${near});` +
    `node["amenity"="shelter"](${near});` +
    `way["amenity"="shelter"](${near});` +
    `node["amenity"="social_centre"](${near});` +
    `);out center 80;`
  );
}

export function overpassPins(response: Infer<typeof overpassResponseSchema>): MapPin[] {
  const pins: MapPin[] = [];
  for (const element of response.elements) {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat === undefined || lng === undefined) continue;
    const tags = element.tags;
    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
    const address = [street, tags["addr:city"]].filter(Boolean).join(", ");
    const pin = makePin(
      tags.name || "Shelter / social services",
      address || "Community / social services",
      lat,
      lng
    );
    if (pin) pins.push(pin);
  }
  return pins;
}

export function fetchOverpassPins(lat: number, lng: number): Promise<FetchResult<Infer<typeof overpassResponseSchema>>> {
  return fetchJson(OVERPASS_URL, overpassResponseSchema, {
    method: "POST",
    body: overpassQuery(lat, lng),
  });
}

// ---------------------------------------------------------------------------
// Open-Meteo — is tonight dangerous to sleep outside?
// ---------------------------------------------------------------------------

export const openMeteoResponseSchema = object({
  current: object({
    temperature_2m: number(),
    precipitation: orElse(number(), 0),
    weather_code: orElse(number({ int: true }), 0),
  }),
});

export type OpenMeteoResponse = Infer<typeof openMeteoResponseSchema>;

/** WMO codes for frozen precipitation. */
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

export interface WeatherReading {
  readonly temp: number;
  readonly wet: boolean;
  readonly snow: boolean;
}

export function readWeather(response: OpenMeteoResponse): WeatherReading {
  const { temperature_2m, precipitation, weather_code } = response.current;
  const snow = SNOW_CODES.has(weather_code);
  const drizzleOrRain = (weather_code >= 51 && weather_code <= 67) || (weather_code >= 80 && weather_code <= 82);
  return {
    temp: Math.round(temperature_2m),
    wet: precipitation > 0 || drizzleOrRain || snow,
    snow,
  };
}

/** Only alert when it genuinely matters — cold enough or wet enough to hurt. */
export function isUrgentWeather(reading: WeatherReading): boolean {
  return reading.temp <= 42 || reading.wet;
}

export function openMeteoUrl(lat: number, lng: number): string {
  const search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,precipitation,weather_code",
    temperature_unit: "fahrenheit",
  });
  return `https://api.open-meteo.com/v1/forecast?${search.toString()}`;
}

export function fetchWeather(lat: number, lng: number): Promise<FetchResult<OpenMeteoResponse>> {
  return fetchJson(openMeteoUrl(lat, lng), openMeteoResponseSchema);
}

// ---------------------------------------------------------------------------
// Vapi — the voice agent that actually dials
// ---------------------------------------------------------------------------

export const vapiCreatedCallSchema = object({
  id: text({ max: 128, min: 1 }),
  monitor: optional(object({ controlUrl: optional(text({ max: 500 })) })),
});

export type VapiCreatedCall = Infer<typeof vapiCreatedCallSchema>;

const vapiMessageSchema = object({
  role: optional(text({ max: 40 })),
  message: optional(text({ max: 4000 })),
  content: optional(text({ max: 4000 })),
});

export const vapiCallSchema = object({
  status: orElse(text({ max: 40 }), ""),
  artifact: optional(object({ messages: forgivingList(vapiMessageSchema, { max: 400 }) })),
  messages: forgivingList(vapiMessageSchema, { max: 400 }),
});

export type VapiCall = Infer<typeof vapiCallSchema>;

const AGENT_ROLES = new Set(["assistant", "bot"]);

/** Vapi's message log, reduced to the two-sided transcript the UI streams. */
export function vapiTranscript(call: VapiCall): TranscriptTurn[] {
  const messages = call.artifact?.messages?.length ? call.artifact.messages : call.messages;
  const turns: TranscriptTurn[] = [];
  for (const message of messages) {
    const role = (message.role ?? "").toLowerCase();
    if (role === "system") continue;
    const body = message.message ?? message.content ?? "";
    if (!body) continue;
    turns.push({ speaker: AGENT_ROLES.has(role) ? "assistant" : "caller", text: body });
  }
  return turns;
}

export function vapiIsFinished(call: VapiCall): boolean {
  return call.status === "ended";
}

export const VAPI_BASE = "https://api.vapi.ai";

export function vapiCallUrl(id: CallId): string {
  return `${VAPI_BASE}/call/${encodeURIComponent(id)}`;
}

// ---------------------------------------------------------------------------
// Gemini — reasoning, and grounded search that has to stay citable
// ---------------------------------------------------------------------------

const geminiPartSchema = object({ text: optional(text({ max: 100_000 })) });

const groundingChunkSchema = object({
  web: optional(object({ uri: optional(text({ max: 500 })), title: optional(text({ max: 200 })) })),
});

const geminiCandidateSchema = object({
  content: optional(object({ parts: forgivingList(geminiPartSchema, { max: 64 }) })),
  groundingMetadata: optional(
    object({ groundingChunks: forgivingList(groundingChunkSchema, { max: 40 }) })
  ),
});

export const geminiResponseSchema = object({
  candidates: forgivingList(geminiCandidateSchema, { max: 4 }),
});

export type GeminiResponse = Infer<typeof geminiResponseSchema>;

/** All text parts of the first candidate, joined — Gemini splits long replies. */
export function geminiText(response: GeminiResponse): string {
  const parts = response.candidates[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

/** The citations that make a grounded answer checkable rather than plausible. */
export function geminiSources(response: GeminiResponse, max = 6): Source[] {
  const chunks = response.candidates[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: Source[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri) continue;
    sources.push({ title: chunk.web?.title ?? "", uri });
    if (sources.length >= max) break;
  }
  return sources;
}
