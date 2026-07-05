# 🚀 GitHub Profile Kit

Everything needed to level up [github.com/hilothefunnydog123-coder](https://github.com/hilothefunnydog123-coder) for recruiters: a polished profile README plus **four new, complete, working projects**, each with its own README, MIT license, and tests where applicable.

## What's inside

| Folder | Becomes repo | What it is |
|---|---|---|
| `profile/` | `hilothefunnydog123-coder` | Profile README — animated banner, tech-stack badges, featured-projects table, GitHub stats cards |
| `projects/pathfinding-visualizer/` | `pathfinding-visualizer` | Interactive A*/Dijkstra/BFS/Greedy visualizer — vanilla JS + Canvas, zero deps, GitHub-Pages ready |
| `projects/quantsim/` | `quantsim` | Monte Carlo market simulator — GBM paths, VaR/CVaR, Sharpe, max drawdown; Python + NumPy, pytest suite |
| `projects/ratelimit-kit/` | `ratelimit-kit` | Token bucket / sliding window / fixed window rate limiters — zero-dep TypeScript library with a vitest suite |
| `projects/gitglance/` | `gitglance` | Terminal git analytics — punchcard heatmap, streaks, leaderboards; pure Python stdlib, single file |

## How to publish (one command)

On your own machine, with the [GitHub CLI](https://cli.github.com) installed and logged in (`gh auth login`):

```bash
git clone -b claude/github-profile-recruiter-dee6g4 https://github.com/hilothefunnydog123-coder/milp.git
cd milp/github-profile-kit
bash publish.sh
```

The script creates each public repo (skipping any that already exist), pushes the content, adds discoverability topics, and enables GitHub Pages for the visualizer so you get a live demo link.

**Alternatively:** create the five empty repos on github.com yourself, then ask Claude to push the content — or push each folder manually.

## Final polish checklist (2 minutes, big recruiter impact)

- [ ] **Pin your six best repos** on your profile page → "Customize your pins". Suggested: `mcp-forge`, `quantsim`, `pathfinding-visualizer`, `ratelimit-kit`, `neural-bg`, `gitglance`
- [ ] **Add your real name, bio and a photo/avatar** at [github.com/settings/profile](https://github.com/settings/profile). Recruiters search by name — a codename-only profile is much harder to find and trust. Suggested bio: *"Full-stack developer — fintech, AI developer tooling & interactive web."*
- [ ] The profile README includes your email as a contact badge — edit `profile/README.md` if you'd rather not show it publicly
- [ ] Consider archiving near-duplicate repos (`Kidvestor` vs `Kidvestors`, `ynfinanceweb` vs `ynfinance_web`) so the repo list looks curated
- [ ] Add descriptions to older repos that are missing them (`Nexus-finance`, `YNFINANCETERMINAL`, …) — one sentence each
