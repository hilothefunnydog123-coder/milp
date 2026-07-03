"""Build one complete cute-dog-breeds short, end to end.

Pipeline: pick breeds -> fetch a photo per breed -> narrate the hook + each
breed name (+ its call-to-action) -> compose frames -> render/animate segments
-> concatenate.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from pathlib import Path

from . import breeds as breeds_mod
from . import frame, images, metadata, tts, video
from .ffbin import probe_duration


# Per-dog call-to-action: spoken line, on-screen chip label, and chip color.
# The 4th dog asks for all three at once. Fewer/more dogs cycle through these.
DEFAULT_CTAS: list[dict] = [
    {"say": "Subscribe for this one",     "chip": "SUBSCRIBE",              "color": (230, 33, 42)},
    {"say": "Like for this one",          "chip": "LIKE",                   "color": (33, 118, 243)},
    {"say": "Comment for this one",       "chip": "COMMENT",                "color": (46, 170, 90)},
    {"say": "Do all three for this one",  "chip": "SUBSCRIBE · LIKE · COMMENT", "color": (240, 165, 20)},
]


@dataclass
class ShortConfig:
    hook: str = "What cute dog are you choosing?"
    num_breeds: int = 4
    voice: str = "edge"            # edge | espeak | gtts | eleven | silent
    intro_seconds: float = 2.8     # minimum on-screen time for the hook card
    breed_seconds: float = 2.6     # minimum on-screen time per breed
    tail_seconds: float = 0.5      # breath of silence after each narration
    offline: bool = False          # placeholder images + silent narration
    source: str = "auto"           # image source: auto | dogceo | manifest
    ctas: list[dict] = field(default_factory=lambda: list(DEFAULT_CTAS))
    include: list[str] | None = None  # force these breed api_paths, in order
    seed: int | None = None


def _segment_duration(audio: Path, minimum: float, tail: float) -> float:
    try:
        spoken = probe_duration(str(audio))
    except Exception:
        spoken = minimum
    return round(max(minimum, spoken + tail), 3)


def _choose_breeds(cfg: ShortConfig, rng) -> list[breeds_mod.Breed]:
    if cfg.include:
        by_path = {b.api_path: b for b in breeds_mod.CUTE_BREEDS}
        chosen = []
        for path in cfg.include:
            if path not in by_path:
                raise ValueError(f"Unknown breed api_path in --include: {path}")
            chosen.append(by_path[path])
        return chosen
    return breeds_mod.pick(cfg.num_breeds, rng)


def generate_short(out_path: Path, cfg: ShortConfig, work_dir: Path) -> Path:
    rng = random.Random(cfg.seed)
    work_dir.mkdir(parents=True, exist_ok=True)
    cache = work_dir / "cache"

    # Offline demo mode forces stand-in art + silent narration so the pipeline
    # runs with no network at all.
    voice = "silent" if cfg.offline else cfg.voice
    chosen = _choose_breeds(cfg, rng)
    total_dogs = len(chosen)
    print(f"🐶 Featuring: {', '.join(b.name for b in chosen)}")

    segments: list[video.Segment] = []

    # --- Intro / hook -------------------------------------------------------
    intro_audio = tts.synthesize(
        cfg.hook, work_dir / "audio" / "intro",
        provider=voice, silent_seconds=cfg.intro_seconds,
    )
    intro_frame = frame.render_intro_frame(cfg.hook, work_dir / "frames" / "intro.png")
    segments.append(video.Segment(
        frame=intro_frame, audio=intro_audio,
        duration=_segment_duration(intro_audio, cfg.intro_seconds, cfg.tail_seconds),
        zoom_in=True,
    ))

    # When breeds are explicitly chosen we want the curated best photo per
    # breed (deterministic); otherwise vary the manifest pick per run.
    img_rng = None if cfg.include else rng

    # --- One segment per breed (with its call-to-action) --------------------
    for i, breed in enumerate(chosen, start=1):
        cta = cfg.ctas[(i - 1) % len(cfg.ctas)] if cfg.ctas else None
        photo = images.fetch_breed_image(
            breed, cache, allow_placeholder=cfg.offline,
            source=cfg.source, rng=img_rng,
        )
        spoken = f"{breed.name}. {cta['say']}." if cta else breed.name
        audio = tts.synthesize(
            spoken, work_dir / "audio" / f"breed{i}",
            provider=voice, silent_seconds=cfg.breed_seconds,
        )
        fr = frame.render_breed_frame(
            photo, breed.name, i, total_dogs,
            work_dir / "frames" / f"breed{i}.png",
            cta_label=cta["chip"] if cta else None,
            cta_color=cta["color"] if cta else (230, 33, 42),
        )
        segments.append(video.Segment(
            frame=fr, audio=audio,
            duration=_segment_duration(audio, cfg.breed_seconds, cfg.tail_seconds),
            zoom_in=(i % 2 == 1),
        ))

    # --- Render + concat ----------------------------------------------------
    seg_dir = work_dir / "segments"
    rendered = []
    for idx, seg in enumerate(segments):
        rendered.append(video.render_segment(seg, seg_dir / f"seg{idx}.mp4"))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    video.concat(rendered, out_path, work_dir)

    # YouTube upload metadata alongside the video.
    meta = metadata.build(chosen, rng)
    metadata.write_sidecar(meta, out_path)

    total = sum(s.duration for s in segments)
    print(f"✅ {out_path}  (~{total:.1f}s, {len(segments)} scenes)")
    return out_path
