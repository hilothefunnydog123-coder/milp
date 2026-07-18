import json

import pytest

from papertrader import PaperBroker, load_history, run_cycle, sma_weight
from papertrader.report import render_report
from papertrader.strategy import make_signal


def uptrend(n=200, start=100.0):
    return [start * (1.004 ** i) for i in range(n)]


def downtrend(n=200, start=100.0):
    return [start * (0.996 ** i) for i in range(n)]


def make_broker(tmp_path, cash=100_000.0):
    return PaperBroker(tmp_path / "portfolio.json", initial_cash=cash)


def test_enters_long_in_uptrend(tmp_path):
    broker = make_broker(tmp_path)
    signal = make_signal("sma", fast=10, slow=50)
    result = run_cycle(broker, uptrend(), "SPY", signal, state_dir=tmp_path)
    assert result.weight == 1.0
    assert result.order_qty > 0
    assert broker.position("SPY") == result.target_qty
    # invested nearly all equity, and equity is conserved through the fill
    assert result.target_qty * result.price <= result.equity
    assert result.equity == pytest.approx(100_000.0)


def test_stays_flat_in_downtrend(tmp_path):
    broker = make_broker(tmp_path)
    signal = make_signal("sma", fast=10, slow=50)
    result = run_cycle(broker, downtrend(), "SPY", signal, state_dir=tmp_path)
    assert result.weight == 0.0
    assert result.order_qty == 0
    assert broker.position("SPY") == 0


def test_idempotent_second_run_places_no_order(tmp_path):
    broker = make_broker(tmp_path)
    signal = make_signal("sma", fast=10, slow=50)
    first = run_cycle(broker, uptrend(), "SPY", signal, state_dir=tmp_path)
    second = run_cycle(broker, uptrend(), "SPY", signal, state_dir=tmp_path)
    assert first.order_qty > 0
    assert second.order_qty == 0


def test_exits_when_trend_flips(tmp_path):
    broker = make_broker(tmp_path)
    signal = make_signal("sma", fast=10, slow=50)
    run_cycle(broker, uptrend(), "SPY", signal, state_dir=tmp_path)
    assert broker.position("SPY") > 0
    flipped = uptrend() + downtrend(120, start=uptrend()[-1])
    result = run_cycle(broker, flipped, "SPY", signal, state_dir=tmp_path)
    assert result.weight == 0.0
    assert broker.position("SPY") == 0
    assert broker.state["cash"] == pytest.approx(broker.equity())


def test_state_persists_across_broker_instances(tmp_path):
    signal = make_signal("sma", fast=10, slow=50)
    run_cycle(make_broker(tmp_path), uptrend(), "SPY", signal, state_dir=tmp_path)
    reloaded = PaperBroker(tmp_path / "portfolio.json")
    assert reloaded.position("SPY") > 0


def test_history_is_appended_jsonl(tmp_path):
    broker = make_broker(tmp_path)
    signal = make_signal("sma", fast=10, slow=50)
    run_cycle(broker, uptrend(), "SPY", signal, state_dir=tmp_path)
    run_cycle(broker, uptrend(), "SPY", signal, state_dir=tmp_path)
    history = load_history(tmp_path)
    assert len(history) == 2
    assert {"ts", "symbol", "price", "weight", "equity"} <= set(history[0])
    raw = (tmp_path / "history.jsonl").read_text().splitlines()
    assert all(json.loads(line) for line in raw)


def test_sma_weight_math():
    assert sma_weight(uptrend(), fast=10, slow=50) == 1.0
    assert sma_weight(downtrend(), fast=10, slow=50) == 0.0
    with pytest.raises(ValueError):
        sma_weight([1.0] * 10, fast=5, slow=50)


def test_report_renders_svg_and_stats(tmp_path):
    broker = make_broker(tmp_path)
    signal = make_signal("sma", fast=10, slow=50)
    run_cycle(broker, uptrend(), "SPY", signal, state_dir=tmp_path)
    run_cycle(broker, uptrend() + uptrend(20, start=uptrend()[-1]), "SPY", signal,
              state_dir=tmp_path)
    out = tmp_path / "report.html"
    render_report(load_history(tmp_path), out)
    html = out.read_text()
    assert "<svg" in html and "total return" in html and "SPY" in html


def test_report_handles_empty_history(tmp_path):
    out = tmp_path / "report.html"
    render_report([], out)
    assert "No cycles recorded" in out.read_text()
