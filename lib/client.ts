// ============================================================================
// The typed client for our own API.
//
// `post("/api/compass", { action: "script", … })` returns `{ script: string }`.
// Change that action to `"generate"` and the same call site now returns
// `{ path: CompassPath; live: boolean }` — the response type is computed from
// the request value by the contract in lib/api.ts, not asserted by hand.
//
// Three things become impossible from here: calling a path that doesn't exist,
// sending a body that endpoint doesn't accept, and reading a field off a
// response that isn't in it.
// ============================================================================

import {
  API,
  responseSchemaFor,
  type ApiPath,
  type GetEndpoint,
  type RequestOf,
  type ResponseFor,
} from "./api";
import { fetchJson, type FetchFailure, type FetchResult } from "./fetch";
import type { Schema } from "./schema";

/** POST to one of our endpoints, with the reply narrowed to this request. */
export async function post<P extends ApiPath, R extends RequestOf<P>>(
  path: P,
  body: R,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<FetchResult<ResponseFor<P, R>>> {
  // The one cast in the stack: `responseSchemaFor` looks the schema up by the
  // same action the type-level `ResponseFor` uses, so the two agree by
  // construction — but only the registry, not the compiler, can see that.
  const schema = responseSchemaFor(path, body) as Schema<ResponseFor<P, R>>;
  return fetchJson(path, schema, {
    method: "POST",
    json: body,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

/** GET a described endpoint; the schema and the reply type ride along with it. */
export async function get<T>(
  endpoint: GetEndpoint<T>,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<FetchResult<T>> {
  return fetchJson(endpoint.url, endpoint.schema, {
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

/**
 * Fire-and-forget telemetry (a tally bump, a "this helped" tap, hanging up a
 * call we're already done with). Failure is genuinely fine here — but it's
 * declared fine, rather than swallowed by an empty `.catch(() => {})`.
 */
export function signal<P extends ApiPath, R extends RequestOf<P>>(path: P, body: R): void {
  void post(path, body).catch(() => undefined);
}

export type { FetchFailure, FetchResult };
export { API };
