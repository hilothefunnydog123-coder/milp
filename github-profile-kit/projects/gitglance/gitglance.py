#!/usr/bin/env python3
"""gitglance — beautiful git analytics in your terminal.

Commit punchcards, streaks, top files and author leaderboards for any local
repository. Pure standard library: no dependencies, one file.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import subprocess
import sys

SEP = "\x1f"
SHADES = " ░▒▓█"
WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

USE_COLOR = True


def c(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m" if USE_COLOR else text


def bold(text: str) -> str:
    return c("1", text)


def header(text: str) -> str:
    return c("1;36", f"\n▌ {text}")


def dim(text: str) -> str:
    return c("2", text)


def run_git_log(repo: str, since: str | None) -> str:
    cmd = ["git", "-C", repo, "log", f"--pretty=format:{SEP}%an{SEP}%at", "--name-only"]
    if since:
        cmd.append(f"--since={since}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"gitglance: git failed for {repo!r}: {result.stderr.strip()}")
    return result.stdout


def parse_log(raw: str) -> list[dict]:
    """Parse `git log --name-only` output into commit dicts."""
    commits: list[dict] = []
    for line in raw.splitlines():
        if line.startswith(SEP):
            _, author, timestamp = line.split(SEP)
            commits.append(
                {
                    "author": author,
                    "when": dt.datetime.fromtimestamp(int(timestamp)),
                    "files": [],
                }
            )
        elif line.strip() and commits:
            commits[-1]["files"].append(line.strip())
    return commits


def print_overview(commits: list[dict], repo: str) -> None:
    first = min(commit["when"] for commit in commits)
    last = max(commit["when"] for commit in commits)
    authors = {commit["author"] for commit in commits}
    span_days = max(1, (last - first).days)
    print(header(f"Overview — {repo}"))
    print(f"  {bold(f'{len(commits):,}')} commits by {bold(str(len(authors)))} author(s)")
    print(f"  {first:%b %d, %Y} → {last:%b %d, %Y}  "
          + dim(f"({span_days} days, {len(commits) / span_days:.2f} commits/day)"))


def print_punchcard(commits: list[dict]) -> None:
    counts = collections.Counter((commit["when"].weekday(), commit["when"].hour) for commit in commits)
    top = max(counts.values(), default=1)
    print(header("Punchcard — when do commits happen?"))
    print(dim("        " + "".join(f"{h:<2}" for h in range(0, 24, 2))))
    for weekday in range(7):
        row = ""
        for hour in range(24):
            level = counts.get((weekday, hour), 0) / top
            row += SHADES[min(len(SHADES) - 1, int(level * (len(SHADES) - 1) + (0.999 if level else 0)))]
        print(f"  {WEEKDAYS[weekday]}  {c('32', row)}")
    busiest = counts.most_common(1)
    if busiest:
        (weekday, hour), n = busiest[0]
        print(dim(f"  peak: {WEEKDAYS[weekday]} {hour:02d}:00 with {n} commits"))


def print_streaks(commits: list[dict]) -> None:
    days = sorted({commit["when"].date() for commit in commits})
    longest = current = 1
    longest_end = days[0]
    for prev, cur in zip(days, days[1:]):
        current = current + 1 if (cur - prev).days == 1 else 1
        if current > longest:
            longest, longest_end = current, cur
    today = dt.date.today()
    active = 0
    if days and (today - days[-1]).days <= 1:
        active = 1
        for prev, cur in zip(reversed(days[:-1]), reversed(days[1:])):
            if (cur - prev).days == 1:
                active += 1
            else:
                break
    print(header("Streaks"))
    print(f"  longest: {bold(f'{longest} day(s)')} " + dim(f"(ended {longest_end:%b %d, %Y})"))
    print(f"  current: {bold(f'{active} day(s)')}")
    print(f"  active days total: {bold(f'{len(days):,}')}")


def print_authors(commits: list[dict], limit: int = 8) -> None:
    counts = collections.Counter(commit["author"] for commit in commits)
    total = len(commits)
    print(header("Author leaderboard"))
    for rank, (author, n) in enumerate(counts.most_common(limit), 1):
        bar = "█" * max(1, round(n / total * 30))
        print(f"  {rank}. {author:<24} {c('35', bar)} {n:,} " + dim(f"({n / total:.0%})"))


def print_top_files(commits: list[dict], limit: int = 8) -> None:
    counts = collections.Counter(f for commit in commits for f in commit["files"])
    if not counts:
        return
    top = counts.most_common(limit)
    widest = max(len(path) for path, _ in top)
    print(header("Most-changed files"))
    for path, n in top:
        print(f"  {path:<{widest}}  " + c("33", f"{n:,} changes"))


def print_languages(commits: list[dict], limit: int = 6) -> None:
    counts: collections.Counter[str] = collections.Counter()
    for commit in commits:
        for path in commit["files"]:
            if "." in path.rsplit("/", 1)[-1]:
                counts["." + path.rsplit(".", 1)[-1].lower()] += 1
    if not counts:
        return
    total = sum(counts.values())
    print(header("File types touched"))
    for ext, n in counts.most_common(limit):
        bar = "█" * max(1, round(n / total * 30))
        print(f"  {ext:<8} {c('34', bar)} " + dim(f"{n / total:.0%}"))


def main(argv: list[str] | None = None) -> None:
    global USE_COLOR
    parser = argparse.ArgumentParser(
        prog="gitglance",
        description="Beautiful git analytics in your terminal — zero dependencies.",
    )
    parser.add_argument("repo", nargs="?", default=".", help="path to a git repository (default: .)")
    parser.add_argument("--since", help='limit history, e.g. "6 months ago" or 2026-01-01')
    parser.add_argument("--no-color", action="store_true", help="disable ANSI colors")
    args = parser.parse_args(argv)
    USE_COLOR = not args.no_color and sys.stdout.isatty()

    commits = parse_log(run_git_log(args.repo, args.since))
    if not commits:
        sys.exit("gitglance: no commits found")

    print_overview(commits, args.repo)
    print_punchcard(commits)
    print_streaks(commits)
    print_authors(commits)
    print_top_files(commits)
    print_languages(commits)
    print()


if __name__ == "__main__":
    main()
