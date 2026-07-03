"""Compose the still frames (1080x1920) that become each video segment.

Each frame is a full-bleed photo with a darkened scrim and a large, legible
caption — the visual template that repeats across every short. The intro is a
warm gradient title card carrying the hook question.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
_FONTS = Path(__file__).parent / "assets" / "fonts"


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    name = "Outfit-Bold.ttf" if bold else "Outfit-Regular.ttf"
    return ImageFont.truetype(str(_FONTS / name), size)


def _cover(photo: Image.Image, w: int, h: int) -> Image.Image:
    """Scale + center-crop ``photo`` to exactly fill ``w`` x ``h``."""
    photo = photo.convert("RGB")
    scale = max(w / photo.width, h / photo.height)
    resized = photo.resize(
        (round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS
    )
    left = (resized.width - w) // 2
    top = (resized.height - h) // 2
    return resized.crop((left, top, left + w, top + h))


def _bottom_scrim(img: Image.Image, start: float = 0.5, strength: int = 200) -> None:
    """Darken the lower part of the frame so white captions stay readable."""
    grad = Image.new("L", (1, H), 0)
    y0 = int(H * start)
    for y in range(y0, H):
        grad.putpixel((0, y), int(strength * (y - y0) / (H - y0)))
    alpha = grad.resize((W, H))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    img.paste(black, (0, 0), alpha)


def _wrap(draw, text: str, font, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def _draw_centered(draw, lines, font, cy: int, line_h: int,
                   fill=(255, 255, 255), stroke=(0, 0, 0), stroke_w=6) -> None:
    total = line_h * len(lines)
    y = cy - total // 2
    for line in lines:
        w = draw.textlength(line, font=font)
        draw.text((W // 2 - w // 2, y), line, font=font, fill=fill,
                  stroke_width=stroke_w, stroke_fill=stroke)
        y += line_h


def _counter_pill(draw, index: int, total: int) -> None:
    """A small '2 / 4' pill in the top-right corner."""
    txt = f"{index} / {total}"
    font = _font(48)
    tw = draw.textlength(txt, font=font)
    pad_x, pad_y = 34, 20
    w, h = tw + pad_x * 2, 48 + pad_y * 2
    x1, y1 = W - w - 48, 70
    draw.rounded_rectangle([x1, y1, x1 + w, y1 + h], radius=h // 2,
                           fill=(0, 0, 0, 140))
    draw.text((x1 + pad_x, y1 + pad_y - 4), txt, font=font, fill=(255, 255, 255))


def _cta_chip(draw, label: str, color: tuple[int, int, int], cy: int) -> None:
    """A bold colored call-to-action pill (SUBSCRIBE / LIKE / …) centered at cy."""
    font = _font(58)
    tw = draw.textlength(label, font=font)
    pad_x, pad_y = 46, 26
    w, h = tw + pad_x * 2, 58 + pad_y * 2
    x1, y1 = W // 2 - w // 2, cy - h // 2
    draw.rounded_rectangle([x1, y1, x1 + w, y1 + h], radius=h // 2,
                           fill=(*color, 255))
    draw.text((x1 + pad_x, y1 + pad_y - 6), label, font=font, fill=(255, 255, 255))


def render_breed_frame(photo_path: Path, name: str, index: int, total: int,
                       dest: Path, *, cta_label: str | None = None,
                       cta_color: tuple[int, int, int] = (230, 33, 42)) -> Path:
    """Full-bleed dog photo + breed-name caption + counter + optional CTA chip."""
    with Image.open(photo_path) as raw:
        frame = _cover(raw, W, H)
    _bottom_scrim(frame, start=0.42, strength=210)
    draw = ImageDraw.Draw(frame, "RGBA")

    font = _font(120)
    lines = _wrap(draw, name, font, int(W * 0.86))
    # Shrink for very long names so they never overflow.
    while len(lines) > 2 and font.size > 70:
        font = _font(font.size - 10)
        lines = _wrap(draw, name, font, int(W * 0.86))
    _draw_centered(draw, lines, font, cy=int(H * 0.80), line_h=int(font.size * 1.12))

    if cta_label:
        _cta_chip(draw, cta_label, cta_color, cy=int(H * 0.90))

    _counter_pill(draw, index, total)
    dest.parent.mkdir(parents=True, exist_ok=True)
    frame.convert("RGB").save(dest, "PNG")
    return dest


def render_intro_frame(question: str, dest: Path) -> Path:
    """A warm gradient title card carrying the hook question."""
    frame = Image.new("RGB", (W, H))
    # Vertical peach -> lavender gradient (soft, cute).
    top, bot = (255, 214, 196), (214, 205, 255)
    for y in range(H):
        t = y / H
        frame.paste(
            tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)),
            (0, y, W, y + 1),
        )
    draw = ImageDraw.Draw(frame, "RGBA")

    # Big paw motif behind the text.
    _paw(draw, W // 2, int(H * 0.30), 150, (255, 255, 255, 90))

    font = _font(128)
    lines = _wrap(draw, question, font, int(W * 0.82))
    _draw_centered(draw, lines, font, cy=int(H * 0.55), line_h=int(font.size * 1.15),
                   fill=(60, 40, 70), stroke=(255, 255, 255), stroke_w=5)

    sub = _font(56, bold=False)
    tip = "tap to pick your favorite ↓"
    tw = draw.textlength(tip, font=sub)
    draw.text((W // 2 - tw // 2, int(H * 0.72)), tip, font=sub, fill=(90, 70, 100))

    dest.parent.mkdir(parents=True, exist_ok=True)
    frame.save(dest, "PNG")
    return dest


def _paw(draw, cx: int, cy: int, r: int, fill) -> None:
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    tr = int(r * 0.42)
    for dx, dy in [(-1.5, -1.35), (-0.55, -1.75), (0.55, -1.75), (1.5, -1.35)]:
        tx, ty = cx + dx * r, cy + dy * r
        draw.ellipse([tx - tr, ty - tr, tx + tr, ty + tr], fill=fill)
