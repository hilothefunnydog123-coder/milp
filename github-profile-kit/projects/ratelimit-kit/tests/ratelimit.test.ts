import { describe, expect, it } from "vitest";

import { FixedWindowCounter, SlidingWindowLog, TokenBucket } from "../src/index";

const T0 = 1_700_000_000_000; // fixed base timestamp — limiters take `now` injected

describe("TokenBucket", () => {
  it("allows bursts up to capacity, then rejects", () => {
    const limiter = new TokenBucket(3, 1);
    expect(limiter.allow("k", T0)).toBe(true);
    expect(limiter.allow("k", T0)).toBe(true);
    expect(limiter.allow("k", T0)).toBe(true);
    expect(limiter.allow("k", T0)).toBe(false);
  });

  it("refills continuously over time", () => {
    const limiter = new TokenBucket(2, 1); // 1 token/sec
    limiter.allow("k", T0);
    limiter.allow("k", T0);
    expect(limiter.allow("k", T0 + 500)).toBe(false); // only 0.5 tokens back
    expect(limiter.allow("k", T0 + 1000)).toBe(true); // 1 full token back
  });

  it("never refills beyond capacity", () => {
    const limiter = new TokenBucket(2, 100);
    limiter.allow("k", T0);
    // a long idle period must not bank more than `capacity` tokens
    expect(limiter.allow("k", T0 + 60_000)).toBe(true);
    expect(limiter.allow("k", T0 + 60_000)).toBe(true);
    expect(limiter.allow("k", T0 + 60_000)).toBe(false);
  });

  it("tracks keys independently", () => {
    const limiter = new TokenBucket(1, 1);
    expect(limiter.allow("alice", T0)).toBe(true);
    expect(limiter.allow("bob", T0)).toBe(true);
    expect(limiter.allow("alice", T0)).toBe(false);
  });

  it("rejects invalid construction", () => {
    expect(() => new TokenBucket(0, 1)).toThrow(RangeError);
    expect(() => new TokenBucket(1, 0)).toThrow(RangeError);
  });
});

describe("SlidingWindowLog", () => {
  it("enforces the limit within a rolling window", () => {
    const limiter = new SlidingWindowLog(2, 1000);
    expect(limiter.allow("k", T0)).toBe(true);
    expect(limiter.allow("k", T0 + 100)).toBe(true);
    expect(limiter.allow("k", T0 + 200)).toBe(false);
  });

  it("frees capacity as old requests age out", () => {
    const limiter = new SlidingWindowLog(2, 1000);
    limiter.allow("k", T0);
    limiter.allow("k", T0 + 900);
    expect(limiter.allow("k", T0 + 950)).toBe(false);
    // the T0 request leaves the window at T0 + 1000
    expect(limiter.allow("k", T0 + 1000)).toBe(true);
  });

  it("is exact across window boundaries (no 2x burst)", () => {
    const limiter = new SlidingWindowLog(5, 1000);
    for (let i = 0; i < 5; i++) expect(limiter.allow("k", T0 + 990 + i)).toBe(true);
    // a fixed window would reset here; the sliding log must not
    expect(limiter.allow("k", T0 + 1001)).toBe(false);
  });
});

describe("FixedWindowCounter", () => {
  it("enforces the limit within one window", () => {
    const limiter = new FixedWindowCounter(2, 1000);
    const t = Math.floor(T0 / 1000) * 1000; // align to a window start
    expect(limiter.allow("k", t)).toBe(true);
    expect(limiter.allow("k", t + 1)).toBe(true);
    expect(limiter.allow("k", t + 2)).toBe(false);
  });

  it("resets when the window rolls over", () => {
    const limiter = new FixedWindowCounter(1, 1000);
    const t = Math.floor(T0 / 1000) * 1000;
    expect(limiter.allow("k", t)).toBe(true);
    expect(limiter.allow("k", t + 999)).toBe(false);
    expect(limiter.allow("k", t + 1000)).toBe(true);
  });
});
