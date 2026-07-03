"""Build one complete cute-dog-breeds short, end to end.

Pipeline: pick breeds -> fetch a photo per breed -> narrate the hook + each
breed name -> compose frames -> render/animate segments -> concatenate.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from pathlib import Path

from . import breeds as breeds_mod
from . import frame, images, metadata, tts, video
from .ffbin import probe_duration


@dataclass
class ShortConfig:
    hook: str = "What cute dog are you choosing?"
    num_breeds: int = 4
    voice: str = "edge"            # edge | gtts | eleven | silent
    intro_seconds: float = 2.8     # minimum on-screen time for the hook card
    breed_seconds: float = 2.6     # minimum on-screen time per breed
    tail_seconds: float = 0.5      # breath of silence after each narration
    offline: bool = False          # placeholder images + silent narration
    seed: int | None = None


def _segment_duration(audio: Path, minimum: float, tail: float) -> float:
    try:
        spoken = probe_duration(str(audio))
    except Exception:
        spoken = minimum
    return round(max(minimum, spoken + tail), 3)


def generate_short(out_path: Path, cfg: ShortConfig, work_dir: Path) -> Path:
    rng = random.Random(cfg.seed)
    work_dir.mkdir(parents=True, exist_ok=True)
    cache = work_dir / "cache"

    # Offline demo mode forces stand-in art + silent narration so the pipeline
    # runs with no network at all.
    voice = "silent" if cfg.offline else cfg.voice
    chosen = breeds_mod.pick(cfg.num_breeds, rng)
    print(f"🐶 Featuring: {', '.join(b.name for b in chosen)}")

    segments: list[video.Segment] = []

    # --- Intro / hook -------------------------------------------------------
    intro_audio = tts.synthesize(
        cfg.hook, work_dir / "audio" / "intro.mp3",
        provider=voice, silent_seconds=cfg.intro_seconds,
    )
    intro_frame = frame.render_intro_frame(cfg.hook, work_dir / "frames" / "intro.png")
    segments.append(video.Segment(
        frame=intro_frame, audio=intro_audio,
        duration=_segment_duration(intro_audio, cfg.intro_seconds, cfg.tail_seconds),
        zoom_in=True,
    ))

    # --- One segment per breed ---------------------------------------------
    for i, breed in enumerate(chosen, start=1):
        photo = images.fetch_breed_image(
            breed, cache, allow_placeholder=cfg.offline,
        )
        audio = tts.synthesize(
            breed.name, work_dir / "audio" / f"breed{i}.mp3",
            provider=voice, silent_seconds=cfg.breed_seconds,
        )
        fr = frame.render_breed_frame(
            photo, breed.name, i, cfg.num_breeds,
            work_dir / "frames" / f"breed{i}.png",
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
