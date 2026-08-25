// ============================================================================
// A tiny structural validator whose *types come out of the validator itself*.
//
// Every value entering this app arrives as `any`: `await req.json()`,
// `await res.json()`, `JSON.parse(localStorage.getItem(...))`, a third-party
// REST payload, an LLM's best guess at JSON. Declaring an interface for those
// is a promise, not a check — the interface says `string` while the wire says
// `null` and nobody finds out until it renders.
//
// So schemas are declared once, and then:
//   • `Infer<typeof schema>` is the static type,
//   • `schema.parse(unknown)` is the runtime proof,
// which makes drift between the two impossible by construction. No dependency,
// no decorators, ~200 lines.
// ============================================================================

import { err, ok, type NonEmptyArray, type Prettify, type Result } from "./typed";

export interface SchemaError {
  /** dotted path to the offending value, e.g. `steps[2].stage` */
  readonly path: string;
  readonly message: string;
}

export interface Schema<out T> {
  /** human label used in error messages ("string", "one of now|soon|later", …) */
  readonly name: string;
  parse(input: unknown, path?: string): Result<T, SchemaError>;
}

/** The static type a schema produces. The whole point of the module. */
export type Infer<S> = S extends Schema<infer T> ? T : never;

// A real symbol, not a `declare`d one: it is used as a runtime marker as well
// as a type-level one, and a type-only declaration would be `undefined` here.
const OPTIONAL: unique symbol = Symbol("schema.optional");
/** A schema that also permits its key to be absent from an object. */
export interface OptionalSchema<out T> extends Schema<T | undefined> {
  readonly [OPTIONAL]: true;
}

function fail(path: string, message: string): Result<never, SchemaError> {
  return err({ path: path || "(root)", message });
}

function define<T>(name: string, parse: Schema<T>["parse"]): Schema<T> {
  return { name, parse };
}

// ---------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------

export interface TextOptions {
  /** hard cap; longer input is truncated rather than rejected */
  readonly max?: number;
  readonly min?: number;
  readonly trim?: boolean;
}

/** A string, optionally length-bounded. Rejects non-strings. */
export function text(options: TextOptions = {}): Schema<string> {
  const { max, min = 0, trim = false } = options;
  return define("string", (input, path = "") => {
    if (typeof input !== "string") return fail(path, `expected string, got ${describe(input)}`);
    const value = trim ? input.trim() : input;
    if (value.length < min) return fail(path, `expected at least ${min} characters`);
    return ok(max === undefined ? value : value.slice(0, max));
  });
}

/**
 * The forgiving twin of `text`, and the reason most request fields never 400:
 * it reproduces exactly what this codebase used to write by hand at every
 * boundary — `String(body.x || "").slice(0, max)` — as one declarative unit.
 */
export function clamped(max: number): Schema<string> {
  return define("clamped string", (input, path = "") => {
    if (input === null || input === undefined) return ok("");
    if (typeof input === "object") return fail(path, `expected text, got ${describe(input)}`);
    return ok(String(input).slice(0, max));
  });
}

export interface NumberOptions {
  readonly min?: number;
  readonly max?: number;
  readonly int?: boolean;
  /** accept numeric strings — geocoders love returning `"34.05"` */
  readonly coerce?: boolean;
}

export function number(options: NumberOptions = {}): Schema<number> {
  const { min, max, int = false, coerce = false } = options;
  return define("number", (input, path = "") => {
    const value = coerce && typeof input === "string" && input.trim() !== "" ? Number(input) : input;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return fail(path, `expected a finite number, got ${describe(input)}`);
    }
    if (int && !Number.isInteger(value)) return fail(path, "expected an integer");
    if (min !== undefined && value < min) return fail(path, `expected >= ${min}`);
    if (max !== undefined && value > max) return fail(path, `expected <= ${max}`);
    return ok(value);
  });
}

