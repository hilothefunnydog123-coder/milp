"""Generate YouTube upload metadata (title/description/tags) for a short.

Written next to each video as a ``.json`` sidecar so you (or an uploader
script) can publish without retyping. Deterministic given the breed list + RNG.
"""

from __future__ import annotations

import json
from pathlib import Path

from .breeds import Breed

_TITLE_TEMPLATES = [
    "What cute dog are you choosing? 🐶",
    "Pick your favorite puppy! 🐾",
    "Which cute dog is yours? 🐶💕",
    "Choose your dog! 🐾 #1, 2, 3 or 4?",
]

_HASHTAGS = [
    "#dogs", "#puppy", "#cutedogs", "#shorts", "#dogsofyoutube",
    "#doglover", "#puppylove", "#animals", "#cute", "#dogbreeds",
]


def build(breeds: list[Breed], rng) -> dict:
    title = rng.choice(_TITLE_TEMPLATES)
    names = ", ".join(b.name for b in breeds)
    lines = [
        "Which cute dog are you choosing? 🐶 Comment your number below! 👇",
        "",
        "Featured breeds:",
        *[f"  {i}. {b.name}" for i, b in enumerate(breeds, 1)],
        "",
        " ".join(_HASHTAGS),
    ]
    tags = [b.name for b in breeds] + [
        "cute dogs", "dog breeds", "puppy", "shorts", "which dog",
    ]
    return {
        "title": title,
        "description": "\n".join(lines),
        "tags": tags,
        "featured": names,
        "categoryId": "15",  # "Pets & Animals"
    }


def write_sidecar(meta: dict, video_path: Path) -> Path:
    dest = video_path.with_suffix(".json")
    dest.write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return dest
