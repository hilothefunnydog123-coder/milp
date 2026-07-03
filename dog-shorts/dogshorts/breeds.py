"""Curated catalog of cute dog breeds.

Every entry maps a human-friendly display name (spoken by the TTS voice and
shown as the on-screen caption) to the breed path used by the free dog.ceo
image API (https://dog.ceo/dog-api/documentation/breed).

dog.ceo addresses breeds as ``breed`` or ``breed/sub-breed`` (e.g.
``retriever/golden``). The ``api_path`` below is exactly that fragment.

The list is deliberately biased toward breeds that read as "cute" in a short:
fluffy, small, round-faced, or puppy-friendly. Feel free to add your own —
just make sure ``api_path`` matches a real dog.ceo breed.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Breed:
    """A single breed the generator can feature."""

    name: str           # Spoken + captioned, e.g. "Golden Retriever"
    api_path: str       # dog.ceo path, e.g. "retriever/golden"


# Hand-picked "cute" breeds. Ordered roughly small/fluffy first.
CUTE_BREEDS: list[Breed] = [
    Breed("Pomeranian",          "pomeranian"),
    Breed("Corgi",               "corgi/cardigan"),
    Breed("Shiba Inu",           "shiba"),
    Breed("Samoyed",             "samoyed"),
    Breed("Golden Retriever",    "retriever/golden"),
    Breed("Pembroke Corgi",      "pembroke"),
    Breed("Cavalier Spaniel",    "spaniel/blenheim"),
    Breed("Papillon",            "papillon"),
    Breed("Maltese",             "maltese"),
    Breed("Pug",                 "pug"),
    Breed("French Bulldog",      "bulldog/french"),
    Breed("Cockapoo",            "cockapoo"),
    Breed("Bichon Frise",        "frise/bichon"),
    Breed("Pekingese",           "pekinese"),
    Breed("Chihuahua",           "chihuahua"),
    Breed("Australian Shepherd", "australian/shepherd"),
    Breed("Border Collie",       "collie/border"),
    Breed("Bernese Mountain Dog","mountain/bernese"),
    Breed("Great Pyrenees",      "pyrenees"),
    Breed("Keeshond",            "keeshond"),
    Breed("Malamute",            "malamute"),
    Breed("Husky",               "husky"),
    Breed("Newfoundland",        "newfoundland"),
    Breed("Cotondetulear",       "cotondetulear"),
]


def pick(count: int, rng) -> list[Breed]:
    """Return ``count`` distinct random breeds using the provided RNG.

    A caller-supplied ``random.Random`` keeps runs reproducible when seeded and
    lets the batch agent vary the seed per video.
    """
    if count > len(CUTE_BREEDS):
        raise ValueError(
            f"Requested {count} breeds but only {len(CUTE_BREEDS)} are catalogued."
        )
    return rng.sample(CUTE_BREEDS, count)
