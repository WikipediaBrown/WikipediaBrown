#!/usr/bin/env python3
"""Render the Mac mini photo as ASCII tuned for the dark site theme."""

from PIL import Image, ImageEnhance, ImageOps

SRC = '/tmp/macmini_main.jpg'
RAMP = " .·:;+*#%@"     # dark→bright (small set keeps the mini's silhouette crisp)
WIDTH = 56
CHAR_ASPECT = 0.47       # Recursive Mono characters are ~ 2x taller than wide

# Manual bounding box for THIS photo — the Mac mini occupies roughly this
# region of the 2125x1785 source. Aggressive top/bottom crop removes the
# wood table; mild side crop keeps a little air around the silhouette.
img = Image.open(SRC).convert('L')
w, h = img.size
img = img.crop((
    int(w * 0.05),
    int(h * 0.04),
    int(w * 0.95),
    int(h * 0.78),
))

# Bring out the Mac mini against the wood background.
img = ImageOps.autocontrast(img, cutoff=3)
img = ImageEnhance.Contrast(img).enhance(1.45)

# Resize to ASCII grid.
new_w = WIDTH
new_h = max(1, int(WIDTH * (img.size[1] / img.size[0]) * CHAR_ASPECT))
img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

n = len(RAMP)
px = list(img.getdata())

lines = []
for y in range(new_h):
    row = ''
    for x in range(new_w):
        p = px[y * new_w + x]
        row += RAMP[min(n - 1, p * n // 256)]
    lines.append(row.rstrip())   # trim trailing spaces — keeps the literal compact

result = '\n'.join(lines)
print(result)
print(f"\n[{new_w}x{new_h}, {len(result)} chars]", file=__import__('sys').stderr)
