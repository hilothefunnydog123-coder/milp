/**
 * ratelimit-kit — three classic rate-limiting algorithms, zero dependencies.
 *
 * Every limiter accepts an optional `now` timestamp (ms) so behaviour is fully
 * deterministic in tests — no fake timers required.
 */

export interface RateLimiter {
  /** Returns true if the request identified by `key` is allowed right now. */
  allow(key?: string, now?: number): boolean;
}

/**
 * Token bucket: capacity `capacity`, refilled continuously at
 * `refillPerSecond` tokens/sec. Allows short bursts up to the bucket size
 * while enforcing the average rate — the classic choice for APIs.
 */
export class TokenBucket implements RateLimiter {
  private buckets = new Map<string, { tokens: number; last: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    if (capacity <= 0) throw new RangeError("capacity must be > 0");
    if (refillPerSecond <= 0) throw new RangeError("refillPerSecond must be > 0");
  }

  allow(key = "global", now = Date.now()): boolean {
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, last: now };
    const elapsedSec = Math.max(0, now - bucket.last) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSecond);
    bucket.last = now;

    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return allowed;
  }
}

/**
 * Sliding window log: allows at most `limit` requests in any rolling
 * `windowMs` window. Exact — never over-admits — at the cost of storing one
 * timestamp per admitted request.
 */
export class SlidingWindowLog implements RateLimiter {
  private logs = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    if (limit <= 0) throw new RangeError("limit must be > 0");
    if (windowMs <= 0) throw new RangeError("windowMs must be > 0");
  }

  allow(key = "global", now = Date.now()): boolean {
    const log = (this.logs.get(key) ?? []).filter((t) => now - t < this.windowMs);
    const allowed = log.length < this.limit;
    if (allowed) log.push(now);
    this.logs.set(key, log);
    return allowed;
  }
}

/**
 * Fixed window counter: allows at most `limit` requests per aligned
 * `windowMs` window. O(1) memory per key and the cheapest to run, but
 * permits up to 2× the limit across a window boundary — the classic
 * trade-off.
 */
export class FixedWindowCounter implements RateLimiter {
  private windows = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    if (limit <= 0) throw new RangeError("limit must be > 0");
    if (windowMs <= 0) throw new RangeError("windowMs must be > 0");
  }

  allow(key = "global", now = Date.now()): boolean {
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    let window = this.windows.get(key);
    if (!window || window.windowStart !== windowStart) {
      window = { windowStart, count: 0 };
    }

    const allowed = window.count < this.limit;
    if (allowed) window.count += 1;
    this.windows.set(key, window);
    return allowed;
  }
}
