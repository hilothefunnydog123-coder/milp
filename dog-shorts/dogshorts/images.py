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
_MANIFEST_PATH = Path(__file__).parent / "assets" / "manifest.json"


def _load_manifest() -> dict:
    try:
        return json.loads(_MANIFEST_PATH.read_text())
    except Exception:
        return {}


def _manifest_image(breed: Breed, cache_dir: Path, rng, timeout: float) -> Path | None:
    """Fetch a real photo from the bundled raw.githubusercontent manifest.

    Used when the live dog.ceo API can't be reached but GitHub raw can.
    Returns None if the breed isn't in the manifest.
    """
    manifest = _load_manifest()
    files = manifest.get(breed.api_path)
    if not files:
        return None
    base = manifest.get("_base", "").rstrip("/")
    rel = rng.choice(files) if rng is not None else files[0]
    url = f"{base}/{rel}"
    dest = _cache_path(cache_dir, breed, url)
    if not dest.exists():
        _download(url, dest, timeout)
    with Image.open(dest) as im:
        im.verify()
    return dest


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
    source: str = "auto",
    rng=None,
) -> Path:
    """Return a local path to a real JPG for ``breed``.

    ``source`` controls where the photo comes from:

    * ``auto``     – try the live dog.ceo API, then the bundled GitHub-raw
                     manifest, then (if allowed) a placeholder card.
    * ``dogceo``   – dog.ceo only.
    * ``manifest`` – bundled raw.githubusercontent manifest only (works where
                     dog.ceo is blocked but GitHub raw is reachable).

    With ``allow_placeholder`` a drawn stand-in is used if every real source
    fails, so the pipeline still produces a video (``--offline`` demo mode).
    """
    cache_dir.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []

    if source in ("auto", "dogceo"):
        try:
            url = _random_image_url(breed, timeout)
            dest = _cache_path(cache_dir, breed, url)
            if not dest.exists():
                _download(url, dest, timeout)
            with Image.open(dest) as im:
                im.verify()
            return dest
        except Exception as exc:  # noqa: BLE001
            errors.append(f"dog.ceo: {exc}")

    if source in ("auto", "manifest"):
        try:
            got = _manifest_image(breed, cache_dir, rng, timeout)
            if got is not None:
                return got
            errors.append("manifest: breed not listed")
        except Exception as exc:  # noqa: BLE001
            errors.append(f"manifest: {exc}")

    if allow_placeholder:
        dest = cache_dir / f"placeholder-{breed.api_path.replace('/', '-')}.jpg"
        if not dest.exists():
            _placeholder(breed, dest)
        return dest

    raise RuntimeError(
        f"Could not fetch an image for {breed.name} ({'; '.join(errors)}). "
        f"Try --source manifest, or --offline for a stand-in card."
    )
