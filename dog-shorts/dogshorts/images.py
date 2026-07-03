"""Fetch a cute photo for a breed from the free dog.ceo API.

Network calls go through ``urllib`` so the only hard dependency is Pillow. The
sandbox this was authored in blocks dog.ceo, so :func:`fetch_breed_image`
falls back to a drawn placeholder card whenever the network is unavailable and
``allow_placeholder`` is set. On a normal machine the real photo is used.
"""

from __future__ import annotations

import json
import hashlib
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

from .breeds import Breed

_API = "https://dog.ceo/api/breed/{path}/images/random"
_UA = {"User-Agent": "dogshorts/1.0 (+https://github.com)"}


def _cache_path(cache_dir: Path, breed: Breed, url: str) -> Path:
    digest = hashlib.sha1(url.encode()).hexdigest()[:12]
    safe = breed.api_path.replace("/", "-")
    return cache_dir / f"{safe}-{digest}.jpg"


def _random_image_url(breed: Breed, timeout: float) -> str:
    req = urllib.request.Request(_API.format(path=breed.api_path), headers=_UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.load(resp)
    if payload.get("status") != "success" or not payload.get("message"):
        raise RuntimeError(f"dog.ceo returned no image for {breed.api_path}: {payload}")
    return payload["message"]


def _download(url: str, dest: Path, timeout: float) -> None:
    req = urllib.request.Request(url, headers=_UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
    dest.write_bytes(data)


def _placeholder(breed: Breed, dest: Path, size: int = 1080) -> None:
    """Draw a soft pastel card standing in for a real photo (offline mode)."""
    # Deterministic pastel per breed so repeated runs look consistent.
    h = int(hashlib.sha1(breed.name.encode()).hexdigest(), 16)
    r, g, b = 170 + h % 70, 170 + (h >> 8) % 70, 170 + (h >> 16) % 70
    img = Image.new("RGB", (size, size), (r, g, b))
    d = ImageDraw.Draw(img)
    # A simple friendly paw print so the card is obviously a stand-in.
    cx, cy, pad = size // 2, int(size * 0.56), size // 9
    d.ellipse([cx - pad, cy - pad, cx + pad, cy + pad], fill=(255, 255, 255))
    for dx, dy in [(-1.4, -1.3), (-0.5, -1.7), (0.5, -1.7), (1.4, -1.3)]:
        tx, ty, tr = cx + dx * pad, cy + dy * pad, pad * 0.45
        d.ellipse([tx - tr, ty - tr, tx + tr, ty + tr], fill=(255, 255, 255))
    img.save(dest, "JPEG", quality=90)


def fetch_breed_image(
    breed: Breed,
    cache_dir: Path,
    *,
    timeout: float = 15.0,
    allow_placeholder: bool = False,
) -> Path:
    """Return a local path to a JPG for ``breed``.

    Downloads a random dog.ceo photo (cached on disk). If the network is
    unreachable and ``allow_placeholder`` is true, a drawn placeholder is used
    instead so the pipeline still produces a video.
    """
    cache_dir.mkdir(parents=True, exist_ok=True)
    try:
        url = _random_image_url(breed, timeout)
        dest = _cache_path(cache_dir, breed, url)
        if not dest.exists():
            _download(url, dest, timeout)
        # Validate it actually decodes as an image.
        with Image.open(dest) as im:
            im.verify()
        return dest
    except Exception as exc:  # noqa: BLE001 - network/parse/decoding all fold to fallback
        if not allow_placeholder:
            raise RuntimeError(
                f"Could not fetch an image for {breed.name}: {exc}. "
                f"Pass allow_placeholder=True (or --offline) to use a stand-in card."
            ) from exc
        dest = cache_dir / f"placeholder-{breed.api_path.replace('/', '-')}.jpg"
        if not dest.exists():
            _placeholder(breed, dest)
        return dest
