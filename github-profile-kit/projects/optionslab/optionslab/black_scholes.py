"""Black–Scholes–Merton closed-form pricing, Greeks, and implied volatility.

Conventions (documented because sign errors are how options people die):
- ``rate`` and ``div`` are continuously-compounded annual rates
- ``tte`` is time to expiry in years
- ``vol`` is annualized; vega is per 1.00 of vol (divide by 100 for per-point)
- theta is per year (divide by 365 for per-day)
"""
from __future__ import annotations

from math import erf, exp, log, pi, sqrt


def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + erf(x / sqrt(2.0)))


def norm_pdf(x: float) -> float:
    return exp(-0.5 * x * x) / sqrt(2.0 * pi)


def _validate(spot: float, strike: float, vol: float, tte: float) -> None:
    if spot <= 0 or strike <= 0:
        raise ValueError("spot and strike must be positive")
    if vol < 0 or tte < 0:
        raise ValueError("vol and tte must be non-negative")


def _check_kind(kind: str) -> None:
    if kind not in ("call", "put"):
        raise ValueError(f"kind must be 'call' or 'put', got {kind!r}")


def d1_d2(spot: float, strike: float, rate: float, vol: float, tte: float,
          div: float = 0.0) -> tuple[float, float]:
    d1 = (log(spot / strike) + (rate - div + 0.5 * vol * vol) * tte) / (vol * sqrt(tte))
    return d1, d1 - vol * sqrt(tte)


def bs_price(kind: str, spot: float, strike: float, rate: float, vol: float,
             tte: float, div: float = 0.0) -> float:
    """European option price under Black–Scholes–Merton."""
    _check_kind(kind)
    _validate(spot, strike, vol, tte)
    if tte == 0 or vol == 0:
        # deterministic world: price is the discounted forward intrinsic
        forward = spot * exp((rate - div) * tte)
        intrinsic = max(forward - strike, 0.0) if kind == "call" else max(strike - forward, 0.0)
        return exp(-rate * tte) * intrinsic
    d1, d2 = d1_d2(spot, strike, rate, vol, tte, div)
    df_spot = spot * exp(-div * tte)
    df_strike = strike * exp(-rate * tte)
    if kind == "call":
        return df_spot * norm_cdf(d1) - df_strike * norm_cdf(d2)
    return df_strike * norm_cdf(-d2) - df_spot * norm_cdf(-d1)


def greeks(kind: str, spot: float, strike: float, rate: float, vol: float,
           tte: float, div: float = 0.0) -> dict:
    """Analytic delta, gamma, vega, theta, rho."""
    _check_kind(kind)
    _validate(spot, strike, vol, tte)
    if tte == 0 or vol == 0:
        raise ValueError("greeks need vol > 0 and tte > 0")
    d1, d2 = d1_d2(spot, strike, rate, vol, tte, div)
    disc_div = exp(-div * tte)
    disc_rate = exp(-rate * tte)
    pdf_d1 = norm_pdf(d1)

    gamma = disc_div * pdf_d1 / (spot * vol * sqrt(tte))
    vega = spot * disc_div * pdf_d1 * sqrt(tte)
    if kind == "call":
        delta = disc_div * norm_cdf(d1)
        theta = (-spot * disc_div * pdf_d1 * vol / (2 * sqrt(tte))
                 - rate * strike * disc_rate * norm_cdf(d2)
                 + div * spot * disc_div * norm_cdf(d1))
        rho = strike * tte * disc_rate * norm_cdf(d2)
    else:
        delta = -disc_div * norm_cdf(-d1)
        theta = (-spot * disc_div * pdf_d1 * vol / (2 * sqrt(tte))
                 + rate * strike * disc_rate * norm_cdf(-d2)
                 - div * spot * disc_div * norm_cdf(-d1))
        rho = -strike * tte * disc_rate * norm_cdf(-d2)
    return {"delta": delta, "gamma": gamma, "vega": vega, "theta": theta, "rho": rho}


def implied_vol(kind: str, price: float, spot: float, strike: float, rate: float,
                tte: float, div: float = 0.0, tol: float = 1e-9,
                max_iter: int = 200) -> float:
    """Invert Black–Scholes for volatility by bisection.

    Bisection over [1e-9, 5.0] is slower than Newton but cannot diverge, and
    monotonicity of price in vol makes it exact to ``tol``.
    """
    _check_kind(kind)
    _validate(spot, strike, 1.0, tte)
    if tte == 0:
        raise ValueError("implied vol undefined at expiry")
    lower_price = bs_price(kind, spot, strike, rate, 1e-9, tte, div)
    upper_price = bs_price(kind, spot, strike, rate, 5.0, tte, div)
    if not (lower_price - tol <= price <= upper_price + tol):
        raise ValueError(
            f"price {price:.6f} outside no-arbitrage range "
            f"[{lower_price:.6f}, {upper_price:.6f}]"
        )
    lo, hi = 1e-9, 5.0
    for _ in range(max_iter):
        mid = 0.5 * (lo + hi)
        if bs_price(kind, spot, strike, rate, mid, tte, div) < price:
            lo = mid
        else:
            hi = mid
        if hi - lo < tol:
            break
    return 0.5 * (lo + hi)
