// ============================================================================
// Geocoding for the shelter map. Uses OpenStreetMap Nominatim (free, no key).
// Runs server-side to avoid browser CORS + to send a proper User-Agent.
// Center (the user's city) almost always resolves, so the map is never broken;
// resource pins + a generic shelter fallback are best-effort bonuses.
//
// Coordinates leave here as `Latitude`/`Longitude`, which can only be built by
// passing a range check — so a provider that answers with a swapped pair or a
// string where a number belongs produces no pin, rather than one in the sea.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { fetchJson } from "@/lib/fetch";
import {
  nominatimPin,
  nominatimResponseSchema,
  nominatimUrl,
  NOMINATIM_HEADERS,
  photonPin,
  photonResponseSchema,
  photonUrl,
} from "@/lib/external";
import { badRequest, parseBody } from "@/lib/route";
import { toCoords, type Coords } from "@/lib/brand";
import type { MapPin } from "@/lib/types";
import type { GeocodeResponse } from "@/lib/api";

// One lookup per distinct query per server instance.
const cache = new Map<string, MapPin | null>();

/** Try Photon (free, no key, lenient) first, then Nominatim as a fallback. */
async function geocode(query: string): Promise<MapPin | null> {
  const key = query.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const photon = await fetchJson(photonUrl(query), photonResponseSchema);
  let pin = photon.ok ? photonPin(photon.value, query) : null;

  if (!pin) {
    const nominatim = await fetchJson(nominatimUrl(query), nominatimResponseSchema, {
      headers: NOMINATIM_HEADERS,
    });
    pin = nominatim.ok ? nominatimPin(nominatim.value, query) : null;
  }

  cache.set(key, pin);
  return pin;
}

async function center(location: string): Promise<Coords | null> {
  const pin = await geocode(location);
  return pin ? toCoords(pin.lat, pin.lng) : null;
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody("/api/geocode", req);
  if (!parsed.ok) return badRequest(parsed.error);
  const { location, resources } = parsed.value;
  if (!location) return NextResponse.json<GeocodeResponse>({ center: null, pins: [] });

  const middle = await center(location);

  // Best-effort: geocode each named resource within the city.
  const pins: MapPin[] = [];
  for (const resource of resources) {
    const pin = await geocode(`${resource.name}, ${location}`);
    if (pin) pins.push({ ...pin, name: resource.name });
  }

  // Fallback so the map shows real shelters even without grounded resources.
  if (pins.length === 0) {
    for (const query of [`homeless shelter, ${location}`, `emergency shelter near ${location}`]) {
      const pin = await geocode(query);
      if (pin) pins.push({ ...pin, name: "Nearby shelter" });
    }
  }

  return NextResponse.json<GeocodeResponse>({ center: middle, pins });
}
