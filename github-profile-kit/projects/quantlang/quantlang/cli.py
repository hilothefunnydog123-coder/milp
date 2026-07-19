"""quantlang CLI: check programs, backtest them, explore in a REPL."""
from __future__ import annotations

import argparse
import sys

from quantlang.errors import QuantlangError
from quantlang.interpreter import compile_strategy, evaluate_expression

BOLD, CYAN, DIM, RESET = "\033[1m", "\033[36m", "\033[2m", "\033[0m"


def _read(path: str) -> str:
    with open(path) as f:
        return f.read()


def _check(args: argparse.Namespace) -> None:
    try:
        strategy = compile_strategy(_read(args.file))
    except QuantlangError as err:
        print(err.render(), file=sys.stderr)
        raise SystemExit(1)
    print(f"{BOLD}✓ {strategy.name}{RESET} compiles — "
          f"{len(strategy.program.rules)} rule(s), warmup {strategy.warmup} bars")


def _backtest(args: argparse.Namespace) -> None:
    try:
        strategy = compile_strategy(_read(args.file))
    except QuantlangError as err:
        print(err.render(), file=sys.stderr)
        raise SystemExit(1)

    try:
        from quantsim.backtest import run_backtest
        from quantsim.data import fetch, load_csv
    except ImportError:
        raise SystemExit("backtesting needs quantsim: pip install "
                         "'git+https://github.com/hilothefunnydog123-coder/quantsim.git'")

    if args.csv:
        series = load_csv(args.csv)
    else:
        print(f"{DIM}fetching {args.symbol} daily history…{RESET}")
        series = fetch(args.symbol, start=args.start)

    result = run_backtest(series.closes, strategy, dates=series.dates,
                          cost_bps=args.cost_bps)
    m = result.metrics
    b = m["benchmark"]
    print(f"\n{BOLD}{CYAN}quantlang backtest{RESET} — \"{strategy.name}\" on "
          f"{args.csv or args.symbol} · {len(series):,} bars\n")
    rows = [
        ("total return", f"{m['total_return']:+.2%}", f"{b['total_return']:+.2%}"),
        ("CAGR", f"{m['cagr']:+.2%}", f"{b['cagr']:+.2%}"),
        ("Sharpe (rf=0)", f"{m['sharpe']:.2f}", f"{b['sharpe']:.2f}"),
        ("max drawdown", f"{m['max_drawdown']:+.2%}", f"{b['max_drawdown']:+.2%}"),
        ("exposure", f"{m['exposure']:.0%}", "100%"),
        ("trades", str(m["n_trades"]), "1"),
    ]
    print(f"{BOLD}{'metric':<15}{'strategy':>12}{'buy & hold':>12}{RESET}")
    for name, sv, bv in rows:
        print(f"{name:<15}{sv:>12}{bv:>12}")
    print()


def _repl(args: argparse.Namespace) -> None:
    import numpy as np
    if args.csv:
        from quantsim.data import load_csv
        closes = load_csv(args.csv).closes
        source_name = args.csv
    else:
        # bundled demo series: a seeded random walk, no network needed
        rng = np.random.default_rng(7)
        closes = 100 * np.exp(np.cumsum(rng.normal(0.0003, 0.012, 1_000)))
        source_name = "demo random walk (1,000 bars)"
    print(f"{BOLD}quantlang repl{RESET} — evaluating against {source_name}")
    print(f"{DIM}try: sma(20), rsi(14), momentum(126) > 0 and rsi(14) < 70 · "
          f"ctrl-d to exit{RESET}")
    while True:
        try:
            line = input("ql> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if not line:
            continue
        try:
            print(evaluate_expression(line, closes))
        except QuantlangError as err:
            print(err.render(), file=sys.stderr)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="quantlang",
        description="A tiny language for trading strategies, compiled onto the "
        "quantsim backtesting engine.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    check = sub.add_parser("check", help="parse and validate a .ql program")
    check.add_argument("file")
    check.set_defaults(func=_check)

    backtest = sub.add_parser("backtest", help="compile and backtest a .ql program")
    backtest.add_argument("file")
    backtest.add_argument("--symbol", default="SPY")
    backtest.add_argument("--csv", help="local Date,Close CSV instead of fetching")
    backtest.add_argument("--start", default="2015-01-01")
    backtest.add_argument("--cost-bps", type=float, default=1.0)
    backtest.set_defaults(func=_backtest)

    repl = sub.add_parser("repl", help="evaluate indicator expressions interactively")
    repl.add_argument("--csv", help="evaluate against your own Date,Close CSV")
    repl.set_defaults(func=_repl)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
