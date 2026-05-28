#!/usr/bin/env python3
"""
Iron G Command Center — PWA icon generator
Requires: pip install Pillow fonttools brotli
Font:     Oswald Bold 700 downloaded from Google Fonts on first run
Output:   public/icon-192.png and public/icon-512.png
"""

import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

FONT_URL  = "https://fonts.gstatic.com/s/oswald/v57/TK3_WkUHHAIjg75cFRf3bXL8LICs1xZogUE.ttf"
FONT_PATH = os.path.join(os.path.dirname(__file__), "oswald-bold.ttf")
OUT_DIR   = os.path.join(os.path.dirname(__file__), "public")

BG    = "#080808"
COL_I = "#FFFFFF"
COL_G = "#5B9EC9"
FILL  = 0.65   # letter height as fraction of icon size


def ensure_font():
    if not os.path.exists(FONT_PATH):
        print(f"Downloading Oswald Bold from Google Fonts...")
        urllib.request.urlretrieve(FONT_URL, FONT_PATH)
        print(f"Saved to {FONT_PATH}")
    else:
        print(f"Font already present: {FONT_PATH}")


def make_icon(icon_size):
    target_h = int(icon_size * FILL)

    # Binary-search the font size that hits the target glyph height
    lo, hi = 10, icon_size * 2
    for _ in range(30):
        mid = (lo + hi) // 2
        fnt = ImageFont.truetype(FONT_PATH, mid)
        bb  = fnt.getbbox("IG")
        if bb[3] - bb[1] < target_h:
            lo = mid
        else:
            hi = mid
    fnt = ImageFont.truetype(FONT_PATH, lo)

    # Measure combined "IG" for pixel-perfect centering
    bb_ig = fnt.getbbox("IG")
    w = bb_ig[2] - bb_ig[0]
    h = bb_ig[3] - bb_ig[1]

    # Anchor: draw at (x, y) so the tight bounding box is centred on the canvas
    x = (icon_size - w) / 2 - bb_ig[0]
    y = (icon_size - h) / 2 - bb_ig[1]

    # Tight kerning: place G flush against the right edge of the I glyph
    bb_i    = fnt.getbbox("I")
    offset_g = bb_i[2]

    img  = Image.new("RGB", (icon_size, icon_size), BG)
    draw = ImageDraw.Draw(img)
    draw.text((x,             y), "I", font=fnt, fill=COL_I)
    draw.text((x + offset_g,  y), "G", font=fnt, fill=COL_G)
    return img


if __name__ == "__main__":
    ensure_font()
    for sz in [192, 512]:
        img  = make_icon(sz)
        path = os.path.join(OUT_DIR, f"icon-{sz}.png")
        img.save(path, "PNG")
        print(f"Written {path}")
