import numpy as np
import pytest

from quantlang import QuantlangError, compile_strategy, evaluate_expression


CLOSES = np.array([100.0, 101, 102, 103, 104, 105, 104, 103, 102, 101,
                   100, 99, 98, 99, 100, 101, 102, 103, 104, 105])


# -- compile-time validation --------------------------------------------------

def test_unknown_indicator_suggests_a_fix():
    with pytest.raises(QuantlangError) as err:
        compile_strategy('strategy "x" { when smaa(20) > 1 then long otherwise flat }')
    assert "did you mean 'sma'" in str(err.value)


def test_wrong_arity():
    with pytest.raises(QuantlangError, match="takes 1 argument"):
        compile_strategy('strategy "x" { when sma() > 1 then long otherwise flat }')
    with pytest.raises(QuantlangError, match="takes 0 argument"):
        compile_strategy('strategy "x" { when price(5) > 1 then long otherwise flat }')


def test_window_must_be_positive_integer_literal():
    for bad in ("sma(0)", "sma(2.5)", "sma(price())"):
        with pytest.raises(QuantlangError, match="positive whole number"):
            compile_strategy(f'strategy "x" {{ when {bad} > 1 then long otherwise flat }}')


def test_type_errors_are_caught_at_compile_time():
    with pytest.raises(QuantlangError, match="'and' needs conditions"):
        compile_strategy('strategy "x" { when sma(5) and 3 then long otherwise flat }')
    with pytest.raises(QuantlangError, match="needs a condition"):
        compile_strategy('strategy "x" { when not price() then long otherwise flat }')
    with pytest.raises(QuantlangError, match="needs numbers"):
        compile_strategy(
            'strategy "x" { when (price() > 1) + 2 > 3 then long otherwise flat }')


def test_warmup_is_the_maximum_requirement():
    strategy = compile_strategy('''strategy "w" {
      when sma(10) > sma(30) and rsi(14) < 70 then long
      when momentum(50) < 0 then short
      otherwise flat
    }''')
    assert strategy.warmup == 51  # momentum(50) needs 51 bars


# -- evaluation ---------------------------------------------------------------

def test_indicators_match_numpy_references():
    assert evaluate_expression("price()", CLOSES) == 105.0
    assert evaluate_expression("sma(5)", CLOSES) == pytest.approx(CLOSES[-5:].mean())
    assert evaluate_expression("highest(10)", CLOSES) == CLOSES[-10:].max()
    assert evaluate_expression("lowest(10)", CLOSES) == CLOSES[-10:].min()
    assert evaluate_expression("momentum(5)", CLOSES) == pytest.approx(
        CLOSES[-1] / CLOSES[-6] - 1)
    rets = np.diff(CLOSES[-11:]) / CLOSES[-11:-1]
    assert evaluate_expression("volatility(10)", CLOSES) == pytest.approx(
        rets.std(ddof=1))


def test_rsi_extremes():
    all_up = np.linspace(100, 120, 30)
    all_down = np.linspace(120, 100, 30)
    assert evaluate_expression("rsi(14)", all_up) == 100.0
    assert evaluate_expression("rsi(14)", all_down) == pytest.approx(0.0, abs=1e-9)


def test_ema_weights_recent_prices_more_than_sma():
    rising = np.linspace(100, 130, 40)
    ema = evaluate_expression("ema(20)", rising)
    sma = evaluate_expression("sma(20)", rising)
    assert ema > sma  # in an uptrend the EMA hugs price closer


def test_expression_arithmetic_and_logic():
    assert evaluate_expression("2 + 3 * 4", CLOSES) == 14
    assert evaluate_expression("-(2 + 3)", CLOSES) == -5
    assert evaluate_expression("price() > 100 and price() < 110", CLOSES) is True
    assert evaluate_expression("not price() > 100", CLOSES) is False
    assert evaluate_expression("1 / 0", CLOSES) == 0.0  # documented: div-by-zero -> 0


def test_first_matching_rule_wins():
    strategy = compile_strategy('''strategy "order matters" {
      when price() > 0   then 0.25
      when price() > 100 then long
      otherwise flat
    }''')
    assert strategy.target_weight(CLOSES) == 0.25  # first rule shadows the second


def test_otherwise_fires_when_no_rule_matches():
    strategy = compile_strategy('''strategy "fallback" {
      when price() > 1000 then long
      otherwise 0.7
    }''')
    assert strategy.target_weight(CLOSES) == pytest.approx(0.7)


def test_weights_are_clamped_to_unit_leverage():
    strategy = compile_strategy('strategy "greedy" { otherwise 5 }')
    assert strategy.target_weight(CLOSES) == 1.0
    strategy = compile_strategy('strategy "doomer" { otherwise -5 }')
    assert strategy.target_weight(CLOSES) == -1.0


def test_short_position_keyword():
    strategy = compile_strategy('''strategy "bear" {
      when momentum(5) < 0 then short
      otherwise flat
    }''')
    falling = np.linspace(110, 100, 20)
    assert strategy.target_weight(falling) == -1.0
