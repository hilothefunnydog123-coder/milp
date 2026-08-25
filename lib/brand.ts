// ============================================================================
// Nominal types for the primitives this app keeps confusing with each other.
//
// A latitude and a longitude are both `number`; a call id, a language name and
// a phone number are all `string`. Structural typing happily lets you swap
// them — and `pins.push({ lat: lng, lng: lat })` type-checks perfectly right up
// until the map centres on the wrong continent.
//
// A brand is a compile-time-only tag: zero runtime cost, zero serialization
// impact (they're still just strings and numbers in JSON), but the only way to
// obtain one is to go through a checker, so possessing the type means the value
// was actually validated.
// ============================================================================

import { object, refine, transform, number, text, type Schema } from "./schema";

declare const BRAND: unique symbol;

/** `Brand<string, "CallId">` is a string nothing else can be assigned to. */
export type Brand<T, Tag extends string> = T & { readonly [BRAND]: Tag };

/** Strips the tag back off, for the rare place that needs the raw primitive. */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

export type Latitude = Brand<number, "Latitude">;
export type Longitude = Brand<number, "Longitude">;

export function isLatitude(n: number): n is Latitude {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

export function isLongitude(n: number): n is Longitude {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

export const latitudeSchema: Schema<Latitude> = refine(
  number({ coerce: true }),
  isLatitude,
  "latitude must be between -90 and 90"
);

export const longitudeSchema: Schema<Longitude> = refine(
  number({ coerce: true }),
  isLongitude,
  "longitude must be between -180 and 180"
);

/** A point that has been checked to be on Earth. */
export interface Coords {
  readonly lat: Latitude;
  readonly lng: Longitude;
}

export function toCoords(lat: number, lng: number): Coords | null {
  return isLatitude(lat) && isLongitude(lng) ? { lat, lng } : null;
}

export const coordsSchema: Schema<Coords> = object({
  lat: latitudeSchema,
  lng: longitudeSchema,
});

// ---------------------------------------------------------------------------
// Identifiers and labels
// ---------------------------------------------------------------------------

export type StepId = Brand<string, "StepId">;
export type CallId = Brand<string, "CallId">;
export type PhoneNumber = Brand<string, "PhoneNumber">;
export type LanguageName = Brand<string, "LanguageName">;
export type IsoTimestamp = Brand<string, "IsoTimestamp">;

export function stepId(index: number): StepId {
  return `s${index}` as StepId;
}

export function isCallId(s: string): s is CallId {
  return s.length > 0 && s.length <= 128;
}

export const callIdSchema: Schema<CallId> = refine(text({ max: 128 }), isCallId, "expected a call id");

/** A demo/simulated call, as opposed to one Vapi actually placed. */
export function isSimulatedCall(id: CallId): boolean {
  return id.startsWith("mock");
}

export function simulatedCallId(seed: number): CallId {
  return `mock-${seed}` as CallId;
}

/** Pulls the first dialable number out of free text ("Call 555-0100 for intake"). */
export function extractPhone(source: string | undefined): PhoneNumber | null {
  if (!source) return null;
  const match = source.match(/\+?\d[\d\s().-]{6,}\d/);
  if (!match) return null;
  const digits = match[0].replace(/[^\d+]/g, "");
  return digits.length >= 7 ? (digits as PhoneNumber) : null;
}

/**
 * The number to actually dial: extracted from free text, then normalized to
 * E.164 so Vapi can place the call. Empty string when there's nothing dialable,
 * which is what the callers already branch on.
 */
export function dialable(source: string | undefined): PhoneNumber | "" {
  const found = extractPhone(source);
  if (!found) return "";
  if (/^\d{10}$/.test(found)) return `+1${found}` as PhoneNumber;
  if (/^1\d{10}$/.test(found)) return `+${found}` as PhoneNumber;
  return found;
}

export const DEFAULT_LANGUAGE = "English" as LanguageName;

function isLanguageName(s: string): s is LanguageName {
  return s.trim().length > 0 && s.length <= 30;
}

/** Language never blocks anything — an unusable label just becomes English. */
export function toLanguage(raw: string | null | undefined): LanguageName {
  const value = (raw ?? "").trim();
  return isLanguageName(value) ? (value as LanguageName) : DEFAULT_LANGUAGE;
}

export const languageSchema: Schema<LanguageName> = transform(text({ max: 30 }), (v) => toLanguage(v));

/** The languages the intake page offers, as language names rather than strings. */
export const SUPPORTED_LANGUAGES: readonly LanguageName[] = [
  "English",
  "Español",
  "中文 (Chinese)",
  "Tiếng Việt (Vietnamese)",
  "Tagalog",
  "العربية (Arabic)",
  "Русский (Russian)",
  "Français",
  "Português",
  "한국어 (Korean)",
] as LanguageName[];

export function isIsoTimestamp(s: string): s is IsoTimestamp {
  return !Number.isNaN(Date.parse(s));
}

export function nowIso(): IsoTimestamp {
  return new Date().toISOString() as IsoTimestamp;
}

export const isoTimestampSchema: Schema<IsoTimestamp> = refine(
  text({ max: 40 }),
  isIsoTimestamp,
  "expected an ISO-8601 timestamp"
);
