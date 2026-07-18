"""Daily close data from Stooq's free CSV endpoint (no API key), or local CSV."""
from __future__ import annotations

import csv
import io
import urllib.request

STOOQ_URL = "https://stooq.com/q/d/l/?s={symbol}&i=d"


def _parse_csv(f) -> list[float]:
    closes = []
    for row in csv.DictReader(f):
        raw = (row.get("Close") or "").strip()
        if raw and raw.lower() not in ("null", "nan"):
            closes.append(float(raw))
    if len(closes) < 2:
        raise RuntimeError("no usable price data")
    return closes


def fetch_closes(symbol: str, timeout: float = 30.0) -> list[float]:
    """Full daily close history, oldest first. US tickers: SPY -> spy.us."""
    stooq_symbol = symbol.lower() if "." in symbol else f"{symbol.lower()}.us"
    req = urllib.request.Request(
        STOOQ_URL.format(symbol=stooq_symbol),
        headers={"User-Agent": "papertrader (github.com/hilothefunnydog123-coder/papertrader)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    if not text.startswith("Date"):
        raise RuntimeError(f"Stooq returned no data for {symbol!r}")
    return _parse_csv(io.StringIO(text))


def load_closes_csv(path: str) -> list[float]:
    with open(path, newline="") as f:
        return _parse_csv(f)
