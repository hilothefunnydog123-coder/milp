// ============================================================================
// localStorage, with the promises checked.
//
// Browser storage is the app's other untrusted input: it survives deploys, so
// a value written by last week's build is read by today's, and
// `JSON.parse(localStorage.getItem("yn_path")!) as CompassPath` will happily
// hand a stale or half-written object to a component that then crashes on
// `path.steps.map`.
//
// Every key is registered here with a schema, a fallback and a codec, so
// reading is total: you always get the declared type, whether the key is
// missing, stale, corrupt, or the browser refuses storage entirely. The codecs
// preserve the exact on-disk format each key already used, so nobody's
// in-progress path is lost to this change.
// ============================================================================

import {
  boolean,
  nullable,
  number,
  object,
  record,
  text,
  type Schema,
} from "./schema";
import { coordsSchema, languageSchema, DEFAULT_LANGUAGE, type Coords, type LanguageName } from "./brand";
import { compassPathSchema, type CompassPath } from "./types";

interface Codec<T> {
  decode(raw: string): unknown;
  encode(value: T): string;
}

const JSON_CODEC: Codec<unknown> = {
  decode(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  },
  encode: (value) => JSON.stringify(value),
};

/** Plain strings (language, the person's own words) are stored unwrapped. */
const RAW_CODEC: Codec<string> = { decode: (raw) => raw, encode: (value) => value };

/** Flags have always been "1"/"0" on disk; keep it that way, type it properly. */
const FLAG_CODEC: Codec<boolean> = {
  decode: (raw) => raw === "1",
  encode: (value) => (value ? "1" : "0"),
};

const NUMBER_CODEC: Codec<number> = {
  decode: (raw) => (raw.trim() === "" ? undefined : Number(raw)),
  encode: (value) => String(value),
};

export interface StoreEntry<T> {
  readonly key: string;
  readonly schema: Schema<T>;
  readonly fallback: T;
  readonly codec: Codec<never>;
}

function entry<T>(key: string, schema: Schema<T>, fallback: T, codec: Codec<T> = JSON_CODEC as Codec<T>): StoreEntry<T> {
  return { key, schema, fallback, codec: codec as Codec<never> };
}

const flag = (key: string, fallback: boolean) => entry(key, boolean(), fallback, FLAG_CODEC);

const pointSchema = object({ x: number(), y: number() });
const sizeSchema = object({ w: number({ min: 1 }), h: number({ min: 1 }) });

/** Every key this app is allowed to touch, and what lives behind it. */
export const STORE = {
  /** the person's generated path — the one thing we'd hate to lose */
  path: entry("yn_path", nullable(compassPathSchema), null as CompassPath | null),
  language: entry("yn_lang", languageSchema, DEFAULT_LANGUAGE, RAW_CODEC as Codec<LanguageName>),
  situation: entry("yn_situation", text({ max: 1200 }), "", RAW_CODEC),
  /** step id -> checked off */
  progress: entry("yn_progress", record(boolean()), {} as Record<string, boolean>),
  /** document label -> gathered */
  documents: entry("yn_docs", record(boolean()), {} as Record<string, boolean>),
  /** exact coordinates of the place they picked, so the map skips geocoding */
  coords: entry("yn_coords", nullable(coordsSchema), null as Coords | null),
  largeText: flag("yn_a11y_large", false),
  highContrast: flag("yn_a11y_contrast", false),
  deckPage: entry("yn_deck_page", number({ int: true, min: 1 }), 1, NUMBER_CODEC),
  deckPosition: entry("yn_deck_pos", nullable(pointSchema), null as { x: number; y: number } | null),
  deckSize: entry("yn_deck_size", nullable(sizeSchema), null as { w: number; h: number } | null),
  deckOpen: flag("yn_deck_open", true),
  deckMinimized: flag("yn_deck_min", false),
} as const;

export type StoreKey = keyof typeof STORE;

/** The type behind a key — `Stored<"path">` is `CompassPath | null`. */
export type Stored<K extends StoreKey> = (typeof STORE)[K] extends StoreEntry<infer T> ? T : never;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null; // private mode, blocked cookies, embedded webview
  }
}

/** Always returns the declared type: missing, stale and corrupt all read as the fallback. */
export function read<K extends StoreKey>(key: K): Stored<K> {
  const spec = STORE[key] as StoreEntry<Stored<K>>;
  const store = storage();
  if (!store) return spec.fallback;
  let raw: string | null;
  try {
    raw = store.getItem(spec.key);
  } catch {
    return spec.fallback;
  }
  if (raw === null) return spec.fallback;
  const decoded = (spec.codec as Codec<Stored<K>>).decode(raw);
  const parsed = spec.schema.parse(decoded);
  return parsed.ok ? parsed.value : spec.fallback;
}

/** Writes only values the schema accepts, so we can't poison our own storage. */
export function write<K extends StoreKey>(key: K, value: Stored<K>): boolean {
  const spec = STORE[key] as StoreEntry<Stored<K>>;
  const store = storage();
  if (!store) return false;
  const parsed = spec.schema.parse(value);
  if (!parsed.ok) return false;
  try {
    store.setItem(spec.key, (spec.codec as Codec<Stored<K>>).encode(parsed.value));
    return true;
  } catch {
    return false; // quota exceeded, or storage disabled mid-session
  }
}

export function remove(key: StoreKey): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORE[key].key);
  } catch {
    /* nothing to do — the value is already effectively gone */
  }
}

/** Read-modify-write for the two checklist maps. */
export function toggle(key: "progress" | "documents", id: string): Record<string, boolean> {
  const current = read(key);
  const next = { ...current, [id]: !current[id] };
  write(key, next);
  return next;
}
