# Session Handoff — hilothefunnydog123-coder GitHub portfolio

**Owner context:** GitHub user `hilothefunnydog123-coder` (email dlake003@gmail.com).
14 years old, aspiring quant, targeting NYU. All work is a portfolio-building
effort with a quantitative-finance theme.

## Repos created & published (all public, all live)

| Repo | Language | What it is | Tests |
|---|---|---|---|
| **hilothefunnydog123-coder** | Markdown | Profile README (username/username repo) — animated banner, badges, featured-projects table, stats cards | — |
| **quantsim** | Python·NumPy | ⭐ Flagship. Full quant stack: Monte Carlo sim + backtesting engine + `quantsim.orderbook` (price-time-priority matching engine) + `BookExecution` (order-book slippage model) + `quantsim live` (paper trading, PaperBroker/AlpacaBroker) + CI & daily-trade GitHub Actions | 44 |
| **exchange-simulator** | Python | Agent-based market (market makers, noise, momentum, fundamentalists) on quantsim's engine; fat tails / vol clustering / flash crash **emerge** and are statistically asserted. Depends on quantsim | 14 |
| **optionslab** | Python·NumPy | 3 cross-validating option pricers (Black-Scholes, CRR binomial incl. American, Monte Carlo w/ antithetic variates) + Greeks (verified vs finite differences) + implied-vol solver + ASCII payoff diagrams | 46 |
| **quantlang** | Python | A DSL for trading strategies — hand-written lexer + recursive-descent parser + validating interpreter; compiles to a quantsim `Strategy`, proven bitwise-identical to hand-written Python | 26 |
| **pathfinding-visualizer** | JS/Canvas | Interactive A*/Dijkstra/BFS/Greedy on a grid; zero deps; GitHub-Pages ready | — |
| **ratelimit-kit** | TypeScript | Token bucket / sliding window / fixed window limiters, zero deps | 10 |
| **gitglance** | Python | Terminal git analytics (punchcards, streaks, leaderboards), stdlib only | — |

**quantsim version history:** v0.1 (Monte Carlo) → v0.2 (backtesting + real data
via yfinance/Stooq) → v0.3 (unified: order book + execution model + live trading).

## Superseded projects (DO NOT recreate)

`orderbook-engine` (TS) and `papertrader` (Python) were built standalone, then
**absorbed into quantsim v0.3**. They were **never published as their own repos** —
they exist only as backups in the milp kit branch.

## milp repo (the working repo)

- Branch `claude/github-profile-recruiter-dee6g4` contains `github-profile-kit/` —
  full source backup of every project above, plus this HANDOFF.md.
- Default branch `claude/affectionate-meitner-govwz4` is the YNorth hackathon app
  (Next.js, uses `GEMINI_API_KEY` server-side; no key leaked in history).

## Git author rewrite (completed)

All commits across the account were rewritten from "Claude" → `hilothefunnydog123-coder`
(noreply email `229661712+hilothefunnydog123-coder@users.noreply.github.com`), and
`Co-Authored-By: Claude` trailers stripped, then force-pushed. Rewritten: milp (both
branches), **Nexus-finance (528 commits, 10 branches)**, neuro, Kidvestors, + the 8
new repos. Already clean: mcp-forge & neural-bg (authored "Neil Gilani" — UNRESOLVED:
confirm whether that is the user), bolt, Kidvestor, YNFINANCE(TERMINAL),
ynfinanceweb, ynfinance_web, apphost, Add-ynfinance.

## Outstanding manual to-dos (cannot be done via API — user must click)

1. **Pin repos** on profile: quantsim, exchange-simulator, quantlang, optionslab, mcp-forge, pathfinding-visualizer
2. **Set name / bio / avatar** at github.com/settings/profile
3. **Enable GitHub Pages** for pathfinding-visualizer (Settings → Pages → main, /root)
4. **Add descriptions + topics** to the new repos (About ⚙️)
5. Decide whether to unify "Neil Gilani" author on mcp-forge/neural-bg

## Other context

- **Nexus-finance** was made private by the user (their startup). Netlify deploy unaffected.
- **Gemini billing incident:** user disabled GCP billing after a ~$150 charge (suspected
  cause: grounded-search API calls on public endpoints). No key leaked in milp.
- Taught the user the underlying math (Black-Scholes/Greeks/binomial/Monte Carlo,
  kurtosis/autocorrelation/GBM, lexer/parser/AST) and how to use optionslab signals
  (IV rank, expected move, delta, Greeks) as a confluence checklist for options entries.
- User is NOT to be sold get-rich schemes; guidance has emphasized honest market
  realities, career capital over trading edge, and paper-trading before real money.
