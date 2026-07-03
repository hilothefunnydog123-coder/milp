"""Thin wrapper around the ffmpeg binary.

We use the static ffmpeg shipped by the ``imageio-ffmpeg`` wheel so no system
install is required (it works fully offline once pip-installed). If a system
ffmpeg is preferred, set ``DOGSHORTS_FFMPEG=/path/to/ffmpeg``.
"""

from __future__ import annotations

import os
import re
import subprocess
from functools import lru_cache


@lru_cache(maxsize=1)
def ffmpeg_exe() -> str:
    override = os.environ.get("DOGSHORTS_FFMPEG")
    if override:
        return override
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(
            "No ffmpeg available. Install with `pip install imageio-ffmpeg` "
            "or set DOGSHORTS_FFMPEG to a system ffmpeg."
        ) from exc


def run(args: list[str]) -> None:
    """Run ffmpeg with ``args`` (excluding the binary itself). Raises on failure."""
    cmd = [ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y", *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed ({proc.returncode}):\n{' '.join(cmd)}\n{proc.stderr}"
        )


_DUR_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)")


def probe_duration(path: str) -> float:
    """Return media duration in seconds by parsing ffmpeg's own report.

    ffprobe is not bundled with imageio-ffmpeg, so we read ``ffmpeg -i`` output.
    """
    proc = subprocess.run(
        [ffmpeg_exe(), "-hide_banner", "-i", path],
        capture_output=True, text=True,
    )
    m = _DUR_RE.search(proc.stderr)
    if not m:
        raise RuntimeError(f"Could not read duration of {path}:\n{proc.stderr}")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)
