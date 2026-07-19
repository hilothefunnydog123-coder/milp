"""optionslab CLI: price with three engines, draw payoff diagrams."""
from __future__ import annotations

import argparse

from optionslab.binomial import binomial_price
from optionslab.black_scholes import bs_price, greeks, implied_vol
from optionslab.montecarlo import mc_price
from optionslab.payoff import STRATEGIES, ascii_diagram

BOLD, CYAN, DIM, RESET = "\033[1m", "\033[36m", "\033[2m", "\033[0m"


def _price(args: argparse.Namespace) -> None:
    common = (args.spot, args.strike, args.rate, args.vol, args.tte)
    analytic = bs_price(args.kind, *common, div=args.div)
    lattice_eu = binomial_price(args.kind, *common, steps=args.steps, div=args.div)
    lattice_am = binomial_price(args.kind, *common, steps=args.steps,
                                american=True, div=args.div)
    mc, stderr = mc_price(args.kind, *common, n_paths=args.paths,
                          seed=args.seed, div=args.div)

    print(f"\n{BOLD}{CYAN}optionslab{RESET} — {args.kind} · spot {args.spot:g} · "
          f"strike {args.strike:g} · σ={args.vol:.0%} · r={args.rate:.2%} · "
          f"T={args.tte:g}y" + (f" · q={args.div:.2%}" if args.div else "") + "\n")
    print(f"{BOLD}Price (three independent engines){RESET}")
    print(f"  Black–Scholes (closed form)     {analytic:>10.4f}")
    print(f"  Binomial CRR European ({args.steps} steps) {lattice_eu:>7.4f}")
    print(f"  Monte Carlo ({args.paths:,} paths)   {mc:>10.4f} ± {stderr:.4f}")
    print(f"  Binomial CRR American           {lattice_am:>10.4f}  "
          f"{DIM}(early-exercise premium {lattice_am - lattice_eu:+.4f}){RESET}\n")

    g = greeks(args.kind, *common, div=args.div)
    print(f"{BOLD}Greeks{RESET}")
    print(f"  delta  {g['delta']:>9.4f}     {DIM}per $1 of spot{RESET}")
    print(f"  gamma  {g['gamma']:>9.4f}     {DIM}delta change per $1{RESET}")
    print(f"  vega   {g['vega'] / 100:>9.4f}     {DIM}per vol point{RESET}")
    print(f"  theta  {g['theta'] / 365:>9.4f}     {DIM}per calendar day{RESET}")
    print(f"  rho    {g['rho'] / 100:>9.4f}     {DIM}per 1% of rates{RESET}\n")

    recovered = implied_vol(args.kind, analytic, args.spot, args.strike,
                            args.rate, args.tte, div=args.div)
    print(f"{DIM}sanity: implied vol recovered from the BS price = "
          f"{recovered:.6f} (true σ = {args.vol:g}){RESET}\n")


def _payoff(args: argparse.Namespace) -> None:
    builder, n_strikes = STRATEGIES[args.strategy]
    strikes = args.strikes
    if len(strikes) != n_strikes:
        raise SystemExit(f"{args.strategy} needs exactly {n_strikes} strike(s)")
    legs = builder(*strikes)
    center = sum(strikes) / len(strikes) if strikes and strikes != [0.0] else 100.0
    if args.strategy == "covered-call":
        center = strikes[0]
    print(f"\n{BOLD}{CYAN}{args.strategy}{RESET} — terminal payoff "
          f"{DIM}(· = breakeven axis){RESET}\n")
    print(ascii_diagram(legs, center=center))
    print()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="optionslab",
        description="Option pricing with three engines that cross-validate: "
        "Black–Scholes, binomial trees, Monte Carlo.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    price = sub.add_parser("price", help="price an option with all three engines")
    price.add_argument("--kind", choices=["call", "put"], default="call")
    price.add_argument("--spot", type=float, default=100)
    price.add_argument("--strike", type=float, default=100)
    price.add_argument("--rate", type=float, default=0.05)
    price.add_argument("--vol", type=float, default=0.20)
    price.add_argument("--tte", type=float, default=1.0, help="years to expiry")
    price.add_argument("--div", type=float, default=0.0, help="dividend yield")
    price.add_argument("--steps", type=int, default=1_000)
    price.add_argument("--paths", type=int, default=200_000)
    price.add_argument("--seed", type=int, default=None)
    price.set_defaults(func=_price)

    payoff = sub.add_parser("payoff", help="draw a strategy's payoff diagram")
    payoff.add_argument("strategy", choices=sorted(STRATEGIES))
    payoff.add_argument("strikes", type=float, nargs="*", default=[100.0])
    payoff.set_defaults(func=_payoff)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
