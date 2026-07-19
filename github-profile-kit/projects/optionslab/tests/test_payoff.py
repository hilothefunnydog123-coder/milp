import numpy as np
import pytest

from optionslab import (
    Leg,
    ascii_diagram,
    bull_call_spread,
    butterfly,
    covered_call,
    straddle,
    strangle,
    strategy_payoff,
)


TERMINAL = np.linspace(50, 150, 201)


def payoff_at(legs, price):
    return float(strategy_payoff(legs, np.array([price]))[0])


def test_straddle_is_v_shaped_at_the_strike():
    legs = straddle(100)
    assert payoff_at(legs, 100) == 0.0
    assert payoff_at(legs, 80) == 20.0
    assert payoff_at(legs, 125) == 25.0


def test_strangle_has_a_flat_floor_between_strikes():
    legs = strangle(90, 110)
    assert payoff_at(legs, 100) == 0.0
    assert payoff_at(legs, 95) == 0.0
    assert payoff_at(legs, 80) == 10.0
    assert payoff_at(legs, 120) == 10.0


def test_bull_call_spread_is_capped_both_sides():
    legs = bull_call_spread(95, 105)
    assert payoff_at(legs, 90) == 0.0
    assert payoff_at(legs, 100) == 5.0
    assert payoff_at(legs, 200) == 10.0  # capped at high - low


def test_butterfly_peaks_at_the_body():
    legs = butterfly(90, 100, 110)
    payoffs = strategy_payoff(legs, TERMINAL)
    assert payoff_at(legs, 100) == 10.0
    assert float(payoffs.max()) == pytest.approx(10.0)
    assert payoff_at(legs, 80) == 0.0
    assert payoff_at(legs, 120) == 0.0


def test_covered_call_caps_upside_keeps_downside():
    legs = covered_call(110)
    assert payoff_at(legs, 150) == 110.0  # capped
    assert payoff_at(legs, 80) == 80.0    # full downside of the stock


def test_short_legs_invert():
    long_call = [Leg("call", 100, 1)]
    short_call = [Leg("call", 100, -1)]
    assert payoff_at(long_call, 120) == -payoff_at(short_call, 120) == 20.0


def test_unknown_leg_kind_raises():
    with pytest.raises(ValueError):
        strategy_payoff([Leg("swap", 100, 1)], TERMINAL)
    with pytest.raises(ValueError):
        strangle(110, 90)
    with pytest.raises(ValueError):
        butterfly(100, 90, 110)


def test_ascii_diagram_draws_curve_and_axis():
    art = ascii_diagram(straddle(100), center=100)
    assert "█" in art and "·" in art
    assert len(art.splitlines()) == 16  # 15 rows + price labels
