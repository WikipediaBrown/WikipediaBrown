#!/usr/bin/env python3
"""Image -> ASCII art converter tuned for the dark site theme.

Pipeline:
  1. Grayscale + optional crop (to focus on the subject).
  2. Auto-contrast then user contrast multiplier.
  3. Resize to (width, width * aspect * char_aspect) — char_aspect compensates
     for monospace characters being taller than wide.
  4. Map each pixel's brightness to a density-ramp character.

Usage:
  python3 img2ascii.py IMAGE WIDTH [--invert] [--crop FRAC] [--contrast N]
                          [--ramp short|detailed|block]
"""
import sys
from PIL import Image, ImageEnhance, ImageOps

RAMPS = {
    'short':    " .:-=+*#%@",
    'detailed': " .'`,^:\";Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    'block':    " ░▒▓█",
    'dotty':    " .·:;+*#%@",
}

def convert(path, width=60, char_aspect=0.5, ramp_key='detailed',
            invert=False, crop=0.0, contrast=1.4, autocontrast=True):
    img = Image.open(path).convert('L')

    if crop > 0:
        w, h = img.size
        m_x = w * crop
        m_y = h * crop
        img = img.crop((int(m_x), int(m_y), int(w - m_x), int(h - m_y)))

    if autocontrast:
        img = ImageOps.autocontrast(img, cutoff=2)
    if contrast and contrast != 1.0:
        img = ImageEnhance.Contrast(img).enhance(contrast)

    w, h = img.size
    aspect = h / w
    new_h = max(1, int(width * aspect * char_aspect))
    img = img.resize((width, new_h), Image.Resampling.LANCZOS)

    if invert:
        img = ImageOps.invert(img)

    ramp = RAMPS[ramp_key]
    n = len(ramp)
    pixels = list(img.getdata())

    out_lines = []
    for y in range(new_h):
        line = ''
        for x in range(width):
            p = pixels[y * width + x]
            idx = min(n - 1, p * n // 256)
            line += ramp[idx]
        out_lines.append(line)
    return '\n'.join(out_lines)


if __name__ == '__main__':
    args = sys.argv[1:]
    path = args.pop(0)
    width = int(args.pop(0)) if args and args[0].isdigit() else 60

    kw = {}
    while args:
        a = args.pop(0)
        if a == '--invert': kw['invert'] = True
        elif a == '--no-autocontrast': kw['autocontrast'] = False
        elif a == '--crop': kw['crop'] = float(args.pop(0))
        elif a == '--contrast': kw['contrast'] = float(args.pop(0))
        elif a == '--ramp': kw['ramp_key'] = args.pop(0)
        elif a == '--aspect': kw['char_aspect'] = float(args.pop(0))

    print(convert(path, width=width, **kw))
