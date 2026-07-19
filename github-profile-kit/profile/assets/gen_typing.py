#!/usr/bin/env python3
"""Generate an animated terminal-style typing tagline SVG (SMIL, self-contained)."""
from __future__ import annotations

PHRASES = [
    "quant developer",
    "market simulators & backtesters",
    "I wrote a programming language",
    "three option-pricing engines",
    "fintech founder",
]

W, H = 760, 54
FS = 24
CHAR_W = FS * 0.60  # monospace advance width
PROMPT = "$ "
GREEN = "#3fb950"
TEXT = "#e6edf3"
BG = "#0d1117"

SLOT = 2.8  # seconds each phrase is shown
E = 0.03    # fade fraction of the whole cycle


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build() -> str:
    n = len(PHRASES)
    total = SLOT * n
    x0 = 18
    prompt_w = len(PROMPT) * CHAR_W
    tx = x0 + prompt_w

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" '
        f'height="{H}" role="img" aria-label="typing tagline">',
        f'<rect width="{W}" height="{H}" rx="10" fill="{BG}" stroke="#232b3a"/>',
        f'<text x="{x0}" y="35" font-family="\'SFMono-Regular\',Consolas,monospace" '
        f'font-size="{FS}" fill="{GREEN}" font-weight="700">{PROMPT}</text>',
    ]

    for i, phrase in enumerate(PHRASES):
        a, b = i / n, (i + 1) / n
        keytimes = f"0;{a:.4f};{min(a+E,b):.4f};{max(b-E,a):.4f};{b:.4f};1"
        values = "0;0;1;1;0;0"
        parts.append(
            f'<text x="{tx:.1f}" y="35" font-family="\'SFMono-Regular\',Consolas,monospace" '
            f'font-size="{FS}" fill="{TEXT}" opacity="0">'
            f'<animate attributeName="opacity" values="{values}" keyTimes="{keytimes}" '
            f'dur="{total}s" repeatCount="indefinite"/>'
            f'{_esc(phrase)}'
            f'<tspan fill="{GREEN}">&#9611;'
            f'<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" '
            f'dur="1.06s" repeatCount="indefinite"/></tspan>'
            f'</text>'
        )

    parts.append("</svg>")
    return "".join(parts)


if __name__ == "__main__":
    svg = build()
    with open("assets/typing.svg", "w") as f:
        f.write(svg)
    print(f"typing.svg written ({len(svg)} bytes)")
