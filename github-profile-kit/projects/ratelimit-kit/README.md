# 🚦 ratelimit-kit

Three classic rate-limiting algorithms — **token bucket**, **sliding window log**, and **fixed window counter** — in one tiny, zero-dependency TypeScript library. Framework-agnostic, fully typed, and designed so every limiter is **deterministic in tests** (inject your own clock, no fake timers needed).

## 🚀 Quickstart

```bash
npm install github:hilothefunnydog123-coder/ratelimit-kit
```

```ts
import { TokenBucket } from "ratelimit-kit";

// 10-request burst, refilling at 2 requests/second
const limiter = new TokenBucket(10, 2);

app.use((req, res, next) => {
  if (!limiter.allow(req.ip)) {
    return res.status(429).send("Too Many Requests");
  }
  next();
});
```

Every limiter is keyed, so one instance handles all your users — pass an IP, user ID, or API key.

## 🧰 Pick your algorithm

| Class | Guarantees | Memory / key | Best for |
|---|---|---|---|
| `TokenBucket(capacity, refillPerSecond)` | Average rate with bursts up to `capacity` | O(1) | Public APIs — forgiving UX, strict average |
| `SlidingWindowLog(limit, windowMs)` | **Exact**: ≤ `limit` in *any* rolling window | O(limit) | Payments, auth attempts — when over-admitting is unacceptable |
| `FixedWindowCounter(limit, windowMs)` | ≤ `limit` per aligned window (up to 2× at boundaries) | O(1) | High-volume internal services — cheapest option |

All three implement one interface:

```ts
interface RateLimiter {
  allow(key?: string, now?: number): boolean;
}
```

## 🧪 Deterministic testing

Every `allow()` accepts an optional `now` timestamp, so time is a value you control — no `vi.useFakeTimers()`, no flaky sleeps:

```ts
const limiter = new TokenBucket(2, 1); // 1 token/sec
const t = 1_700_000_000_000;

limiter.allow("alice", t);        // true
limiter.allow("alice", t);        // true  (burst)
limiter.allow("alice", t + 500);  // false (only 0.5 tokens refilled)
limiter.allow("alice", t + 1000); // true  (1 full token back)
```

Run the suite:

```bash
npm install
npm test
```

The tests cover burst behaviour, continuous refill, refill capping, per-key isolation, rolling-window exactness, and the fixed-window boundary trade-off.

## 📄 License

MIT