export function boolean(): Schema<boolean> {
  return define("boolean", (input, path = "") =>
    typeof input === "boolean" ? ok(input) : fail(path, `expected boolean, got ${describe(input)}`)
  );
}

/** A single literal value — the building block of discriminated unions. */
export function literal<const T extends string | number | boolean>(value: T): Schema<T> {
  return define(JSON.stringify(value), (input, path = "") =>
    input === value ? ok(value) : fail(path, `expected ${JSON.stringify(value)}`)
  );
}

/** A closed set of literals, inferred as a union rather than widened to string. */
export function oneOf<const T extends string | number>(values: NonEmptyArray<T>): Schema<T> {
  const label = `one of ${values.join("|")}`;
  return define(label, (input, path = "") =>
    values.includes(input as T) ? ok(input as T) : fail(path, `expected ${label}`)
  );
}

// ---------------------------------------------------------------------------
// Composites
// ---------------------------------------------------------------------------

export function list<T>(item: Schema<T>, options: { max?: number } = {}): Schema<T[]> {
  return define(`${item.name}[]`, (input, path = "") => {
    if (!Array.isArray(input)) return fail(path, `expected array, got ${describe(input)}`);
    const source = options.max === undefined ? input : input.slice(0, options.max);
    const out: T[] = [];
    for (let i = 0; i < source.length; i++) {
      const parsed = item.parse(source[i], `${path}[${i}]`);
      if (!parsed.ok) return parsed;
      out.push(parsed.value);
    }
    return ok(out);
  });
}

/** Keeps the well-formed elements and silently drops the rest. */
export function forgivingList<T>(item: Schema<T>, options: { max?: number } = {}): Schema<T[]> {
  return define(`${item.name}[]?`, (input, path = "") => {
    if (!Array.isArray(input)) return ok([]);
    const out: T[] = [];
    for (let i = 0; i < input.length && (options.max === undefined || out.length < options.max); i++) {
      const parsed = item.parse(input[i], `${path}[${i}]`);
      if (parsed.ok) out.push(parsed.value);
    }
    return ok(out);
  });
}

export function record<T>(value: Schema<T>): Schema<Record<string, T>> {
  return define(`Record<string, ${value.name}>`, (input, path = "") => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return fail(path, `expected object, got ${describe(input)}`);
    }
    const out: Record<string, T> = {};
    for (const [key, raw] of Object.entries(input)) {
      const parsed = value.parse(raw, path ? `${path}.${key}` : key);
      if (!parsed.ok) return parsed;
      out[key] = parsed.value;
    }
    return ok(out);
  });
}

export type Shape = Record<string, Schema<unknown>>;

type OptionalKeys<S extends Shape> = {
  [K in keyof S]: S[K] extends OptionalSchema<unknown> ? K : never;
}[keyof S];

type RequiredKeys<S extends Shape> = Exclude<keyof S, OptionalKeys<S>>;

/**
 * Turns a shape into an object type where `optional()` members become genuinely
 * optional keys (`?:`) rather than `| undefined` — which is what
 * `exactOptionalPropertyTypes` wants, and what JSON actually does.
 */
export type ShapeOutput<S extends Shape> = Prettify<
  { [K in RequiredKeys<S>]: Infer<S[K]> } & { [K in OptionalKeys<S>]?: Exclude<Infer<S[K]>, undefined> }
>;

export function object<S extends Shape>(shape: S): Schema<ShapeOutput<S>> {
  const keys = Object.keys(shape);
  return define("object", (input, path = "") => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return fail(path, `expected object, got ${describe(input)}`);
    }
    const source = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      const member = shape[key];
      if (!member) continue;
      const child = path ? `${path}.${key}` : key;
      if (!(key in source) && isOptional(member)) continue;
      const parsed = member.parse(source[key], child);
      if (!parsed.ok) return parsed;
      // omit the key entirely when an optional member resolved to nothing
      if (parsed.value === undefined && isOptional(member)) continue;
      out[key] = parsed.value;
    }
    return ok(out as ShapeOutput<S>);
  });
}

