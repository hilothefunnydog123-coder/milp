// ============================================================================
// Route-handler plumbing, so every endpoint parses its input the same way.
//
// A route used to open with `const body = await req.json()` — one line that
// hands you `any` and leaves each handler to re-invent its own clamping and
// defaulting. Here the body is parsed against that endpoint's contract schema,
// which means handlers receive an already-narrowed discriminated union and can
// `switch` on it exhaustively; the compiler then insists every action is
// handled, and that each one replies with the shape the contract promised.
// ============================================================================

import { NextResponse } from "next/server";
import { formatError, type SchemaError } from "./schema";
import { err, ok, type Result } from "./typed";
import { API, type ApiErrorBody, type ApiPath, type RequestOf } from "./api";

export type ParsedBody<P extends ApiPath> = Result<RequestOf<P>, SchemaError>;

/**
 * Reads and validates a request body against its endpoint's contract.
 * `normalize` exists for wire-compat shims (e.g. an older client that posts a
 * call without naming the action).
 */
export async function parseBody<P extends ApiPath>(
  path: P,
  request: Request,
  normalize: (body: unknown) => unknown = (body) => body
): Promise<ParsedBody<P>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return err({ path: "(body)", message: "expected a JSON body" });
  }
  const parsed = API[path].request.parse(normalize(raw));
  return parsed.ok ? ok(parsed.value as RequestOf<P>) : err(parsed.error);
}

/** 400 with the contract's own explanation of what was wrong. */
export function badRequest(detail: SchemaError | string): NextResponse<ApiErrorBody> {
  const message = typeof detail === "string" ? detail : formatError(detail);
  return NextResponse.json<ApiErrorBody>({ error: message }, { status: 400 });
}
