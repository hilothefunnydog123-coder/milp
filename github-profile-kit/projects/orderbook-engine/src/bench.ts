/**
 * Throughput benchmark: a random storm of limit orders (which both rest and
 * match), plus periodic cancels — the realistic mixed workload.
 *
 * Run with: npm run bench
 */
import { OrderBook } from "./index.js";

const N = 1_000_000;

let state = 12345;
function rand(): number {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}

const book = new OrderBook();
const ids: string[] = [];

const start = process.hrtime.bigint();
for (let i = 0; i < N; i++) {
  const roll = rand();
  if (roll < 0.05 && ids.length > 0) {
    book.cancel(ids[Math.floor(rand() * ids.length)]!);
  } else {
    const side = roll < 0.525 ? "buy" : "sell";
    const price = 9_000 + Math.floor(rand() * 201); // 201 price levels
    const id = `b${i}`;
    book.limit(side, price, 1 + Math.floor(rand() * 100), id);
    if (ids.length < 10_000) ids.push(id);
  }
}
const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

const opsPerSec = Math.round((N / elapsedMs) * 1000);
console.log(`orders processed : ${N.toLocaleString()}`);
console.log(`elapsed          : ${elapsedMs.toFixed(0)} ms`);
console.log(`throughput       : ${opsPerSec.toLocaleString()} ops/sec`);
console.log(`resting orders   : ${book.openOrders.toLocaleString()}`);
console.log(`best bid/ask     : ${book.bestBid()} / ${book.bestAsk()}`);
