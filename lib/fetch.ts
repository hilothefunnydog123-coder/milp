// ============================================================================
// One validated fetch, used by every network call in the app.
//
// `await res.json()` is typed `any`, which is how an unchecked payload gets to
// walk into a component wearing an interface it never earned. This wrapper
// makes that impossible: you hand it a schema, you get back a Result. The
// success branch is genuinely the declared type; the failure branch names what
// went wrong (offline, 502, HTML error page, right JSON but wrong shape) so
// callers can degrade deliberately instead of rendering `undefined`.
// ============================================================================

import { formatError, type Schema } from "./schema";
import { err, ok, type Result } from "./typed";

export type FetchFailureKind = "network" | "http" | "invalid-json" | "shape" | "aborted";

export interface FetchFailure {
  readonly kind: FetchFailureKind;
  readonly message: string;
  /** present when the server answered but not with success */
  readonly status?: number;
}

export type FetchResult<T> = Result<T, FetchFailure>;

export interface FetchOptions extends RequestInit {
  /** JSON body; serialized and given a Content-Type automatically, and it
   *  wins over any `body` passed alongside it */
  readonly json?: unknown;
  /** give up after this many milliseconds (default 20s) */
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

function timeoutSignal(ms: number): AbortSignal | undefined {
  // AbortSignal.timeout is everywhere we run, but never assume in a browser.
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}

/** Fetch, then prove the payload is what it claims to be. */
export async function fetchJson<T>(
  url: string,
  schema: Schema<T>,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const { json, timeoutMs = DEFAULT_TIMEOUT_MS, headers, signal, ...rest } = options;
  const init: RequestInit = { ...rest };
  const merged = new Headers(headers);
  if (json !== undefined) {
    merged.set("Content-Type", "application/json");
    init.body = JSON.stringify(json);
  }
  init.headers = merged;
  const deadline = signal ?? timeoutSignal(timeoutMs);
  if (deadline) init.signal = deadline;

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const aborted = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
    return err({ kind: aborted ? "aborted" : "network", message });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return response.ok
      ? err({ kind: "invalid-json", message: "response was not JSON", status: response.status })
      : err({ kind: "http", message: response.statusText || "request failed", status: response.status });
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && typeof (payload as { error?: unknown }).error === "string"
        ? String((payload as { error: string }).error)
        : response.statusText || "request failed";
    return err({ kind: "http", message: detail, status: response.status });
  }

  const parsed = schema.parse(payload);
  if (!parsed.ok) {
    return err({ kind: "shape", message: formatError(parsed.error), status: response.status });
  }
  return ok(parsed.value);
}

export function describeFailure(failure: FetchFailure): string {
  switch (failure.kind) {
    case "network":
      return "We couldn't reach the network. Check your connection and try again.";
    case "aborted":
      return "That took too long. Please try again.";
    case "http":
      return failure.message;
    case "invalid-json":
    case "shape":
      return "We got an unexpected answer back. Please try again.";
  }
}
