// ============================================================================
// The type toolbox every other module builds on.
//
// Nothing here emits runtime work beyond a handful of tiny helpers — it exists
// so the compiler can carry guarantees that used to live only in our heads:
// "this JSON was checked", "this switch covers every case", "this array isn't
// empty", "this string is a resource key, not just any string".
// ============================================================================

/** Flattens an intersection into a single object literal so hovers stay readable. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** An array the compiler knows has at least one element. */
export type NonEmptyArray<T> = readonly [T, ...T[]];

export function isNonEmpty<T>(xs: readonly T[]): xs is NonEmptyArray<T> {
  return xs.length > 0;
}

/** Narrows a list we know is non-empty, checking rather than asserting. */
export function asNonEmpty<T>(xs: readonly T[], context = "list"): NonEmptyArray<T> {
  if (!isNonEmpty(xs)) throw new Error(`expected a non-empty ${context}`);
  return xs;
}

/**
 * Compile-time exhaustiveness guard. Add a member to a union and every switch
 * that forgot to handle it stops compiling, right here.
 */
export function assertNever(value: never, context = "value"): never {
  throw new Error(`Unhandled ${context}: ${JSON.stringify(value)}`);
}

// ---------------------------------------------------------------------------
// Result — an explicit success/failure union, so failure can't be ignored by
// accident the way a thrown error or a silently-`any` response can.
// ---------------------------------------------------------------------------

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Type-level assertions — used by lib/type-tests.ts, which has no runtime body
// at all: `tsc` failing IS the test failing.
// ---------------------------------------------------------------------------

/** True only when A and B are the *same* type, not merely mutually assignable. */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type Expect<T extends true> = T;
export type ExpectNot<T extends false> = T;
