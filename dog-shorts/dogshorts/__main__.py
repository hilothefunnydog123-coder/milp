"""Command-line entry point.

Examples
--------
Make one short:
    python -m dogshorts --out out/short.mp4

Batch of 5 unique shorts (the "again and again" agent):
    python -m dogshorts --count 5 --out-dir out

No-network smoke test (placeholder art + silent narration):
    python -m dogshorts --offline --out out/demo.mp4
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from .agent import run_batch
from .generate import ShortConfig, generate_short


def _config_from_args(args) -> ShortConfig:
    return ShortConfig(
        hook=args.hook,
        num_breeds=args.breeds,
        voice=args.voice,
        offline=args.offline,
        source=args.source,
        include=args.include.split(",") if args.include else None,
        seed=args.seed,
    )


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="dogshorts",
        description="Generate cute-dog-breed YouTube Shorts.",
    )
    p.add_argument("--out", type=Path, default=Path("out/short.mp4"),
                   help="Output path for a single video (default: out/short.mp4).")
    p.add_argument("--count", type=int, default=1,
                   help="How many shorts to make. >1 writes to --out-dir.")
    p.add_argument("--out-dir", type=Path, default=Path("out"),
                   help="Directory for batch output (used when --count > 1).")
    p.add_argument("--breeds", type=int, default=4,
                   help="Dogs per short (default: 4).")
    p.add_argument("--hook", default="What cute dog are you choosing?",
                   help="Opening spoken question.")
    p.add_argument("--voice", default="edge",
                   choices=["edge", "espeak", "gtts", "eleven", "silent"],
                   help="TTS provider (default: edge, a soft neural voice; "
                        "espeak works fully offline).")
    p.add_argument("--source", default="auto",
                   choices=["auto", "dogceo", "manifest"],
                   help="Photo source (default: auto — dog.ceo, then bundled "
                        "GitHub-raw manifest).")
    p.add_argument("--include", default=None,
                   help="Force specific breeds by api_path, comma-separated and "
                        "in order (e.g. 'pomeranian,samoyed,shiba,pug').")
    p.add_argument("--offline", action="store_true",
                   help="Placeholder art + silent narration; no network needed.")
    p.add_argument("--seed", type=int, default=None,
                   help="Seed the breed picker for reproducible output.")
    p.add_argument("--keep-work", action="store_true",
                   help="Keep the intermediate work directory for debugging.")
    args = p.parse_args(argv)

    cfg = _config_from_args(args)

    if args.count > 1:
        paths = run_batch(args.count, args.out_dir, cfg, keep_work=args.keep_work)
        print(f"\n🎬 Made {len(paths)} shorts in {args.out_dir}/")
        return 0

    work = args.out.parent / f".work-{args.out.stem}"
    try:
        generate_short(args.out, cfg, work)
    finally:
        if not args.keep_work and work.exists():
            shutil.rmtree(work, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
