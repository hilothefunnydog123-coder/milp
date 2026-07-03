# 🐶 dogshorts

An agent that cranks out the **same style of cute-dog YouTube Short, again and
again**. Every video follows one template:

1. A soft voice asks **"What cute dog are you choosing?"** over a title card.
2. Then, one at a time, **4 cute dog breeds** — each a full-screen photo with
   the breed name spoken in a soft voice and shown as a big caption (`1/4`,
   `2/4`, …), plus a **per-dog call-to-action**:
   - dog 1 → **Subscribe** · dog 2 → **Like** · dog 3 → **Comment** ·
     dog 4 → **do all three** (spoken and shown as a colored chip).
3. Total length **~15 seconds**, vertical **1080×1920** — ready for Shorts.

Only the four breeds (and the title) change from video to video; the format
stays identical, which is exactly what a repeatable Shorts channel wants.

<sub>Example intro card and a breed card (with a real photo in place of the placeholder paw):</sub>

---

## Quick start

```bash
cd dog-shorts
python3 -m pip install -r requirements.txt

# The default voice is ElevenLabs (soft, high quality). Set your key:
export ELEVENLABS_API_KEY=sk_...

# Make one short → out/short.mp4  (+ out/short.json upload metadata)
python3 -m dogshorts --out out/short.mp4

# Make 10 unique shorts → out/dogshort-0001.mp4 … 0010.mp4
python3 -m dogshorts --count 10 --out-dir out
```

No ElevenLabs key? Use the free neural voice with `--voice edge`, or the
fully-offline `--voice espeak`.

Force specific breeds (curated best photo used for each):

```bash
python3 -m dogshorts --include pomeranian,samoyed,shiba,pug --out out/short.mp4
```

Fully offline with real speech (no cloud, no API key) — bundled espeak voice
plus the built-in real-photo manifest:

```bash
python3 -m dogshorts --voice espeak --source manifest \
  --include pomeranian,samoyed,shiba,pug --out out/short.mp4
```

Just want to see the format with no network at all? Placeholder art + silence:

```bash
python3 -m dogshorts --offline --out out/demo.mp4
```

## How it works

```
pick 4 cute breeds ─► fetch a photo each (dog.ceo) ─► narrate hook + names (TTS)
      └─► compose 1080×1920 frames (Pillow) ─► animate + concat (ffmpeg) ─► .mp4 + .json
```

- **Photos** come from the free [dog.ceo](https://dog.ceo/dog-api/) API — no
  API key. Breeds are chosen from a hand-curated "cute" catalog in
  [`dogshorts/breeds.py`](dogshorts/breeds.py); edit that list to taste.
- **Voice** defaults to `edge-tts` — free Microsoft **neural** voices, no key,
  and genuinely soft (default `en-US-AnaNeural`, slowed slightly for calm).
- **ffmpeg** ships inside the `imageio-ffmpeg` wheel, so there's **nothing to
  install system-wide** and it runs fully offline once dependencies are in.
- Each video gets a `.json` sidecar with a ready-to-use **title, description,
  hashtags, and tags** for uploading.

## Options

| Flag | Default | Meaning |
|------|---------|---------|
| `--out PATH` | `out/short.mp4` | Output file for a single video |
| `--count N` | `1` | Make N shorts (writes `dogshort-NNNN.mp4` to `--out-dir`) |
| `--out-dir DIR` | `out` | Batch output directory |
| `--breeds N` | `4` | Dogs per short |
| `--hook TEXT` | `"What cute dog are you choosing?"` | Opening spoken line |
| `--voice` | `edge` | `edge` · `espeak` · `gtts` · `eleven` · `silent` |
| `--source` | `auto` | Photo source: `auto` · `dogceo` · `manifest` |
| `--include LIST` | random | Force breeds by api_path, in order (comma-separated) |
| `--offline` | off | Placeholder art + silence, no network |
| `--seed N` | random | Reproducible breed pick |

### Voices

| `--voice` | Quality | Setup |
|-----------|---------|-------|
| `eleven` | Highest quality (**default**) | set `ELEVENLABS_API_KEY` |
| `edge` | Soft neural | free, no key |
| `espeak` | Robotic but **fully offline** | `espeakng-loader` (no model download) |
| `gtts` | Robotic but reliable | `pip install gTTS` |
| `silent` | None (timing only) | used by `--offline` |

**ElevenLabs voice & tuning** — the default voice is *Rachel* (calm/soft). Pick
another with `DOGSHORTS_ELEVEN_VOICE` (a voice ID *or* a name, e.g. `Sarah`,
`Lily`, `Alice`). Softness knobs (env vars): `DOGSHORTS_ELEVEN_STABILITY` (0.6),
`DOGSHORTS_ELEVEN_SPEED` (0.92), `DOGSHORTS_ELEVEN_STYLE` (0.0),
`DOGSHORTS_ELEVEN_MODEL` (`eleven_multilingual_v2`).

### Photo sources

`--source auto` (default) tries the live [dog.ceo](https://dog.ceo) API first,
then falls back to a bundled manifest of real photos served from
`raw.githubusercontent.com` (handy in locked-down networks where dog.ceo is
blocked but GitHub raw is reachable). `--source manifest` uses only that
manifest; `--source dogceo` uses only the live API.

### Call-to-actions

Each dog carries a CTA (spoken + shown as a colored chip). The default cycle is
Subscribe → Like → Comment → all-three; the last dog always asks for everything.
Edit `DEFAULT_CTAS` in [`dogshorts/generate.py`](dogshorts/generate.py) to change
the wording, colors, or order.

Pick a different Edge voice with `DOGSHORTS_EDGE_VOICE`, e.g.
`en-GB-SoniaNeural`, `en-US-JennyNeural`. Full list: `edge-tts --list-voices`.

## Publishing to YouTube (optional)

```bash
pip install google-api-python-client google-auth-oauthlib
python3 upload_youtube.py out/dogshort-0001.mp4 --privacy private
```

One-time Google OAuth setup is documented at the top of
[`upload_youtube.py`](upload_youtube.py). The title/description/tags come from
the `.json` sidecar, and `#Shorts` is added automatically.

## Running it on a schedule ("again and again")

`--count` makes a batch in one go. To keep a channel fed, wrap it in cron —
generate a fresh short every morning and upload it:

```cron
0 9 * * *  cd /path/to/dog-shorts && python3 -m dogshorts --out out/daily.mp4 && python3 upload_youtube.py out/daily.mp4 --privacy public
```

## Notes

- This tool downloads third-party dog photos from dog.ceo; check their terms
  before monetizing. Swapping in your own image source is a one-function change
  in [`dogshorts/images.py`](dogshorts/images.py).
- Bundled font: [Outfit](https://github.com/Outfitio/Outfit-Fonts) (SIL OFL,
  license in `dogshorts/assets/fonts/OFL.txt`).
