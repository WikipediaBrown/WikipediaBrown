#!/usr/bin/env python3
"""Parametric rotating-3D ASCII renderer.

One engine, three objects (mac mini / book / envelope). Each object is a
rectangular prism with its own proportions, per-face characters, and a
top-face "recess" bitmap (Apple logo / book cover / envelope flap).

Triple-axis Euler rotation (adapted from danieldotwav/Ascii-Cube) keeps
the box off the cardinal angles so every frame reads as 3D. Recesses are
rendered as a low-density '.' mark ON the solid face — never an empty
hole — so the faces stay connected and the object never looks "blown
apart".

Usage:  python3 ascii3d.py <macmini|book|envelope>   > frames.json
"""
import math, json, sys

W, H = 88, 42
N_FRAMES = 48
DISTANCE = 100.0
STRIDE   = 0.25

# Triple-axis rotation rates (1 / 2 / 3 full turns per loop → seamless).
A0, B0, C0 = 0.45, 0.30, 0.20


# ---------------------------------------------------------------------------
# Recess bitmaps. '#' = recessed (drawn with the RECESS char), '.' = solid
# face. Rasterized over the centered |u|,|v| < `half` region of the top face.
# ---------------------------------------------------------------------------

APPLE_MASK = [
    "............#...........",
    "...........###..........",
    "...........####.........",
    "............###.........",
    "............##..........",
    "........................",
    "......####...####.......",
    ".....######.######......",
    "....##################..",
    "....##################..",
    "....################....",
    "....##############......",
    "....#############.......",
    "....##############......",
    "....################....",
    "....##################..",
    ".....################...",
    "......##############....",
    ".......############.....",
    "........##########......",
    ".........########.......",
    "..........######........",
]

# Book front cover: a ruled border + a title block + an author rule.
BOOK_MASK = [
    "........................",
    ".####################...",
    ".#..................#...",
    ".#..................#...",
    ".#...############...#...",   # title block
    ".#...############...#...",
    ".#...############...#...",
    ".#..................#...",
    ".#..................#...",
    ".#......######......#...",   # author rule
    ".#..................#...",
    ".#..................#...",
    ".####################...",
    "........................",
    "........................",
    "........................",
]

# Sealed-envelope back: the two flap diagonals meeting at a centre point,
# plus the flap's top edge.
ENVELOPE_MASK = [
    "########################",   # flap top edge
    "##....................##",
    "#.##................##.#",
    "#..##..............##..#",
    "#...##............##...#",
    "#....##..........##....#",
    "#.....##........##.....#",
    "#......##......##......#",
    "#.......##....##.......#",
    "#........##..##........#",
    "#.........####.........#",   # flap V point
    "#......................#",
    "#......................#",
    "#......................#",
    "########################",   # envelope bottom edge
]


def make_mask_fn(mask, half):
    h = len(mask)
    w = len(mask[0])

    def fn(u, v):
        if abs(u) > half or abs(v) > half:
            return False
        un = u / half
        vn = v / half
        ic = int(round((un + 1.0) * 0.5 * (w - 1)))
        ir = int(round((1.0 - vn) * 0.5 * (h - 1)))
        if 0 <= ir < h and 0 <= ic < w:
            return mask[ir][ic] == '#'
        return False
    return fn


def corner_cutoff(u, v):
    """Round only the true corners; keep edge midpoints so faces stay
    connected (see macmini_3d.py for the threshold derivation)."""
    du = max(0.0, abs(u) - 0.72)
    dv = max(0.0, abs(v) - 0.72)
    return du * du + dv * dv > 0.11


# --- Mac mini ports (only used by the macmini object) ----------------------
def _hit(u, v, cx, rx, ry):
    return (u - cx) ** 2 / rx + (v ** 2) / ry < 1


def macmini_front_port(u, v):
    if abs(v) > 0.15:
        return False
    return (_hit(u, v, -0.42, 0.0050, 0.0020) or
            _hit(u, v, -0.22, 0.0050, 0.0020) or
            _hit(u, v,  0.52, 0.0040, 0.0040))


