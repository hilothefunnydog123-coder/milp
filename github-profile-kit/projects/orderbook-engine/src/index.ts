/**
 * orderbook-engine — a limit order book with price-time priority matching.
 *
 * The core data structure behind every exchange: resting limit orders queue
 * FIFO at each price level; incoming orders match against the best opposing
 * price first, then by arrival order within a level. Trades always execute at
 * the resting (maker) order's price.
 */

export type Side = "buy" | "sell";

export interface Order {
  readonly id: string;
  readonly side: Side;
  readonly price: number;
  /** Remaining (unfilled) quantity. Decreases as the order is filled. */
  qty: number;
  /** Global arrival sequence — the "time" in price-time priority. */
  readonly seq: number;
}

export interface Trade {
  readonly price: number; // execution price = maker's limit price
  readonly qty: number;
  readonly makerId: string;
  readonly takerId: string;
  readonly takerSide: Side;
  readonly seq: number;
}

export interface BookLevel {
  readonly price: number;
  readonly qty: number;
  readonly orders: number;
}

export interface Depth {
  readonly bids: BookLevel[]; // best (highest) first
  readonly asks: BookLevel[]; // best (lowest) first
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number, got ${value}`);
  }
}

/** Binary search over a sorted array; `desc` for bid ladders. */
function insertSorted(prices: number[], price: number, desc: boolean): void {
  let lo = 0;
  let hi = prices.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const cmp = desc ? prices[mid]! > price : prices[mid]! < price;
    if (cmp) lo = mid + 1;
    else hi = mid;
  }
  prices.splice(lo, 0, price);
}

export class OrderBook {
  private readonly bidLevels = new Map<number, Order[]>();
  private readonly askLevels = new Map<number, Order[]>();
  private readonly bidPrices: number[] = []; // sorted high -> low
  private readonly askPrices: number[] = []; // sorted low -> high
  private readonly byId = new Map<string, Order>();
  private seq = 0;
  private autoId = 0;

  /** Number of resting orders currently on the book. */
  get openOrders(): number {
    return this.byId.size;
  }

  /**
   * Submit a limit order. Matches immediately against any crossing resting
   * orders (price-time priority); any remainder rests on the book.
   * Returns the trades this order generated as taker.
   */
  limit(side: Side, price: number, qty: number, id?: string): Trade[] {
    assertPositiveFinite(price, "price");
    assertPositiveFinite(qty, "qty");
    const orderId = id ?? `o${++this.autoId}`;
    if (this.byId.has(orderId)) throw new Error(`duplicate order id ${orderId}`);

    const order: Order = { id: orderId, side, price, qty, seq: ++this.seq };
    const trades = this.match(order, price);
    if (order.qty > 0) this.rest(order);
    return trades;
  }

  /**
   * Submit a market order: fills against the book at any price, best first.
   * Any quantity the book cannot fill is discarded (immediate-or-cancel).
   */
  market(side: Side, qty: number, id?: string): Trade[] {
    assertPositiveFinite(qty, "qty");
    const orderId = id ?? `o${++this.autoId}`;
    if (this.byId.has(orderId)) throw new Error(`duplicate order id ${orderId}`);
    const order: Order = { id: orderId, side, price: NaN, qty, seq: ++this.seq };
    return this.match(order, side === "buy" ? Infinity : 0);
  }

  /** Cancel a resting order by id. Returns false if it is not on the book. */
  cancel(id: string): boolean {
    const order = this.byId.get(id);
    if (!order) return false;
    const { levels, prices } = this.bookFor(order.side);
    const queue = levels.get(order.price)!;
    queue.splice(queue.indexOf(order), 1);
    if (queue.length === 0) {
      levels.delete(order.price);
      prices.splice(prices.indexOf(order.price), 1);
    }
    this.byId.delete(id);
    return true;
  }

  bestBid(): number | null {
    return this.bidPrices.length ? this.bidPrices[0]! : null;
  }

  bestAsk(): number | null {
    return this.askPrices.length ? this.askPrices[0]! : null;
  }

  spread(): number | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    return bid !== null && ask !== null ? ask - bid : null;
  }

  midpoint(): number | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    return bid !== null && ask !== null ? (bid + ask) / 2 : null;
  }

  /** Aggregated book snapshot, best `levels` price levels per side. */
  depth(levels = 10): Depth {
    const summarize = (prices: number[], book: Map<number, Order[]>): BookLevel[] =>
      prices.slice(0, levels).map((price) => {
        const queue = book.get(price)!;
        return {
          price,
          qty: queue.reduce((total, o) => total + o.qty, 0),
          orders: queue.length,
        };
      });
    return {
      bids: summarize(this.bidPrices, this.bidLevels),
      asks: summarize(this.askPrices, this.askLevels),
    };
  }

  // -------------------------------------------------------------------------

  private bookFor(side: Side): { levels: Map<number, Order[]>; prices: number[] } {
    return side === "buy"
      ? { levels: this.bidLevels, prices: this.bidPrices }
      : { levels: this.askLevels, prices: this.askPrices };
  }

  /** Match `taker` against the opposing side while it crosses `limitPrice`. */
  private match(taker: Order, limitPrice: number): Trade[] {
    const trades: Trade[] = [];
    const opposing = this.bookFor(taker.side === "buy" ? "sell" : "buy");

    while (taker.qty > 0 && opposing.prices.length > 0) {
      const bestPrice = opposing.prices[0]!;
      const crosses =
        taker.side === "buy" ? bestPrice <= limitPrice : bestPrice >= limitPrice;
      if (!crosses) break;

      const queue = opposing.levels.get(bestPrice)!;
      while (taker.qty > 0 && queue.length > 0) {
        const maker = queue[0]!;
        const fillQty = Math.min(taker.qty, maker.qty);
        maker.qty -= fillQty;
        taker.qty -= fillQty;
        trades.push({
          price: bestPrice,
          qty: fillQty,
          makerId: maker.id,
          takerId: taker.id,
          takerSide: taker.side,
          seq: ++this.seq,
        });
        if (maker.qty === 0) {
          queue.shift();
          this.byId.delete(maker.id);
        }
      }
      if (queue.length === 0) {
        opposing.levels.delete(bestPrice);
        opposing.prices.shift();
      }
    }
    return trades;
  }

  private rest(order: Order): void {
    const { levels, prices } = this.bookFor(order.side);
    const queue = levels.get(order.price);
    if (queue) {
      queue.push(order);
    } else {
      levels.set(order.price, [order]);
      insertSorted(prices, order.price, order.side === "buy");
    }
    this.byId.set(order.id, order);
  }
}
