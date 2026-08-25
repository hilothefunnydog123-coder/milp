// ============================================================================
// The share link — a whole path, encoded into a URL fragment.
//
// Someone can hand their plan to an advocate without an account, a login or a
// server round-trip: the path travels base64'd in the `#` of the URL, which
// never leaves the browser it's opened in. That also makes it the least
// trustworthy input in the app — anyone can type anything after the `#` — so
// decoding runs the payload through `compassPathSchema` and returns a Result.
// A tampered or truncated link produces "this shared link looks incomplete",
// never a half-built path rendered as though it were real.
// ============================================================================

import { compassPathSchema, type CompassPath } from "./types";
import { routes } from "./routes";
import { formatError } from "./schema";
import { err, ok, type Result } from "./typed";

export function encodePath(path: CompassPath): string {
  return btoa(encodeURIComponent(JSON.stringify(path)));
}

export function shareUrl(origin: string, path: CompassPath): string {
  return `${origin}${routes.share(encodePath(path))}`;
}

export function decodePath(fragment: string): Result<CompassPath, string> {
  const trimmed = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!trimmed) return err("no path in this link");
  let json: string;
  try {
    json = decodeURIComponent(atob(trimmed));
  } catch {
    return err("this link is not readable");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(json);
  } catch {
    return err("this link is incomplete");
  }
  const parsed = compassPathSchema.parse(decoded);
  return parsed.ok ? ok(parsed.value) : err(formatError(parsed.error));
}
