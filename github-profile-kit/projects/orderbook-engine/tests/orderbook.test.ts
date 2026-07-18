import { describe, expect, it } from "vitest";

import { OrderBook } from "../src/index";

describe("resting and quoting", () => {
  it("tracks best bid/ask, spread and midpoint", () => {
    const book = new OrderBook();
    book.limit("buy", 99, 10);
    book.limit("buy", 98, 5);
    book.limit("sell", 101, 7);
    book.limit("sell", 102, 3);
    expect(book.bestBid()).toBe(99);
    expect(book.bestAsk()).toBe(101);
    expect(book.spread()).toBe(2);
    expect(book.midpoint()).toBe(100);
    expect(book.openOrders).toBe(4);
  });

  it("returns an empty book's quotes as null", () => {
    const book = new OrderBook();
    expect(book.bestBid()).toBeNull();
    expect(book.bestAsk()).toBeNull();
    expect(book.spread()).toBeNull();
  });

  it("aggregates depth per price level, best first", () => {
    const book = new OrderBook();
    book.limit("buy", 99, 10);
    book.limit("buy", 99, 15);
    book.limit("buy", 98, 20);
    book.limit("sell", 101, 5);
    const depth = book.depth(2);
    expect(depth.bids).toEqual([
      { price: 99, qty: 25, orders: 2 },
      { price: 98, qty: 20, orders: 1 },
    ]);
    expect(depth.asks).toEqual([{ price: 101, qty: 5, orders: 1 }]);
  });
});

describe("matching", () => {
  it("executes at the maker's price", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 10, "maker");
    const trades = book.limit("buy", 105, 10, "taker");
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({ price: 101, qty: 10, makerId: "maker", takerId: "taker" });
    expect(book.openOrders).toBe(0);
  });

  it("respects price priority: better-priced makers fill first", () => {
    const book = new OrderBook();
    book.limit("sell", 102, 5, "worse");
    book.limit("sell", 101, 5, "better");
    const trades = book.limit("buy", 102, 10);
    expect(trades.map((t) => t.makerId)).toEqual(["better", "worse"]);
    expect(trades.map((t) => t.price)).toEqual([101, 102]);
  });

  it("respects time priority within a level (FIFO)", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 5, "first");
    book.limit("sell", 101, 5, "second");
    const trades = book.limit("buy", 101, 7);
    expect(trades.map((t) => t.makerId)).toEqual(["first", "second"]);
    expect(trades.map((t) => t.qty)).toEqual([5, 2]);
  });

  it("partially fills and rests the remainder", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 4, "maker");
    const trades = book.limit("buy", 101, 10, "taker");
    expect(trades).toHaveLength(1);
    expect(trades[0]!.qty).toBe(4);
    // remaining 6 rests as the new best bid
    expect(book.bestBid()).toBe(101);
    expect(book.depth(1).bids[0]).toMatchObject({ qty: 6, orders: 1 });
  });

  it("does not match non-crossing limits", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 10);
    const trades = book.limit("buy", 100, 10);
    expect(trades).toHaveLength(0);
    expect(book.bestBid()).toBe(100);
    expect(book.bestAsk()).toBe(101);
  });

  it("a marketable sell walks the bid ladder downward", () => {
    const book = new OrderBook();
    book.limit("buy", 100, 5, "b100");
    book.limit("buy", 99, 5, "b99");
    const trades = book.limit("sell", 99, 8);
    expect(trades.map((t) => t.price)).toEqual([100, 99]);
    expect(trades.map((t) => t.qty)).toEqual([5, 3]);
  });
});

describe("market orders", () => {
  it("fills at the best available prices", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 5);
    book.limit("sell", 103, 5);
    const trades = book.market("buy", 8);
    expect(trades.map((t) => t.price)).toEqual([101, 103]);
    expect(trades.map((t) => t.qty)).toEqual([5, 3]);
  });

  it("discards unfilled remainder instead of resting (IOC)", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 5);
    const trades = book.market("buy", 50);
    expect(trades.reduce((q, t) => q + t.qty, 0)).toBe(5);
    expect(book.bestBid()).toBeNull(); // nothing rested
    expect(book.openOrders).toBe(0);
  });
});

describe("cancellation", () => {
  it("cancels a resting order and cleans up empty levels", () => {
    const book = new OrderBook();
    book.limit("buy", 99, 10, "a");
    book.limit("buy", 99, 5, "b");
    expect(book.cancel("a")).toBe(true);
    expect(book.depth(1).bids[0]).toMatchObject({ price: 99, qty: 5, orders: 1 });
    expect(book.cancel("b")).toBe(true);
    expect(book.bestBid()).toBeNull();
  });

  it("returns false for unknown or already-filled orders", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 5, "maker");
    book.market("buy", 5);
    expect(book.cancel("maker")).toBe(false);
    expect(book.cancel("ghost")).toBe(false);
  });

  it("cancelled orders never trade", () => {
    const book = new OrderBook();
    book.limit("sell", 101, 5, "gone");
    book.limit("sell", 101, 5, "stays");
    book.cancel("gone");
    const trades = book.limit("buy", 101, 5);
    expect(trades.map((t) => t.makerId)).toEqual(["stays"]);
  });
});

describe("validation and invariants", () => {
  it("rejects non-positive prices and quantities", () => {
    const book = new OrderBook();
    expect(() => book.limit("buy", 0, 1)).toThrow(RangeError);
    expect(() => book.limit("buy", 100, -1)).toThrow(RangeError);
    expect(() => book.market("sell", 0)).toThrow(RangeError);
  });

  it("rejects duplicate order ids", () => {
    const book = new OrderBook();
    book.limit("buy", 99, 1, "dup");
    expect(() => book.limit("buy", 98, 1, "dup")).toThrow(/duplicate/);
  });

  it("book never crosses itself after a random storm of orders", () => {
    const book = new OrderBook();
    let state = 42;
    const rand = () => {
      // deterministic LCG so the test is reproducible
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    for (let i = 0; i < 5_000; i++) {
      const side = rand() < 0.5 ? "buy" : "sell";
      const price = 90 + Math.floor(rand() * 21);
      book.limit(side, price, 1 + Math.floor(rand() * 10));
      const bid = book.bestBid();
      const ask = book.bestAsk();
      if (bid !== null && ask !== null) expect(bid).toBeLessThan(ask);
    }
  });

  it("conserves quantity: fills + resting + IOC-discard = submitted", () => {
    const book = new OrderBook();
    let submitted = 0;
    let filled = 0;
    let state = 7;
    const rand = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    for (let i = 0; i < 2_000; i++) {
      const qty = 1 + Math.floor(rand() * 5);
      submitted += qty;
      const trades = book.limit(rand() < 0.5 ? "buy" : "sell", 95 + Math.floor(rand() * 11), qty);
      filled += 2 * trades.reduce((q, t) => q + t.qty, 0); // each trade consumes maker+taker qty
    }
    const resting =
      book.depth(1_000).bids.reduce((q, l) => q + l.qty, 0) +
      book.depth(1_000).asks.reduce((q, l) => q + l.qty, 0);
    expect(filled + resting).toBe(submitted);
  });
});
