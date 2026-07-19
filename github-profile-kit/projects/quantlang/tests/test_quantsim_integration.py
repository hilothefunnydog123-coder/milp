"""The payoff test: a quantlang program is indistinguishable from the
hand-written Python strategy it describes, all the way through a backtest."""
import numpy as np
import pytest

quantsim = pytest.importorskip("quantsim")

from quantsim import SMACrossover, run_backtest, simulate_gbm  # noqa: E402

from quantlang import compile_strategy  # noqa: E402

GOLDEN = '''
strategy "golden cross" {
  when sma(20) > sma(100) then long
  otherwise flat
}
'''


def test_dsl_strategy_is_bitwise_identical_to_handwritten_python():
    closes = simulate_gbm(100, 0.07, 0.2, years=4, n_paths=1, seed=5)[0]
    dsl = run_backtest(closes, compile_strategy(GOLDEN))
    python = run_backtest(closes, SMACrossover(fast=20, slow=100))
    assert np.array_equal(dsl.weights, python.weights)
    assert np.array_equal(dsl.equity, python.equity)
    assert dsl.metrics["sharpe"] == python.metrics["sharpe"]


def test_compiled_strategy_backtests_end_to_end():
    closes = simulate_gbm(100, 0.05, 0.25, years=3, n_paths=1, seed=9)[0]
    strategy = compile_strategy('''strategy "cautious momentum" {
      when momentum(126) > 0 and rsi(14) > 80 then flat
      when momentum(126) > 0 then long
      otherwise flat
    }''')
    result = run_backtest(closes, strategy)
    assert result.strategy_name == "cautious momentum"
    assert 0.0 <= result.metrics["exposure"] <= 1.0
    assert len(result.equity) == len(closes)


def test_example_programs_all_compile_and_run():
    import pathlib
    closes = simulate_gbm(100, 0.06, 0.2, years=2, n_paths=1, seed=3)[0]
    examples = sorted(pathlib.Path(__file__).parent.parent.glob("examples/*.ql"))
    assert len(examples) >= 3
    for path in examples:
        strategy = compile_strategy(path.read_text())
        result = run_backtest(closes, strategy)
        assert np.isfinite(result.equity).all(), path.name
