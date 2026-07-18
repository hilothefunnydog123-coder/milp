# 📊 orderbook-engine

A **limit order book with price-time priority matching** — the core data structure inside every exchange — in ~200 lines of strict TypeScript. Limit orders, market orders, partial fills, cancels, depth snapshots. **Zero dependencies**, 18 tests including randomized invariant checks, and **1,000,000+ orders/second** on a laptop-class core.

```
$ npm run bench
orders processed : 1,000,000
elapsed          : 1000 ms
throughput       : 1,000,218 ops/sec
resting orders   : 203,436
```

## 🚀 Quickstart

```bash
npm install github:hilothefunnydog123-coder/orderbook-engine
```

```ts
import { OrderBook } from "orderbook-engine";

const book = new OrderBook();

book.limit("sell", 101, 10, "alice");   // rests on the ask
book.limit("sell", 102, 5, "bob");
book.limit("buy", 99, 20, "carol");     // rests on the bid

book.bestBid();   // 99
book.bestAsk();   // 101
book.spread();    // 2

// a marketable buy sweeps the ask ladder, best price first
const trades = book.limit("buy", 102, 12, "dave");
// [ { price: 101, qty: 10, makerId: "alice", takerId: "dave", ... },
//   { price: 102, qty: 2,  makerId: "bob",   takerId: "dave", ... } ]

book.market("sell", 5);      // fills against carol at 99 (IOC — no resting)
book.cancel("bob");          // pull the rest of bob's order
book.depth(5);               // aggregated top-5 levels per side
```

## 🧠 The matching rules (a.k.a. market microstructure 101)

1. **Price priority** — an incoming order always fills against the best opposing price first: highest bid for sells, lowest ask for buys.
2. **Time priority** — within one price level, resting orders fill strictly first-in-first-out.
3. **Maker pricing** — trades execute at the *resting* order's limit price. The aggressor crossing the spread pays it; price improvement goes to the taker.
4. **Partial fills** — whatever an incoming limit order can't fill immediately rests on the book at its limit price. Market orders instead discard the remainder (immediate-or-cancel).

These four rules are the honest core of how Nasdaq, NYSE Arca and every crypto exchange sequence their markets.

## 🏗️ Design

- **Price levels as FIFO queues** in a `Map<price, Order[]>`, plus a sorted price ladder per side maintained with binary-search insertion — O(log L) order placement in the number of price levels, O(1) best-quote lookup.
- **An id index** (`Map<id, Order>`) makes cancels O(level size) with no book scan.
- **Deterministic sequence numbers** on every order and trade, so an event log can fully reconstruct the book — the property real matching engines are built around.

## ✅ Tests

```bash
npm install && npm test
```

Beyond the unit cases (priority, partial fills, IOC, cancels, validation), two randomized invariant tests hammer the book with thousands of orders and assert that it **never crosses itself** (best bid < best ask, always) and that **quantity is conserved** — every share submitted is either filled, resting, or explicitly discarded. If a matching bug exists, those two invariants are how you catch it.

## 📄 License

MIT — fork it, break it, race it.
