#!/usr/bin/env python3
"""Generate an animated 'live market' banner SVG for the profile README.

Pure standard library. Simulates a geometric-Brownian-motion price path,
draws it as candlesticks that animate in left-to-right, overlays a moving
average that draws itself, and titles the whole thing. Re-run daily by a
GitHub Action so the market at the top of the profile is never the same twice.
"""
from __future__ import annotations

import datetime as dt
import math
import random

W, H = 1000, 240
PAD_L, PAD_R, PAD_T, PAD_B = 26, 26, 74, 26
N = 46  # candles

GREEN = "#3fb950"
RED = "#f85149"
BLUE = "#58a6ff"
BG = "#0d1117"
PANEL = "#0d1117"
GRID = "#1b2230"
TEXT = "#e6edf3"
DIM = "#8b949e"


def simulate(seed: int) -> list[tuple[float, float, float, float]]:
    """Return N OHLC candles from a GBM walk."""
    rng = random.Random(seed)
    price = 100.0
    mu, sigma = 0.0006, 0.018
    candles = []
    for _ in range(N):
        open_ = price
        # a few intrabar steps for realistic highs/lows
        hi = lo = price
        for _ in range(6):
            price *= math.exp(rng.gauss(mu, sigma))
            hi = max(hi, price)
            lo = min(lo, price)
        candles.append((open_, hi, lo, price))
    return candles


def sma(closes: list[float], window: int) -> list[float | None]:
    out: list[float | None] = []
    for i in range(len(closes)):
        if i + 1 < window:
            out.append(None)
        else:
            out.append(sum(closes[i + 1 - window:i + 1]) / window)
    return out


def build_svg(seed: int) -> str:
    candles = simulate(seed)
    closes = [c[3] for c in candles]
    ma = sma(closes, 8)

    lo = min(c[2] for c in candles)
    hi = max(c[1] for c in candles)
    span = (hi - lo) or 1.0
    plot_w = W - PAD_L - PAD_R
    plot_h = H - PAD_T - PAD_B
    step = plot_w / N
    body_w = step * 0.58

    def y(v: float) -> float:
        return PAD_T + (hi - v) / span * plot_h

    def x(i: int) -> float:
        return PAD_L + step * (i + 0.5)

    parts: list[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="100%" role="img" aria-label="animated market banner">'
    )
    parts.append(f'''<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0f1420"/><stop offset="1" stop-color="#0a0d14"/>
      </linearGradient>
      <linearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="{BLUE}" stop-opacity="0"/>
        <stop offset="1" stop-color="{BLUE}" stop-opacity="0.10"/>
      </linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="0.4"/></filter>
    </defs>''')
    parts.append(f'<rect x="1" y="1" width="{W-2}" height="{H-2}" rx="16" '
                 f'fill="url(#bg)" stroke="#232b3a"/>')
    parts.append(f'<rect x="1" y="1" width="{W-2}" height="{H-2}" rx="16" fill="url(#glow)"/>')

    # grid
    for g in range(1, 5):
        gy = PAD_T + plot_h * g / 5
        parts.append(f'<line x1="{PAD_L}" y1="{gy:.1f}" x2="{W-PAD_R}" y2="{gy:.1f}" '
                     f'stroke="{GRID}" stroke-width="1"/>')

    # candles, animated in left-to-right
    for i, (o, h, l, c) in enumerate(candles):
        up = c >= o
        color = GREEN if up else RED
        cx = x(i)
        top = y(max(o, c))
        bot = y(min(o, c))
        bh = max(bot - top, 1.2)
        begin = f"{i * 0.028:.3f}s"
        parts.append(
            f'<g opacity="0">'
            f'<animate attributeName="opacity" from="0" to="1" begin="{begin}" '
            f'dur="0.42s" fill="freeze"/>'
            f'<animateTransform attributeName="transform" type="translate" '
            f'from="0 10" to="0 0" begin="{begin}" dur="0.42s" fill="freeze"/>'
            f'<line x1="{cx:.1f}" y1="{y(h):.1f}" x2="{cx:.1f}" y2="{y(l):.1f}" '
            f'stroke="{color}" stroke-width="1.4"/>'
            f'<rect x="{cx-body_w/2:.1f}" y="{top:.1f}" width="{body_w:.1f}" '
            f'height="{bh:.1f}" rx="1.4" fill="{color}"/>'
            f'</g>'
        )

    # moving-average line, draws itself via stroke-dashoffset
    pts = [f"{x(i):.1f},{y(v):.1f}" for i, v in enumerate(ma) if v is not None]
    if len(pts) > 1:
        approx_len = plot_w
        parts.append(
            f'<polyline points="{" ".join(pts)}" fill="none" stroke="{BLUE}" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
            f'filter="url(#soft)" stroke-dasharray="{approx_len}" '
            f'stroke-dashoffset="{approx_len}">'
            f'<animate attributeName="stroke-dashoffset" from="{approx_len}" to="0" '
            f'begin="0.4s" dur="1.5s" fill="freeze"/></polyline>'
        )

    # title block (fades in)
    parts.append(
        f'<g opacity="0"><animate attributeName="opacity" from="0" to="1" '
        f'begin="0.2s" dur="0.9s" fill="freeze"/>'
        f'<text x="{PAD_L+6}" y="40" font-family="\'Segoe UI\',Helvetica,Arial,sans-serif" '
        f'font-size="30" font-weight="700" fill="{TEXT}">hilothefunnydog123-coder</text>'
        f'<text x="{PAD_L+8}" y="62" font-family="\'Segoe UI\',Helvetica,Arial,sans-serif" '
        f'font-size="14" fill="{DIM}">quant tooling · market simulators · fintech · '
        f'building the whole stack</text>'
        f'<circle cx="{W-PAD_R-8}" cy="34" r="4" fill="{GREEN}">'
        f'<animate attributeName="opacity" values="1;0.25;1" dur="1.6s" '
        f'repeatCount="indefinite"/></circle>'
        f'<text x="{W-PAD_R-20}" y="38" text-anchor="end" '
        f'font-family="\'Segoe UI\',Helvetica,Arial,sans-serif" font-size="12" '
        f'fill="{DIM}">LIVE</text></g>'
    )

    parts.append("</svg>")
    return "".join(parts)


def main() -> None:
    # seed by date so the banner is stable within a day, fresh each day
    today = dt.date.today()
    seed = today.year * 10000 + today.month * 100 + today.day
    svg = build_svg(seed)
    with open("assets/banner.svg", "w") as f:
        f.write(svg)
    print(f"banner.svg written ({len(svg)} bytes, seed {seed})")


if __name__ == "__main__":
    main()
