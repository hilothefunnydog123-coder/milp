"""One trading cycle: data -> signal -> target position -> rebalance order."""
from __future__ import annotations

import datetime as dt
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

from papertrader.broker import PaperBroker


@dataclass
class CycleResult:
    ts: str
    symbol: str
    price: float
    weight: float
    current_qty: float
    target_qty: int
    order_qty: float
    equity: float


def run_cycle(
    broker,
    closes: list[float],
    symbol: str,
    signal: Callable[[list[float]], float],
    state_dir: str | Path = "state",
) -> CycleResult:
    """Compute the target position and place one rebalancing order.

    Idempotent by design: run it twice on the same data and the second run
    places no order, because the position already matches the target. That is
    what makes it safe to run from an unattended scheduler.
    """
    price = float(closes[-1])
    if isinstance(broker, PaperBroker):
        broker.mark(symbol, price)

    weight = max(0.0, min(1.0, float(signal(closes))))
    equity = broker.equity()
    target_qty = math.floor(equity * weight / price)
    current_qty = broker.position(symbol)
    order_qty = target_qty - current_qty

    if order_qty != 0:
        broker.submit(symbol, order_qty, price)

    result = CycleResult(
        ts=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        symbol=symbol,
        price=price,
        weight=weight,
        current_qty=current_qty,
        target_qty=target_qty,
        order_qty=order_qty,
        equity=broker.equity(),
    )
    history = Path(state_dir) / "history.jsonl"
    history.parent.mkdir(parents=True, exist_ok=True)
    with history.open("a") as f:
        f.write(json.dumps(asdict(result)) + "\n")
    return result


def load_history(state_dir: str | Path = "state") -> list[dict]:
    history = Path(state_dir) / "history.jsonl"
    if not history.exists():
        return []
    return [json.loads(line) for line in history.read_text().splitlines() if line.strip()]
