"""The 'again and again' agent: produce a stream of unique shorts.

Each run varies the seed so the four featured breeds (and the title) differ,
while the format — hook question, soft voice, 4 dogs, ~15s — stays identical.
Files are timestamp-free and numbered so a scheduler can call this repeatedly.
"""

from __future__ import annotations

import shutil
from dataclasses import replace
from pathlib import Path

from .generate import ShortConfig, generate_short


def _next_index(out_dir: Path) -> int:
    existing = sorted(out_dir.glob("dogshort-*.mp4"))
    if not existing:
        return 1
    nums = [int(p.stem.split("-")[-1]) for p in existing if p.stem.split("-")[-1].isdigit()]
    return (max(nums) + 1) if nums else 1


def run_batch(count: int, out_dir: Path, cfg: ShortConfig,
              *, keep_work: bool = False) -> list[Path]:
    """Generate ``count`` shorts into ``out_dir`` and return their paths."""
    out_dir.mkdir(parents=True, exist_ok=True)
    start = _next_index(out_dir)
    made: list[Path] = []

    for offset in range(count):
        n = start + offset
        # Derive a distinct-but-reproducible seed per video.
        seed = cfg.seed + n if cfg.seed is not None else n * 7919
        run_cfg = replace(cfg, seed=seed)
        out = out_dir / f"dogshort-{n:04d}.mp4"
        work = out_dir / f".work-{n:04d}"
        print(f"\n── Short {offset + 1}/{count}  →  {out.name} ──")
        try:
            generate_short(out, run_cfg, work)
            made.append(out)
        finally:
            if not keep_work and work.exists():
                shutil.rmtree(work, ignore_errors=True)
    return made
