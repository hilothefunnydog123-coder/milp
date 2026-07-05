# 🔍 gitglance

Beautiful git analytics in your terminal. Point it at any local repository and get a **commit punchcard heatmap**, **streak tracking**, an **author leaderboard**, the **most-changed files**, and a **file-type breakdown** — instantly.

**Pure Python standard library.** Zero dependencies. One file.

## 🚀 Quickstart

```bash
pip install git+https://github.com/hilothefunnydog123-coder/gitglance.git
gitglance ~/code/my-project
```

Or skip the install entirely — it's a single file:

```bash
curl -O https://raw.githubusercontent.com/hilothefunnydog123-coder/gitglance/main/gitglance.py
python3 gitglance.py .
```

## 📸 What you get

```
▌ Overview — .
  1,204 commits by 3 author(s)
  Jan 04, 2025 → Jul 05, 2026  (547 days, 2.20 commits/day)

▌ Punchcard — when do commits happen?
        0 2 4 6 8 10121416182022
  Mon      ░░   ░▒▓█▓▒░░▒▒░
  Tue        ░  ░▒▒▓▓▒░ ░░
  Wed      ░    ░▒█▓▒▒░░░▒░
  ...
  peak: Mon 14:00 with 31 commits

▌ Streaks
  longest: 23 day(s) (ended Mar 12, 2026)
  current: 4 day(s)

▌ Author leaderboard
  1. dev-one     ██████████████████ 812 (67%)
  2. dev-two     ██████ 301 (25%)

▌ Most-changed files
  src/app.ts        214 changes
  README.md         88 changes
```

## 🧰 Options

```
gitglance [repo] [--since "6 months ago"] [--no-color]
```

- `repo` — path to any local git repository (defaults to the current directory)
- `--since` — anything `git log --since` understands: `"2 weeks ago"`, `2026-01-01`, …
- `--no-color` — plain output for piping to files (also auto-detected)

## 💡 Why

`git log` has all of this information; it just doesn't *show* it. gitglance parses one `git log --name-only` invocation and renders the story of a repository — when the team actually works, who ships what, and which files are hotspots — with nothing but ANSI escape codes and Unicode blocks.

## 📄 License

MIT
