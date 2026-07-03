"""Assemble still frames + narration into a vertical Shorts MP4.

Each segment is a single frame animated with a gentle Ken Burns zoom over its
narration (plus a short breath of silence after), then all segments are
concatenated into one 1080x1920 / 30fps H.264 file ready for YouTube Shorts.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from . import ffbin

FPS = 30
W, H = 1080, 1920


@dataclass
class Segment:
    frame: Path        # composed PNG
    audio: Path        # narration audio
    duration: float    # seconds this segment is on screen
    zoom_in: bool      # Ken Burns direction


def _zoompan(duration: float, zoom_in: bool, max_zoom: float = 1.12) -> str:
    frames = max(1, round(duration * FPS))
    step = (max_zoom - 1.0) / frames
    if zoom_in:
        z = f"min(zoom+{step:.6f},{max_zoom})"
    else:
        # Classic zoom-out: first frame (zoom==1) jumps to max, then eases down.
        z = f"if(lte(zoom,1.0),{max_zoom},max(zoom-{step:.6f},1.0))"
    # Pre-scale ~1.2x so zoompan never upscales the source (keeps it crisp).
    return (
        f"scale={int(W*1.25)}:{int(H*1.25)},"
        f"zoompan=z='{z}':d={frames}"
        f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":s={W}x{H}:fps={FPS},format=yuv420p"
    )


def render_segment(seg: Segment, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    filtr = (
        f"[0:v]{_zoompan(seg.duration, seg.zoom_in)}[v];"
        f"[1:a]aresample=44100,apad[a]"
    )
    ffbin.run([
        "-loop", "1", "-i", str(seg.frame),
        "-i", str(seg.audio),
        "-filter_complex", filtr,
        "-map", "[v]", "-map", "[a]",
        "-t", f"{seg.duration:.3f}",
        "-c:v", "libx264", "-profile:v", "high", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
        "-movflags", "+faststart",
        str(dest),
    ])
    return dest


def concat(segments: list[Path], dest: Path, work_dir: Path) -> Path:
    """Join rendered segment MP4s into the final short."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    listing = work_dir / "concat.txt"
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in segments))
    # Re-encode on concat: robust across segments regardless of tiny header diffs.
    ffbin.run([
        "-f", "concat", "-safe", "0", "-i", str(listing),
        "-c:v", "libx264", "-profile:v", "high", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
        "-movflags", "+faststart",
        str(dest),
    ])
    return dest
