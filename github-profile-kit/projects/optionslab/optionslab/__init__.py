"""optionslab — three option pricing engines that cross-validate each other."""
from optionslab.binomial import binomial_price
from optionslab.black_scholes import bs_price, d1_d2, greeks, implied_vol
from optionslab.montecarlo import mc_price
from optionslab.payoff import (
    STRATEGIES,
    Leg,
    ascii_diagram,
    bull_call_spread,
    butterfly,
    covered_call,
    straddle,
    strangle,
    strategy_payoff,
)

__version__ = "0.1.0"
__all__ = [
    "bs_price", "greeks", "implied_vol", "d1_d2",
    "binomial_price", "mc_price",
    "Leg", "strategy_payoff", "ascii_diagram", "STRATEGIES",
    "straddle", "strangle", "bull_call_spread", "butterfly", "covered_call",
    "__version__",
]
