"""Pluggable text-to-speech with a soft default voice.

Providers (choose with ``--voice`` / ``DOGSHORTS_TTS``):

* ``edge``   – Microsoft Edge neural voices via the free ``edge-tts`` package.
               No API key. Soft, warm female neural voice. (Best quality.)
* ``espeak`` – Fully offline neural-free speech via the bundled ``espeak-ng``
               library (``espeakng-loader``). No network, no model download —
               works anywhere. Softened with a lower pitch and slower rate.
* ``gtts``   – Google Translate TTS via ``gTTS``. No key, more robotic.
* ``eleven`` – ElevenLabs (set ``ELEVENLABS_API_KEY``). Highest quality.
* ``silent`` – Fixed-length silence. Offline; used by ``--offline`` demo mode.

Each provider writes an audio file and returns its actual path (the extension
depends on the provider). Callers probe the duration separately (see
:mod:`dogshorts.ffbin`) so timing stays accurate to the real speech.
"""

from __future__ import annotations

import asyncio
import os
import wave
from pathlib import Path

from . import ffbin

# Soft, gentle-sounding defaults per provider.
SOFT_EDGE_VOICE = os.environ.get("DOGSHORTS_EDGE_VOICE", "en-US-AnaNeural")
SOFT_ELEVEN_VOICE = os.environ.get("DOGSHORTS_ELEVEN_VOICE", "Rachel")
SOFT_ESPEAK_VOICE = os.environ.get("DOGSHORTS_ESPEAK_VOICE", "en-us+f3")

_MP3 = {"edge", "gtts", "eleven"}


def synthesize(
    text: str,
    stem: Path,
    *,
    provider: str = "edge",
    rate: str = "-8%",
    silent_seconds: float = 2.4,
) -> Path:
    """Render ``text`` to speech next to ``stem`` and return the written path.

    ``stem`` is a path without extension; the provider picks ``.mp3`` or
    ``.wav``. ``rate`` slows edge-tts slightly for a softer, calmer delivery.
    """
    stem.parent.mkdir(parents=True, exist_ok=True)
    suffix = ".mp3" if provider in _MP3 else ".wav"
    dest = stem.with_suffix(suffix)
    if provider == "edge":
        return _edge(text, dest, rate)
    if provider == "espeak":
        return _espeak(text, dest)
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
            "--voice provider (e.g. espeak, which needs no network)."
        ) from exc

    async def _go() -> None:
        communicate = edge_tts.Communicate(text, SOFT_EDGE_VOICE, rate=rate)
        await communicate.save(str(dest))

    asyncio.run(_go())
    if not dest.exists() or dest.stat().st_size == 0:
        raise RuntimeError(f"edge-tts produced no audio for {text!r}")
    return dest


# --- Offline espeak-ng via ctypes ------------------------------------------
# espeakng-loader ships libespeak-ng + its data, so this runs with no network
# and nothing installed system-wide. We drive the C API directly and capture
# PCM through the synth callback (no audio device needed).

_ESPEAK_RATE = int(os.environ.get("DOGSHORTS_ESPEAK_RATE", "142"))   # wpm; calm
_ESPEAK_PITCH = int(os.environ.get("DOGSHORTS_ESPEAK_PITCH", "58"))  # <50 lower


def _espeak(text: str, dest: Path) -> Path:
    import ctypes
    try:
        import espeakng_loader
    except ImportError as exc:
        raise RuntimeError(
            "espeak provider needs `pip install espeakng-loader`."
        ) from exc

    lib = ctypes.CDLL(espeakng_loader.get_library_path())
    data_parent = os.path.dirname(espeakng_loader.get_data_path())

    AUDIO_OUTPUT_SYNCHRONOUS = 0x02
    rate = lib.espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, data_parent.encode(), 0)
    if rate <= 0:
        raise RuntimeError("espeak_Initialize failed")

    pcm = bytearray()
    CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short),
                          ctypes.c_int, ctypes.c_void_p)

    def _cb(wav, n, events):  # noqa: ANN001
        if n > 0:
            pcm.extend(ctypes.string_at(wav, n * 2))
        return 0

    c_cb = CB(_cb)
    lib.espeak_SetSynthCallback(c_cb)
    lib.espeak_SetVoiceByName(SOFT_ESPEAK_VOICE.encode())
    lib.espeak_SetParameter(1, _ESPEAK_RATE, 0)   # espeakRATE
    lib.espeak_SetParameter(3, _ESPEAK_PITCH, 0)  # espeakPITCH
    lib.espeak_SetParameter(2, 100, 0)            # espeakVOLUME

    payload = text.encode("utf-8")
    espeakCHARS_UTF8 = 1
    lib.espeak_Synth(payload, len(payload) + 1, 0, 0, 0, espeakCHARS_UTF8, None, None)
    lib.espeak_Synchronize()
    lib.espeak_Terminate()

    with wave.open(str(dest), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(bytes(pcm))
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
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", f"{seconds:.3f}", "-c:a", "libmp3lame", "-b:a", "128k",
        str(dest),
    ])
    return dest
