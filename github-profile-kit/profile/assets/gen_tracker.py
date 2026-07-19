#!/usr/bin/env python3
"""Daily strategy tracker for the profile README.

Backtests an SMA-crossover strategy on real SPY data (via quantsim) and
renders (1) an equity-curve SVG and (2) a markdown stats block injected into
the README between <!--TRACKER:START--> / <!--TRACKER:END--> markers.

Run daily by a GitHub Action, so the profile always shows a fresh track
record. Falls back to a bundled sample series if the network is unavailable.
"""
from __future__ import annotations

import datetime as dt
import os
import re

from quantsim import SMACrossover, load_csv, run_backtest

try:
    from quantsim import fetch
except ImportError:  # pragma: no cover
    fetch = None

HERE = os.path.dirname(__file__)
ROOT = os.path.dirname(HERE)
SAMPLE = os.path.join(HERE, "sample_prices.csv")
EQUITY_SVG = os.path.join(HERE, "equity.svg")
README = os.path.join(ROOT, "README.md")

W, H = 720, 230
PAD = 16
GREEN, BLUE, BG, GRID, TEXT, DIM = "#3fb950", "#58a6ff", "#0d1117", "#1b2230", "#e6edf3", "#8b949e"


def get_series():
    """Return (label, PriceSeries). Real SPY if reachable, else bundled sample."""
    if fetch is not None:
        try:
            start = (dt.date.today() - dt.timedelta(days=365 * 3)).isoformat()
            return "SPY (real, daily)", fetch("SPY", start=start)
        except Exception as exc:  # network / source down
            print(f"fetch failed ({exc}); using bundled sample")
    return "sample series (offline)", load_csv(SAMPLE)


def _poly(series, lo, span, plot_w, plot_h):
    n = len(series)
    step = plot_w / max(n - 1, 1)
    return [(PAD + i * step, PAD + 18 + (1 - (v - lo) / span) * plot_h)
            for i, v in enumerate(series)]


def render_equity_svg(result, label: str) -> None:
    eq = list(result.equity)
    bench = list(result.benchmark)
    # downsample to keep the SVG light and the line smooth
    if len(eq) > 200:
        k = len(eq) // 200
        eq = eq[::k]
        bench = bench[::k]
    lo = min(min(eq), min(bench))
    hi = max(max(eq), max(bench))
    span = (hi - lo) or 1.0
    plot_w = W - 2 * PAD
    plot_h = H - 2 * PAD - 26

    eq_pts = _poly(eq, lo, span, plot_w, plot_h)
    bench_pts = _poly(bench, lo, span, plot_w, plot_h)
    eq_line = " ".join(f"{x:.1f},{y:.1f}" for x, y in eq_pts)
    bench_line = " ".join(f"{x:.1f},{y:.1f}" for x, y in bench_pts)
    base_y = PAD + 18 + plot_h
    area = f"{eq_pts[0][0]:.1f},{base_y:.1f} " + eq_line + f" {eq_pts[-1][0]:.1f},{base_y:.1f}"

    up = result.equity[-1] >= result.equity[0]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" '
        f'role="img" aria-label="strategy equity curve">',
        f'<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{GREEN}" stop-opacity="0.28"/>'
        f'<stop offset="1" stop-color="{GREEN}" stop-opacity="0"/></linearGradient></defs>',
        f'<rect x="1" y="1" width="{W-2}" height="{H-2}" rx="14" fill="{BG}" stroke="#232b3a"/>',
    ]
    for g in range(1, 4):
        gy = PAD + 18 + plot_h * g / 4
        parts.append(f'<line x1="{PAD}" y1="{gy:.1f}" x2="{W-PAD}" y2="{gy:.1f}" '
                     f'stroke="{GRID}" stroke-width="1"/>')
    parts.append(f'<polygon points="{area}" fill="url(#fill)"/>')
    parts.append(f'<polyline points="{bench_line}" fill="none" stroke="{BLUE}" '
                 f'stroke-width="1.6" opacity="0.85"/>')
    parts.append(f'<polyline points="{eq_line}" fill="none" stroke="{GREEN}" '
                 f'stroke-width="2.4" stroke-linejoin="round"/>')
    # title + legend
    m = result.metrics
    parts.append(f'<text x="{PAD+4}" y="24" font-family="\'Segoe UI\',Arial,sans-serif" '
                 f'font-size="14" font-weight="700" fill="{TEXT}">$10,000 in {label} — '
                 f'SMA(20/100) vs buy &amp; hold</text>')
    parts.append(f'<text x="{W-PAD-4}" y="{H-8}" text-anchor="end" '
                 f'font-family="\'Segoe UI\',Arial,sans-serif" font-size="12" fill="{DIM}">'
                 f'strategy {m["total_return"]*100:+.1f}%  ·  buy &amp; hold '
                 f'{m["benchmark"]["total_return"]*100:+.1f}%</text>')
    parts.append(f'<circle cx="{PAD+10}" cy="{H-12}" r="4" fill="{GREEN}"/>'
                 f'<text x="{PAD+20}" y="{H-8}" font-family="\'Segoe UI\',Arial,sans-serif" '
                 f'font-size="12" fill="{DIM}">SMA crossover</text>'
                 f'<circle cx="{PAD+128}" cy="{H-12}" r="4" fill="{BLUE}"/>'
                 f'<text x="{PAD+138}" y="{H-8}" font-family="\'Segoe UI\',Arial,sans-serif" '
                 f'font-size="12" fill="{DIM}">buy &amp; hold</text>')
    parts.append("</svg>")
    with open(EQUITY_SVG, "w") as f:
        f.write("".join(parts))


def build_block(result, label: str) -> str:
    m = result.metrics
    b = m["benchmark"]
    today = dt.date.today().isoformat()
    beat = "✅ beating" if m["total_return"] > b["total_return"] else "▪️ trailing"

    def pct(x):
        return f"{x*100:+.1f}%"

    return f"""<!--TRACKER:START-->
> 🤖 **Auto-updated daily by a GitHub Action** — a backtest of my own [quantsim](https://github.com/hilothefunnydog123-coder/quantsim) engine, refreshed every morning. *(paper research, not investment advice)*

<img src="assets/equity.svg" width="100%" alt="strategy equity curve"/>

| as of | strategy | buy & hold | verdict |
|:--|:--|:--|:--|
| `{today}` on {label} | **{pct(m['total_return'])}** · Sharpe {m['sharpe']:.2f} · maxDD {pct(m['max_drawdown'])} | {pct(b['total_return'])} · Sharpe {b['sharpe']:.2f} | {beat} buy & hold |
<!--TRACKER:END-->"""


def inject(block: str) -> None:
    with open(README) as f:
        text = f.read()
    pattern = re.compile(r"<!--TRACKER:START-->.*?<!--TRACKER:END-->", re.DOTALL)
    if pattern.search(text):
        text = pattern.sub(block, text)
    else:
        print("no TRACKER markers in README; skipping injection")
        return
    with open(README, "w") as f:
        f.write(text)


def main() -> None:
    label, series = get_series()
    result = run_backtest(series.closes, SMACrossover(fast=20, slow=100),
                          dates=series.dates, cost_bps=1.0)
    render_equity_svg(result, label)
    inject(build_block(result, label))
    print(f"tracker updated on {label}: "
          f"strategy {result.metrics['total_return']*100:+.1f}%")


if __name__ == "__main__":
    main()
