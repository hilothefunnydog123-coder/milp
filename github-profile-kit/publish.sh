#!/usr/bin/env bash
# Publishes the profile README and every project in ./projects as its own
# public GitHub repository under your account.
#
# Requirements:
#   - git
#   - GitHub CLI (https://cli.github.com), authenticated: `gh auth login`
#
# Usage:
#   bash publish.sh
#
# Safe to re-run: existing repos are kept and their main branch is updated.

set -euo pipefail
cd "$(dirname "$0")"

command -v gh >/dev/null 2>&1 || {
  echo "error: the GitHub CLI (gh) is required — install from https://cli.github.com and run 'gh auth login'" >&2
  exit 1
}

USER=$(gh api user -q .login)
echo "Publishing as: $USER"
echo

publish() {
  local dir="$1" name="$2" desc="$3" topics="$4"
  echo "==> $USER/$name"

  if gh repo view "$USER/$name" >/dev/null 2>&1; then
    echo "    repo exists — updating content"
  else
    gh repo create "$USER/$name" --public --description "$desc"
  fi

  local tmp
  tmp=$(mktemp -d)
  cp -R "$dir/." "$tmp/"
  (
    cd "$tmp"
    git init -q -b main
    git add -A
    git commit -qm "Initial commit"
    git remote add origin "https://github.com/$USER/$name.git"
    git push -quf origin main
  )
  rm -rf "$tmp"

  if [ -n "$topics" ]; then
    # shellcheck disable=SC2046
    gh repo edit "$USER/$name" $(printf -- '--add-topic %s ' ${topics//,/ }) >/dev/null || true
  fi
  echo "    done: https://github.com/$USER/$name"
}

publish profile "$USER" \
  "My GitHub profile" ""

publish projects/pathfinding-visualizer pathfinding-visualizer \
  "🧭 Interactive pathfinding visualizer — watch A*, Dijkstra, BFS & Greedy Best-First race across a grid you draw. Vanilla JS + Canvas, zero dependencies." \
  "algorithms,visualization,javascript,canvas,astar,dijkstra,pathfinding"

publish projects/quantsim quantsim \
  "📈 Monte Carlo market simulator — GBM price paths, VaR/CVaR, Sharpe & max-drawdown analytics with terminal histograms. Python + NumPy." \
  "python,numpy,monte-carlo,quantitative-finance,simulation,risk-management,cli"

publish projects/ratelimit-kit ratelimit-kit \
  "🚦 Token bucket, sliding window & fixed window rate limiters in one zero-dependency TypeScript library — fully tested, framework-agnostic." \
  "typescript,rate-limiting,token-bucket,sliding-window,library,zero-dependencies"

publish projects/gitglance gitglance \
  "🔍 Beautiful git analytics in your terminal — commit punchcards, streaks, top files & author leaderboards. Pure Python stdlib, zero dependencies." \
  "python,git,cli,analytics,terminal,developer-tools,zero-dependencies"

# Host the visualizer on GitHub Pages so the README can link a live demo
gh api -X POST "repos/$USER/pathfinding-visualizer/pages" \
  -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
  && echo && echo "GitHub Pages enabled: https://$USER.github.io/pathfinding-visualizer/" \
  || true

echo
echo "All done! Final touches (manual, ~2 minutes):"
echo "  1. Pin your best repos:  https://github.com/$USER  →  'Customize your pins'"
echo "     Suggested: mcp-forge, quantsim, pathfinding-visualizer, ratelimit-kit, neural-bg, gitglance"
echo "  2. Set your name, bio & avatar:  https://github.com/settings/profile"
echo "     Suggested bio: 'Full-stack developer — fintech, AI developer tooling & interactive web.'"
