"""Signal functions: price history in, target portfolio weight [0, 1] out.

Semantics match the quantsim backtesting engine
(github.com/hilothefunnydog123-coder/quantsim), so a strategy you backtest
there behaves identically when papertrader runs it live.
"""
from __future__ import annotations

from typing import Callable


def sma_weight(closes: list[float], fast: int = 20, slow: int = 100) -> float:
    """Long when the fast SMA is above the slow SMA, else flat."""
    if len(closes) < slow:
        raise ValueError(f"need {slow} bars for sma({fast}/{slow}), got {len(closes)}")
    fast_ma = sum(closes[-fast:]) / fast
    slow_ma = sum(closes[-slow:]) / slow
    return 1.0 if fast_ma > slow_ma else 0.0


def momentum_weight(closes: list[float], lookback: int = 126) -> float:
    """Long when the trailing return over ``lookback`` bars is positive."""
    if len(closes) < lookback + 1:
        raise ValueError(f"need {lookback + 1} bars for momentum, got {len(closes)}")
    return 1.0 if closes[-1] > closes[-lookback - 1] else 0.0


def make_signal(name: str, **params) -> Callable[[list[float]], float]:
    registry = {"sma": sma_weight, "momentum": momentum_weight}
    if name not in registry:
        raise ValueError(f"unknown strategy {name!r} — choose from {sorted(registry)}")
    fn = registry[name]
    return lambda closes: fn(closes, **params)
