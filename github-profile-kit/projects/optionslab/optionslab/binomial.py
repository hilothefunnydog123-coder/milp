"""Cox–Ross–Rubinstein binomial trees: European and American options.

The tree is the workhorse for American exercise, where no closed form
exists: at every node the holder takes max(continuation, exercise).
"""
from __future__ import annotations

from math import exp, sqrt

import numpy as np


def binomial_price(kind: str, spot: float, strike: float, rate: float, vol: float,
                   tte: float, steps: int = 800, american: bool = False,
                   div: float = 0.0) -> float:
    if kind not in ("call", "put"):
        raise ValueError(f"kind must be 'call' or 'put', got {kind!r}")
    if spot <= 0 or strike <= 0 or vol < 0 or tte < 0 or steps < 1:
        raise ValueError("invalid inputs")
    if tte == 0 or vol == 0:
        forward = spot * exp((rate - div) * tte)
        intrinsic = max(forward - strike, 0.0) if kind == "call" else max(strike - forward, 0.0)
        european = exp(-rate * tte) * intrinsic
        if american:
            spot_intrinsic = max(spot - strike, 0.0) if kind == "call" else max(strike - spot, 0.0)
            return max(european, spot_intrinsic)
        return european

    dt = tte / steps
    up = exp(vol * sqrt(dt))
    down = 1.0 / up
    disc = exp(-rate * dt)
    p_up = (exp((rate - div) * dt) - down) / (up - down)
    if not 0.0 < p_up < 1.0:
        raise ValueError("risk-neutral probability outside (0,1) — reduce dt or check inputs")

    # terminal asset prices S * u^j * d^(steps-j), j = 0..steps
    j = np.arange(steps + 1)
    prices = spot * up**j * down ** (steps - j)
    sign = 1.0 if kind == "call" else -1.0
    values = np.maximum(sign * (prices - strike), 0.0)

    for _ in range(steps):
        values = disc * (p_up * values[1:] + (1.0 - p_up) * values[:-1])
        prices = prices[:-1] * up  # asset prices one layer back
        if american:
            values = np.maximum(values, np.maximum(sign * (prices - strike), 0.0))
    return float(values[0])
