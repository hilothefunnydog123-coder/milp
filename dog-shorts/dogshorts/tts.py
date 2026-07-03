"""Pluggable text-to-speech with a soft default voice.

Providers (choose with ``--voice`` / ``DOGSHORTS_TTS``):

* ``edge``   – Microsoft Edge neural voices via the free ``edge-tts`` package.
               No API key. Default voice is a soft, warm female neural voice.
* ``gtts``   – Google Translate TTS via ``gTTS``. No key, simpler/robotic.
* ``eleven`` – ElevenLabs (set ``ELEVENLABS_API_KEY``). Highest quality.
* ``silent`` – Fixed-length silence. Offline; used by ``--offline`` demo mode.

Each provider writes an audio file and returns its path. Callers probe the
duration separately (see :mod:`dogshorts.ffbin`) so timing stays accurate to
the actual speech.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from . import ffbin

# Soft, gentle-sounding defaults per provider.
SOFT_EDGE_VOICE = os.environ.get("DOGSHORTS_EDGE_VOICE", "en-US-AnaNeural")
SOFT_ELEVEN_VOICE = os.environ.get("DOGSHORTS_ELEVEN_VOICE", "Rachel")


def synthesize(
    text: str,
    dest: Path,
    *,
    provider: str = "edge",
    rate: str = "-8%",
    silent_seconds: float = 2.4,
) -> Path:
    """Render ``text`` to speech at ``dest`` and return the path.

    ``rate`` slows edge-tts slightly for a softer, calmer delivery.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    if provider == "edge":
        return _edge(text, dest, rate)
    if provider == "gtts":
        return _gtts(text, dest)
    if provider == "eleven":
        return _eleven(text, dest)
    if provider == "silent":
        return _silent(dest, silent_seconds)
    raise ValueError(f"Unknown TTS provider: {provider!r}")


def _edge(text: str, dest: Path, rate: str) -> Path:
    try:
        import edge_tts
    except ImportError as exc:
        raise RuntimeError(
            "edge-tts not installed. `pip install edge-tts` or pick another "
            "--voice provider."
        ) from exc

    async def _go() -> None:
        communicate = edge_tts.Communicate(text, SOFT_EDGE_VOICE, rate=rate)
        await communicate.save(str(dest))

    asyncio.run(_go())
    if not dest.exists() or dest.stat().st_size == 0:
        raise RuntimeError(f"edge-tts produced no audio for {text!r}")
    return dest


def _gtts(text: str, dest: Path) -> Path:
    try:
        from gtts import gTTS
    except ImportError as exc:
        raise RuntimeError("gTTS not installed. `pip install gTTS`.") from exc
    gTTS(text=text, lang="en", slow=False).save(str(dest))
    return dest


def _eleven(text: str, dest: Path) -> Path:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set for --voice eleven.")
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError as exc:
        raise RuntimeError("elevenlabs not installed. `pip install elevenlabs`.") from exc
    client = ElevenLabs(api_key=key)
    audio = client.text_to_speech.convert(
        voice_id=SOFT_ELEVEN_VOICE,
        model_id="eleven_multilingual_v2",
        text=text,
        output_format="mp3_44100_128",
    )
    with open(dest, "wb") as fh:
        for chunk in audio:
            if chunk:
                fh.write(chunk)
    return dest


def _silent(dest: Path, seconds: float) -> Path:
    ffbin.run([
        "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
        "-t", f"{seconds:.3f}", "-c:a", "libmp3lame", "-b:a", "128k",
        str(dest),
    ])
    return dest
