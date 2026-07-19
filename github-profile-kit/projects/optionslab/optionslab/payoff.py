"""Option strategy payoffs and terminal payoff diagrams (ASCII, no deps)."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Leg:
    kind: str      # "call" | "put" | "stock"
    strike: float  # ignored for stock
    qty: float     # negative = short


def leg_payoff(leg: Leg, terminal: np.ndarray) -> np.ndarray:
    if leg.kind == "call":
        return leg.qty * np.maximum(terminal - leg.strike, 0.0)
    if leg.kind == "put":
        return leg.qty * np.maximum(leg.strike - terminal, 0.0)
    if leg.kind == "stock":
        return leg.qty * terminal
    raise ValueError(f"unknown leg kind {leg.kind!r}")


def strategy_payoff(legs: list[Leg], terminal: np.ndarray) -> np.ndarray:
    return sum(leg_payoff(leg, terminal) for leg in legs)


# -- named strategies --------------------------------------------------------

def straddle(strike: float) -> list[Leg]:
    return [Leg("call", strike, 1), Leg("put", strike, 1)]


def strangle(put_strike: float, call_strike: float) -> list[Leg]:
    if put_strike >= call_strike:
        raise ValueError("strangle needs put_strike < call_strike")
    return [Leg("put", put_strike, 1), Leg("call", call_strike, 1)]


def bull_call_spread(low: float, high: float) -> list[Leg]:
    if low >= high:
        raise ValueError("bull call spread needs low < high")
    return [Leg("call", low, 1), Leg("call", high, -1)]


def butterfly(low: float, mid: float, high: float) -> list[Leg]:
    if not (low < mid < high):
        raise ValueError("butterfly needs low < mid < high")
    return [Leg("call", low, 1), Leg("call", mid, -2), Leg("call", high, 1)]


def covered_call(strike: float) -> list[Leg]:
    return [Leg("stock", 0.0, 1), Leg("call", strike, -1)]


STRATEGIES = {
    "straddle": (straddle, 1),
    "strangle": (strangle, 2),
    "bull-call-spread": (bull_call_spread, 2),
    "butterfly": (butterfly, 3),
    "covered-call": (covered_call, 1),
}


def ascii_diagram(legs: list[Leg], center: float, width_frac: float = 0.4,
                  rows: int = 15, cols: int = 64) -> str:
    """Terminal payoff diagram: price on x, P&L on y, '0' marks breakeven axis."""
    lo, hi = center * (1 - width_frac), center * (1 + width_frac)
    terminal = np.linspace(lo, hi, cols)
    pnl = strategy_payoff(legs, terminal)
    # always include zero in the range so the breakeven axis is drawable
    top, bottom = max(float(pnl.max()), 0.0), min(float(pnl.min()), 0.0)
    span = (top - bottom) or 1.0
    grid = [[" "] * cols for _ in range(rows)]
    zero_row = None
    if bottom <= 0 <= top:
        zero_row = rows - 1 - int(round((0 - bottom) / span * (rows - 1)))
        for c in range(cols):
            grid[zero_row][c] = "·"
    for c, value in enumerate(pnl):
        r = rows - 1 - int(round((value - bottom) / span * (rows - 1)))
        grid[r][c] = "█"
    lines = ["".join(row) for row in grid]
    label = f"{lo:,.0f}".ljust(cols - 14) + f"{hi:,.0f}".rjust(14)
    return "\n".join(lines) + "\n" + label