/** A key that may be missing or explicitly null/undefined. */
export function optional<T>(inner: Schema<T>): OptionalSchema<T> {
  const schema = define<T | undefined>(`${inner.name}?`, (input, path = "") =>
    input === undefined || input === null ? ok(undefined) : inner.parse(input, path)
  );
  return Object.assign(schema, { [OPTIONAL]: true }) as OptionalSchema<T>;
}

/** Falls back instead of failing — for payloads we would rather degrade than reject. */
export function orElse<T>(inner: Schema<T>, fallback: T): Schema<T> {
  return define(inner.name, (input, path = "") => {
    const parsed = inner.parse(input, path);
    return parsed.ok ? parsed : ok(fallback);
  });
}

/** `orElse` with the fallback computed at parse time (timestamps, ids, …). */
export function orElseWith<T>(inner: Schema<T>, fallback: () => T): Schema<T> {
  return define(inner.name, (input, path = "") => {
    const parsed = inner.parse(input, path);
    return parsed.ok ? parsed : ok(fallback());
  });
}

/** Permits an explicit `null` alongside the inner type. */
export function nullable<T>(inner: Schema<T>): Schema<T | null> {
  return define(`${inner.name} | null`, (input, path = "") =>
    input === null || input === undefined ? ok(null) : inner.parse(input, path)
  );
}

type VariantOutput<K extends string, M extends Record<string, Shape>> = {
  [Tag in keyof M & string]: Prettify<{ [P in K]: Tag } & ShapeOutput<M[Tag]>>;
}[keyof M & string];

/**
 * A discriminated union keyed off one literal field — exactly the shape our
 * multi-action endpoints speak (`{ action: "generate" | "explain" | "script" }`).
 * Parsing narrows the payload; the return type narrows with it.
 */
export function variant<const K extends string, M extends Record<string, Shape>>(
  discriminant: K,
  members: M
): Schema<VariantOutput<K, M>> {
  const tags = Object.keys(members);
  return define(`${discriminant}: ${tags.join("|")}`, (input, path = "") => {
    if (typeof input !== "object" || input === null) {
      return fail(path, `expected object, got ${describe(input)}`);
    }
    const tag = (input as Record<string, unknown>)[discriminant];
    if (typeof tag !== "string" || !tags.includes(tag)) {
      return fail(
        path ? `${path}.${discriminant}` : discriminant,
        `expected one of ${tags.join("|")}, got ${describe(tag)}`
      );
    }
    const shape = members[tag];
    if (!shape) return fail(path, `unknown ${discriminant} ${tag}`);
    const parsed = object(shape).parse(input, path);
    if (!parsed.ok) return parsed;
    return ok({ ...parsed.value, [discriminant]: tag } as VariantOutput<K, M>);
  });
}

// ---------------------------------------------------------------------------
// Refinement — where a validated string becomes a *branded* one (see lib/brand)
// ---------------------------------------------------------------------------

export function refine<T, U extends T>(
  inner: Schema<T>,
  predicate: (value: T) => value is U,
  message: string
): Schema<U> {
  return define(inner.name, (input, path = "") => {
    const parsed = inner.parse(input, path);
    if (!parsed.ok) return parsed;
    return predicate(parsed.value) ? ok(parsed.value) : fail(path, message);
  });
}

/** Parse, then transform — the produced type is the transform's return type. */
export function transform<T, U>(inner: Schema<T>, f: (value: T) => U): Schema<U> {
  return define(inner.name, (input, path = "") => {
    const parsed = inner.parse(input, path);
    return parsed.ok ? ok(f(parsed.value)) : parsed;
  });
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

export function formatError(error: SchemaError): string {
  return `${error.path}: ${error.message}`;
}

function isOptional(schema: Schema<unknown>): boolean {
  return OPTIONAL in schema;
}

function describe(input: unknown): string {
  if (input === null) return "null";
  if (Array.isArray(input)) return "array";
  return typeof input;
}