def macmini_back_port(u, v):
    if abs(v) > 0.16:
        return False
    return (_hit(u, v, -0.78, 0.0280, 0.0160) or
            _hit(u, v, -0.42, 0.0110, 0.0110) or
            _hit(u, v, -0.13, 0.0220, 0.0055) or
            _hit(u, v,  0.25, 0.0050, 0.0020) or
            _hit(u, v,  0.48, 0.0050, 0.0020) or
            _hit(u, v,  0.71, 0.0050, 0.0020))


def no_port(u, v):
    return False


# ---------------------------------------------------------------------------
# Object catalogue
# ---------------------------------------------------------------------------
OBJECTS = {
    "macmini": dict(
        dims=(20.0, 20.0, 10.6), view=72.0,
        chars=dict(TOP='@', FRONT='#', BACK=';', RIGHT='*', LEFT='+',
                   BOTTOM=':', RECESS='.'),
        top_mask=APPLE_MASK, top_half=0.33,
        front_port=macmini_front_port, back_port=macmini_back_port,
    ),
    "book": dict(
        # A closed hardcover: wide cover, tall, fairly thin spine.
        dims=(15.0, 4.5, 21.0), view=64.0,
        chars=dict(TOP='#', FRONT='@', BACK='@', RIGHT='=', LEFT='=',
                   BOTTOM='#', RECESS='.'),
        top_mask=BOOK_MASK, top_half=0.86,
        front_port=no_port, back_port=no_port,
    ),
    "envelope": dict(
        # Flat & wide like a sealed letter.
        dims=(22.0, 15.0, 2.6), view=70.0,
        chars=dict(TOP='#', FRONT='#', BACK='#', RIGHT='+', LEFT='+',
                   BOTTOM='#', RECESS='.'),
        top_mask=ENVELOPE_MASK, top_half=0.92,
        front_port=no_port, back_port=no_port,
    ),
}


def render(obj):
    wD, dD, hD = obj["dims"]
    view = obj["view"]
    C = obj["chars"]
    top_recess = make_mask_fn(obj["top_mask"], obj["top_half"])
    front_port = obj["front_port"]
    back_port  = obj["back_port"]

    def render_frame(A, B, Cc):
        cA, sA = math.cos(A), math.sin(A)
        cB, sB = math.cos(B), math.sin(B)
        cC, sC = math.cos(Cc), math.sin(Cc)
        out  = [[' '] * W for _ in range(H)]
        zbuf = [[0.0] * W for _ in range(H)]

        def plot(i, j, k, ch):
            x = (j*sA*sB*cC - k*cA*sB*cC + j*cA*sC + k*sA*sC + i*cB*cC)
            y = (j*cA*cC + k*sA*cC - j*sA*sB*sC + k*cA*sB*sC - i*cB*sC)
            z = k*cA*cB - j*sA*cB + i*sB + DISTANCE
            if z <= 0:
                return
            inv = 1.0 / z
            sx = int(W/2 + view * inv * x * 2)
            sy = int(H/2 - view * inv * y)
            if 0 <= sx < W and 0 <= sy < H and inv > zbuf[sy][sx]:
                zbuf[sy][sx] = inv
                out[sy][sx] = ch

        s = STRIDE
        u = -wD
        while u < wD:
            v = -wD
            while v < wD:
                uu, vv = u / wD, v / wD
                if not corner_cutoff(uu, vv):
                    plot(u,  hD, v, C['RECESS'] if top_recess(uu, vv) else C['TOP'])
                    plot(u, -hD, v, C['BOTTOM'])

                vv_h = v * hD / wD
                uu_h = vv_h / hD
                if not corner_cutoff(uu, uu_h):
                    plot(u, vv_h,  dD, C['RECESS'] if front_port(uu, uu_h) else C['FRONT'])
                    plot(u, vv_h, -dD, C['RECESS'] if back_port(uu, uu_h)  else C['BACK'])
                    plot( wD, vv_h, u, C['RIGHT'])
                    plot(-wD, vv_h, u, C['LEFT'])
                v += s
            u += s

        return '\n'.join(''.join(r).rstrip() for r in out)

    rates = (2*math.pi/N_FRAMES, 4*math.pi/N_FRAMES, 6*math.pi/N_FRAMES)
    return [render_frame(A0 + rates[0]*i,
                         B0 + rates[1]*i,
                         C0 + rates[2]*i) for i in range(N_FRAMES)]


if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'macmini'
    json.dump(render(OBJECTS[name]), sys.stdout)
    sys.stdout.write('\n')
