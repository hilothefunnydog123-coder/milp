"""Monte Carlo pricing under risk-neutral GBM, with antithetic variates.

Returns (price, standard_error) — a Monte Carlo estimate without its error
bar is a random number wearing a suit.
"""
from __future__ import annotations

from math import exp, sqrt

import numpy as np


def mc_price(kind: str, spot: float, strike: float, rate: float, vol: float,
             tte: float, n_paths: int = 200_000, seed: int | None = None,
             antithetic: bool = True, div: float = 0.0) -> tuple[float, float]:
    if kind not in ("call", "put"):
        raise ValueError(f"kind must be 'call' or 'put', got {kind!r}")
    if spot <= 0 or strike <= 0 or vol < 0 or tte < 0 or n_paths < 2:
        raise ValueError("invalid inputs")
    if tte == 0 or vol == 0:
        forward = spot * exp((rate - div) * tte)
        intrinsic = max(forward - strike, 0.0) if kind == "call" else max(strike - forward, 0.0)
        return exp(-rate * tte) * intrinsic, 0.0

    rng = np.random.default_rng(seed)
    half = n_paths // 2
    z = rng.standard_normal(half)
    if antithetic:
        z = np.concatenate([z, -z])  # variance reduction: pair each path with its mirror
    else:
        z = np.concatenate([z, rng.standard_normal(n_paths - half)])

    terminal = spot * np.exp((rate - div - 0.5 * vol * vol) * tte + vol * sqrt(tte) * z)
    sign = 1.0 if kind == "call" else -1.0
    payoffs = np.maximum(sign * (terminal - strike), 0.0)

    disc = exp(-rate * tte)
    if antithetic:
        # antithetic pairs are dependent: average within pairs first, then
        # compute the error bar over the independent pair means
        pair_means = 0.5 * (payoffs[:half] + payoffs[half:])
        price = disc * float(pair_means.mean())
        stderr = disc * float(pair_means.std(ddof=1) / sqrt(half))
    else:
        price = disc * float(payoffs.mean())
        stderr = disc * float(payoffs.std(ddof=1) / sqrt(len(payoffs)))
    return price, stderr
