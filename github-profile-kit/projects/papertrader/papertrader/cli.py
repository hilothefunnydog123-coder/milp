"""papertrader CLI: run one cycle, check status, render the P&L report."""
from __future__ import annotations

import argparse
from pathlib import Path

from papertrader.broker import AlpacaBroker, PaperBroker
from papertrader.data import fetch_closes, load_closes_csv
from papertrader.engine import load_history, run_cycle
from papertrader.report import render_report
from papertrader.strategy import make_signal

BOLD, DIM, RESET = "\033[1m", "\033[2m", "\033[0m"


def _run(args: argparse.Namespace) -> None:
    params = {}
    if args.strategy == "sma":
        params = {"fast": args.fast, "slow": args.slow}
    elif args.strategy == "momentum":
        params = {"lookback": args.lookback}
    signal = make_signal(args.strategy, **params)

    closes = load_closes_csv(args.csv) if args.csv else fetch_closes(args.symbol)

    if args.live:
        broker = AlpacaBroker()
        mode = "alpaca-paper"
    else:
        broker = PaperBroker(Path(args.state_dir) / "portfolio.json",
                             initial_cash=args.initial)
        mode = "local-sim"

    result = run_cycle(broker, closes, args.symbol, signal, state_dir=args.state_dir)
    action = (f"{'BUY' if result.order_qty > 0 else 'SELL'} "
              f"{abs(result.order_qty):g} {result.symbol}"
              if result.order_qty else "HOLD (already at target)")
    print(f"{BOLD}papertrader{RESET} [{mode}] {result.ts}")
    print(f"  {result.symbol} @ {result.price:,.2f} · signal weight {result.weight:g}")
    print(f"  position {result.current_qty:g} → target {result.target_qty} · {BOLD}{action}{RESET}")
    print(f"  equity: {BOLD}{result.equity:,.2f}{RESET}")


def _status(args: argparse.Namespace) -> None:
    history = load_history(args.state_dir)
    if not history:
        print("no cycles recorded yet — run `papertrader run` first")
        return
    first, last = history[0], history[-1]
    total = last["equity"] / first["equity"] - 1.0
    print(f"{BOLD}papertrader status{RESET} — {len(history)} cycle(s), "
          f"{first['ts'][:10]} → {last['ts'][:10]}")
    print(f"  equity {BOLD}{last['equity']:,.2f}{RESET} ({total * 100:+.2f}% since start)")
    print(f"  position {last['target_qty']:g} {last['symbol']} · "
          f"last signal weight {last['weight']:g}")
    for entry in history[-min(args.tail, len(history)):]:
        order = (f"{'+' if entry['order_qty'] > 0 else ''}{entry['order_qty']:g}"
                 if entry["order_qty"] else "·")
        print(f"  {DIM}{entry['ts'][:16]}  {entry['symbol']} @ {entry['price']:>10,.2f}  "
              f"w={entry['weight']:g}  order {order:>6}  eq {entry['equity']:>12,.2f}{RESET}")


def _report(args: argparse.Namespace) -> None:
    render_report(load_history(args.state_dir), args.out)
    print(f"report written to {args.out}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="papertrader",
        description="A paper-trading bot: signal -> target position -> order. "
        "Local simulation by default, Alpaca paper account with --live.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="execute one trading cycle")
    run_p.add_argument("--symbol", default="SPY")
    run_p.add_argument("--strategy", default="sma", choices=["sma", "momentum"])
    run_p.add_argument("--fast", type=int, default=20)
    run_p.add_argument("--slow", type=int, default=100)
    run_p.add_argument("--lookback", type=int, default=126)
    run_p.add_argument("--csv", help="use a local Date,Close CSV instead of fetching")
    run_p.add_argument("--live", action="store_true",
                       help="trade the Alpaca paper account (needs APCA_* env vars)")
    run_p.add_argument("--state-dir", default="state")
    run_p.add_argument("--initial", type=float, default=100_000,
                       help="starting cash for the local simulator")
    run_p.set_defaults(func=_run)

    status_p = sub.add_parser("status", help="show position and P&L history")
    status_p.add_argument("--state-dir", default="state")
    status_p.add_argument("--tail", type=int, default=10)
    status_p.set_defaults(func=_status)

    report_p = sub.add_parser("report", help="render the HTML P&L report")
    report_p.add_argument("--state-dir", default="state")
    report_p.add_argument("--out", default="docs/report.html")
    report_p.set_defaults(func=_report)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
