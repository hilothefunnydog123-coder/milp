import type { NextRequest } from "next/server";

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

interface Opts {
  limit: number;
  windowMs: number;
  tag: string;
}

export function rateLimit(
  req: NextRequest,
  { limit, windowMs, tag }: Opts
): { ok: boolean; retryAfter: number } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  const key = `${tag}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
