# 🤖 papertrader

A **paper-trading bot you can actually verify**. Every US market morning it fetches prices, computes a signal, rebalances to the target position, and commits its updated P&L — position, equity curve, every order — **into this repo's git history**. No screenshots, no trust-me: the track record *is* the commit log.

- **Two brokers, one interface** — a local simulator (default, zero setup) and [Alpaca's](https://alpaca.markets) free paper-trading API (`--live`)
- **Free scheduling** — a GitHub Actions cron runs the daily cycle; no server, no VPS
- **Live P&L page** — each run renders a self-contained HTML report you can publish with GitHub Pages
- **Zero dependencies** — pure Python standard library; Alpaca is called with plain `urllib`
- **Strategies match [quantsim](https://github.com/hilothefunnydog123-coder/quantsim)** — backtest a strategy there, run the identical logic live here

> Paper money only. The Alpaca integration points at `paper-api.alpaca.markets` — going live with real money would require deliberately changing the base URL, and you shouldn't.

## 🚀 Quickstart (60 seconds, no keys needed)

```bash
pip install git+https://github.com/hilothefunnydog123-coder/papertrader.git

papertrader run --symbol SPY --strategy sma        # one cycle, local simulator
papertrader status                                 # position + P&L history
papertrader report --out docs/report.html          # the shareable P&L page
```

```
papertrader [local-sim] 2026-07-06T21:14:03+00:00
  SPY @ 623.41 · signal weight 1
  position 0 → target 160 · BUY 160 SPY
  equity: 100,000.00
```

Run it again tomorrow and it re-evaluates: the engine is **idempotent** — if the position already matches the target, it does nothing. That's what makes it safe to fire from an unattended scheduler.

## 📅 Set-and-forget: the GitHub Actions bot

1. Fork/clone this repo.
2. (Optional) Get free paper keys at [app.alpaca.markets](https://app.alpaca.markets) and add repo secrets `APCA_API_KEY_ID` and `APCA_API_SECRET_KEY` — without them the bot runs the local simulator, which is still a real, honest track record.
3. Enable GitHub Pages (Settings → Pages → main branch, `/docs`).

The included [workflow](.github/workflows/trade.yml) then runs every weekday after the US open, trades, regenerates `docs/report.html`, and commits. Your equity curve becomes a public URL that updates itself.

## 🧠 Strategies

| Name | Rule |
|---|---|
| `sma` | Long when the fast SMA (default 20) is above the slow SMA (default 100), else in cash |
| `momentum` | Long when the trailing ~6-month return is positive, else in cash |

Signal semantics are identical to quantsim's backtester, so the honest workflow is: **backtest there → deploy here → let the commit history keep you honest.** Adding a strategy is one function:

```python
def my_signal(closes: list[float]) -> float:
    """Return a target weight between 0 (all cash) and 1 (fully invested)."""
    return 1.0 if closes[-1] > min(closes[-20:]) * 1.05 else 0.0
```

## 🏗️ How a cycle works

```
fetch daily closes ──▶ signal(closes) ──▶ weight ∈ [0, 1]
                                            │
   history.jsonl ◀── record ◀── order = ⌊equity·weight/price⌋ − current position
```

State is two small files: `state/portfolio.json` (the simulator's cash and positions) and `state/history.jsonl` (an append-only log of every cycle — the audit trail the report is built from).

## ✅ Tests

```bash
pip install -e ".[dev]" && pytest
```

Nine tests cover the full loop with no network: entering on an uptrend, staying flat on a downtrend, exiting on a trend flip, idempotency, cash conservation through fills, state persistence, and report rendering.

## 📄 License

MIT. Not investment advice — it's a bot that buys index ETFs with pretend money and shows its homework.
