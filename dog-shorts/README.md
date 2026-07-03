# 🐶 dogshorts

An agent that cranks out the **same style of cute-dog YouTube Short, again and
again**. Every video follows one template:

1. A soft voice asks **"What cute dog are you choosing?"** over a title card.
2. Then, one at a time, **4 cute dog breeds** — each a full-screen photo with
   the breed name spoken in a soft voice and shown as a big caption (`1/4`,
   `2/4`, …).
3. Total length **~15 seconds**, vertical **1080×1920** — ready for Shorts.

Only the four breeds (and the title) change from video to video; the format
stays identical, which is exactly what a repeatable Shorts channel wants.

<sub>Example intro card and a breed card (with a real photo in place of the placeholder paw):</sub>

---

## Quick start

```bash
cd dog-shorts
python3 -m pip install -r requirements.txt

# Make one short → out/short.mp4  (+ out/short.json upload metadata)
python3 -m dogshorts --out out/short.mp4

# Make 10 unique shorts → out/dogshort-0001.mp4 … 0010.mp4
python3 -m dogshorts --count 10 --out-dir out
```

No network / just want to see the format? Use the offline demo (placeholder
art + silent narration, needs nothing but Pillow + ffmpeg):

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
| `--voice` | `edge` | `edge` · `gtts` · `eleven` · `silent` |
| `--offline` | off | Placeholder art + silence, no network |
| `--seed N` | random | Reproducible breed pick |

### Voices

| `--voice` | Quality | Setup |
|-----------|---------|-------|
| `edge` | Soft neural (recommended) | free, no key |
| `gtts` | Robotic but reliable | `pip install gTTS` |
| `eleven` | Highest quality | `pip install elevenlabs`, set `ELEVENLABS_API_KEY` |
| `silent` | None (timing only) | used by `--offline` |

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
