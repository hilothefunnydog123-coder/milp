"""The point of this suite: three INDEPENDENT pricing methods must agree.

Black–Scholes is closed-form analysis, the binomial tree is a discrete
lattice, Monte Carlo is stochastic simulation. They share no code beyond
arithmetic — if all three produce the same number, the number is right.
"""
import numpy as np
import pytest

from optionslab import binomial_price, bs_price, greeks, implied_vol, mc_price

GRID = [
    # (kind, spot, strike, rate, vol, tte)
    ("call", 100, 100, 0.05, 0.20, 1.00),
    ("put", 100, 100, 0.05, 0.20, 1.00),
    ("call", 100, 80, 0.03, 0.35, 0.50),   # deep ITM, high vol
    ("put", 100, 130, 0.03, 0.35, 0.50),   # deep ITM put
    ("call", 100, 120, 0.01, 0.15, 0.25),  # OTM, short-dated
    ("put", 50, 45, 0.08, 0.45, 2.00),     # long-dated, high rate
]


def test_textbook_value():
    # Hull's classic example: S=K=100, r=5%, sigma=20%, T=1 -> C = 10.4506
    assert bs_price("call", 100, 100, 0.05, 0.20, 1.0) == pytest.approx(10.4506, abs=1e-4)


@pytest.mark.parametrize("kind,spot,strike,rate,vol,tte", GRID)
def test_binomial_converges_to_black_scholes(kind, spot, strike, rate, vol, tte):
    analytic = bs_price(kind, spot, strike, rate, vol, tte)
    lattice = binomial_price(kind, spot, strike, rate, vol, tte, steps=2_000)
    assert lattice == pytest.approx(analytic, abs=5e-3)


@pytest.mark.parametrize("kind,spot,strike,rate,vol,tte", GRID)
def test_monte_carlo_agrees_within_three_standard_errors(kind, spot, strike, rate, vol, tte):
    analytic = bs_price(kind, spot, strike, rate, vol, tte)
    estimate, stderr = mc_price(kind, spot, strike, rate, vol, tte,
                                n_paths=400_000, seed=42)
    assert abs(estimate - analytic) < 3 * stderr
    assert stderr < 0.15


def test_antithetic_variates_reduce_error():
    kwargs = dict(n_paths=100_000, seed=7)
    _, err_plain = mc_price("call", 100, 100, 0.05, 0.2, 1.0, antithetic=False, **kwargs)
    _, err_anti = mc_price("call", 100, 100, 0.05, 0.2, 1.0, antithetic=True, **kwargs)
    assert err_anti < err_plain


@pytest.mark.parametrize("kind,spot,strike,rate,vol,tte", GRID)
def test_put_call_parity(kind, spot, strike, rate, vol, tte):
    call = bs_price("call", spot, strike, rate, vol, tte)
    put = bs_price("put", spot, strike, rate, vol, tte)
    parity = spot - strike * np.exp(-rate * tte)
    assert call - put == pytest.approx(parity, abs=1e-10)


@pytest.mark.parametrize("kind,spot,strike,rate,vol,tte", GRID)
def test_greeks_match_finite_differences(kind, spot, strike, rate, vol, tte):
    g = greeks(kind, spot, strike, rate, vol, tte)
    eps = 1e-4

    def price(s=spot, k=strike, r=rate, v=vol, t=tte):
        return bs_price(kind, s, k, r, v, t)

    delta_fd = (price(s=spot + eps) - price(s=spot - eps)) / (2 * eps)
    gamma_fd = (price(s=spot + eps) - 2 * price() + price(s=spot - eps)) / eps**2
    vega_fd = (price(v=vol + eps) - price(v=vol - eps)) / (2 * eps)
    theta_fd = -(price(t=tte + eps) - price(t=tte - eps)) / (2 * eps)
    rho_fd = (price(r=rate + eps) - price(r=rate - eps)) / (2 * eps)

    assert g["delta"] == pytest.approx(delta_fd, abs=1e-5)
    assert g["gamma"] == pytest.approx(gamma_fd, abs=1e-4)
    assert g["vega"] == pytest.approx(vega_fd, abs=1e-3)
    assert g["theta"] == pytest.approx(theta_fd, abs=1e-3)
    assert g["rho"] == pytest.approx(rho_fd, abs=1e-3)


@pytest.mark.parametrize("kind,spot,strike,rate,vol,tte", GRID)
def test_implied_vol_round_trip(kind, spot, strike, rate, vol, tte):
    price = bs_price(kind, spot, strike, rate, vol, tte)
    recovered = implied_vol(kind, price, spot, strike, rate, tte)
    assert recovered == pytest.approx(vol, abs=1e-6)


def test_implied_vol_rejects_arbitrage_violations():
    with pytest.raises(ValueError):
        implied_vol("call", 200.0, 100, 100, 0.05, 1.0)  # price > spot: impossible
    with pytest.raises(ValueError):
        implied_vol("call", -1.0, 100, 100, 0.05, 1.0)


def test_american_put_carries_early_exercise_premium():
    european = binomial_price("put", 100, 110, 0.08, 0.2, 1.0, steps=1_000)
    american = binomial_price("put", 100, 110, 0.08, 0.2, 1.0, steps=1_000, american=True)
    assert american > european + 1e-3
    # American put is always worth at least immediate exercise
    assert american >= 10.0


def test_american_call_no_dividends_equals_european():
    european = binomial_price("call", 100, 95, 0.05, 0.25, 1.0, steps=1_000)
    american = binomial_price("call", 100, 95, 0.05, 0.25, 1.0, steps=1_000, american=True)
    assert american == pytest.approx(european, abs=1e-6)  # never optimal to exercise early


def test_american_call_with_dividends_exceeds_european():
    european = binomial_price("call", 100, 90, 0.03, 0.2, 1.0, steps=1_000, div=0.07)
    american = binomial_price("call", 100, 90, 0.03, 0.2, 1.0, steps=1_000,
                              american=True, div=0.07)
    assert american > european + 1e-3


def test_dividend_yield_lowers_calls_raises_puts():
    call_no_div = bs_price("call", 100, 100, 0.05, 0.2, 1.0)
    call_div = bs_price("call", 100, 100, 0.05, 0.2, 1.0, div=0.03)
    put_no_div = bs_price("put", 100, 100, 0.05, 0.2, 1.0)
    put_div = bs_price("put", 100, 100, 0.05, 0.2, 1.0, div=0.03)
    assert call_div < call_no_div
    assert put_div > put_no_div


def test_edge_cases():
    # at expiry: pure intrinsic
    assert bs_price("call", 120, 100, 0.05, 0.2, 0.0) == pytest.approx(20.0)
    assert bs_price("put", 80, 100, 0.05, 0.2, 0.0) == pytest.approx(20.0)
    # zero vol: discounted forward intrinsic, all engines agree
    for engine_price in (
        bs_price("call", 100, 90, 0.05, 0.0, 1.0),
        binomial_price("call", 100, 90, 0.05, 0.0, 1.0),
        mc_price("call", 100, 90, 0.05, 0.0, 1.0, seed=1)[0],
    ):
        expected = 100 - 90 * np.exp(-0.05)
        assert engine_price == pytest.approx(expected, abs=1e-9)
    # invalid inputs
    with pytest.raises(ValueError):
        bs_price("swaption", 100, 100, 0.05, 0.2, 1.0)
    with pytest.raises(ValueError):
        bs_price("call", -100, 100, 0.05, 0.2, 1.0)
