#!/usr/bin/env python3
"""Pre-render a rotating 3D ASCII Mac mini using triple-axis Euler rotation
plus fixed per-face characters — adapted from danieldotwav/Ascii-Cube
(https://github.com/danieldotwav/Ascii-Cube), which solves the
cardinal-angle-flattening problem by rotating around all three axes
simultaneously at different rates. The box never aligns with the view axis,
so every frame reads as 3D.

Geometry: Mac mini M4 proportions — 130×130×50mm (h/w = 0.385).

Output: a JSON array of `N_FRAMES` ASCII frame strings on stdout.
"""
import math, json, sys

W, H = 64, 30
N_FRAMES = 48

# World-space half-dimensions (real M4 Mac mini ratio).
wD, dD, hD = 20.0, 20.0, 7.7   # h/w = 0.385

# Perspective camera — mild distance so foreshortening is subtle.
DISTANCE = 100.0
VIEW_SCALE = 35.0

# Fixed character per face. Each face reads as a distinct surface.
# (Top is the densest so the box "lights from above"; the front face is
#  next-densest; sides and back are lower-density.)
TOP   = '@'
FRONT = '#'
BACK  = ';'
RIGHT = '*'
LEFT  = '+'
APPLE = '.'    # Apple-logo recess on top (darker)

# Sampling stride for the face surfaces. Smaller = denser fill, more CPU.
STRIDE = 0.6


def is_apple(u, v):
    """Apple logo region on the top face — center disc."""
    return (u * u + v * v) < 0.18


def render_frame(A: float, B: float, C: float) -> str:
    cA, sA = math.cos(A), math.sin(A)
    cB, sB = math.cos(B), math.sin(B)
    cC, sC = math.cos(C), math.sin(C)

    out  = [[' '] * W for _ in range(H)]
    zbuf = [[0.0] * W for _ in range(H)]    # store inverseDepth (bigger = closer)

    def plot(i_world: float, j_world: float, k_world: float, ch: str):
        # Triple-axis rotation: R_z(C) ∘ R_y(B) ∘ R_x(A) applied to (i, j, k).
        # Formulas transcribed from Ascii-Cube/Source.c, which uses these
        # exact composites — see calculateX, calculateY, calculateZ there.
        x = (j_world * sA * sB * cC - k_world * cA * sB * cC +
             j_world * cA * sC + k_world * sA * sC + i_world * cB * cC)
        y = (j_world * cA * cC + k_world * sA * cC -
             j_world * sA * sB * sC + k_world * cA * sB * sC - i_world * cB * sC)
        z = k_world * cA * cB - j_world * sA * cB + i_world * sB

        z += DISTANCE
        if z <= 0:
            return
        inv = 1.0 / z
        sx = int(W / 2 + VIEW_SCALE * inv * x * 2)   # *2 for char aspect ratio
        sy = int(H / 2 - VIEW_SCALE * inv * y)
        if 0 <= sx < W and 0 <= sy < H and inv > zbuf[sy][sx]:
            zbuf[sy][sx] = inv
            out[sy][sx] = ch

    # Sample each face on a 2D grid. Two of the three world coords sweep
    # over their range; the third is pinned to ±the half-dim.
    s = STRIDE
    # u and v sweep over the face's local coords; pre-compute for apple-logo
    # parameter check on the top face.
    u = -wD
    while u < wD:
        v = -wD
        while v < wD:
            uu, vv = u / wD, v / wD     # normalize to [-1, 1] for apple-logo test
            # Top face (y = +hD): possible Apple logo recess in center disc
            plot(u, hD, v, APPLE if is_apple(uu, vv) else TOP)
            # Front face (z = +dD) — parameterise (u, v) → (x, y)
            if -hD <= v <= hD:
                plot(u, v, dD, FRONT)
            # Back face (z = -dD)
            if -hD <= v <= hD:
                plot(u, v, -dD, BACK)
            # Right face (x = +wD)
            if -hD <= v <= hD:
                plot(wD, v, u, RIGHT)
            # Left face (x = -wD)
            if -hD <= v <= hD:
                plot(-wD, v, u, LEFT)
            v += s
        u += s

    return '\n'.join(''.join(row) for row in out)


def main():
    frames = []
    # Frame rates per axis: A does 1 full rotation in N frames, B does 2,
    # C does 3 — all return to start at frame N, making the loop seamless.
    A_rate = 2 * math.pi / N_FRAMES
    B_rate = 4 * math.pi / N_FRAMES
    C_rate = 6 * math.pi / N_FRAMES
    # Initial off-axis offsets so frame 0 isn't an axis-aligned (flat-
    # looking) orientation. These break the cardinal-angle flatness:
    # at every frame the box is rotated about all three axes by amounts
    # that prevent any face from being exactly perpendicular to the view.
    A0, B0, C0 = 0.45, 0.30, 0.20
    for i in range(N_FRAMES):
        frames.append(render_frame(A0 + A_rate * i,
                                    B0 + B_rate * i,
                                    C0 + C_rate * i))

    json.dump(frames, sys.stdout)
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
