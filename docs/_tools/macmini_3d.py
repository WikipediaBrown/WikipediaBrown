#!/usr/bin/env python3
"""Pre-render a rotating 3D ASCII Mac mini.

Geometry: a rectangular prism with M4 Mac mini proportions
  (130 × 130 × 50 mm  →  half-dims 2.5, 2.5, 1.0 — chunky cube).
Shading: per-face Lambertian (light from upper-left-front).
Apple logo: a darker patch in the center of the top face.

Output: a JSON array of `N_FRAMES` ASCII frame strings.
"""
import math, json, sys

W, H = 64, 28
N_FRAMES = 36     # more frames = smoother slow rotation

# Half-dimensions. Width and depth slightly smaller than half-canvas;
# height bumped to ~58% of width so the box reads as a chunky cube
# instead of a flat slab.
wD, dD, hD = 2.0, 2.0, 1.15

# Camera tilt — middle ground (~18°). Steep enough to see the top face
# and the Apple-logo recess, gentle enough that the side faces still read
# as substantial vertical panels (not a wedge of cheese).
tilt = 0.32
cT, sT = math.cos(tilt), math.sin(tilt)

camDist = 4.6
fxH     = 13     # horizontal projection scale
fxV     = 9      # vertical projection scale (chars are taller than wide)

# Density ramp — light → dark; we use it inverted so brighter Lambert
# values map to denser chars.
SHADES = ' .,:;+*#%@'  # ASCII-only ramp (smaller JS payload — no unicode escapes)

# Light direction (world-space, normalized). Coming from upper-left-front —
# this hits the top face strongly, plus the +x and +z side faces partially
# during rotation, so the side faces aren't entirely black.
Lx, Ly, Lz = -0.55, -0.70, -0.45
Llen = math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz)
Lx, Ly, Lz = Lx / Llen, Ly / Llen, Lz / Llen

AMBIENT = 0.22    # base brightness for any visible face
DIFFUSE = 0.78    # scaling on the Lambert term

# Faces of the box: name, outward normal (local), and (u,v)→3D function.
FACES = [
    ('top',   (0, 1, 0),  lambda u, v: (u * wD,  hD,    v * dD)),
    ('front', (0, 0, 1),  lambda u, v: (u * wD,  v * hD,  dD)),
    ('back',  (0, 0, -1), lambda u, v: (u * wD,  v * hD, -dD)),
    ('right', (1, 0, 0),  lambda u, v: ( wD,     v * hD,  u * dD)),
    ('left',  (-1, 0, 0), lambda u, v: (-wD,     v * hD,  u * dD)),
]


def is_apple_logo(name: str, u: float, v: float) -> bool:
    """Approximate the Apple logo (recessed dark patch) on the top face.
    (u, v) ∈ [-1, 1]² parameterize the face."""
    if name != 'top':
        return False
    return (u * u + v * v) < 0.18


def render_frame(angle: float) -> str:
    cA, sA = math.cos(angle), math.sin(angle)

    out  = [[' '] * W for _ in range(H)]
    zbuf = [[float('inf')] * W for _ in range(H)]

    for name, normal, fn in FACES:
        # --- Rotate the face's outward normal ---------------------------
        nx0, ny0, nz0 = normal
        # Y-axis rotation
        nx1 =  nx0 * cA + nz0 * sA
        ny1 =  ny0
        nz1 = -nx0 * sA + nz0 * cA
        # X-axis tilt (negative — tips the top of the model toward camera)
        nx2 =  nx1
        ny2 =  ny1 * cT + nz1 * sT
        nz2 = -ny1 * sT + nz1 * cT

        # Camera looks from -z toward +z; faces visible when their normal
        # points back toward the camera, i.e., nz2 < 0.
        if nz2 >= -0.01:
            continue

        # Per-face Lambertian brightness — flat-shaded face (we'll modulate
        # for the Apple logo per-cell below). Ambient + diffuse so back/side
        # faces never drop to pure black.
        lambert = -(nx2 * Lx + ny2 * Ly + nz2 * Lz)
        base_b = min(1.0, AMBIENT + max(0.0, lambert) * DIFFUSE)

        # --- Sample the face surface ------------------------------------
        step = 0.030
        u = -1.0
        while u <= 1.0:
            v = -1.0
            while v <= 1.0:
                px0, py0, pz0 = fn(u, v)

                # Y rotation
                px1 =  px0 * cA + pz0 * sA
                py1 =  py0
                pz1 = -px0 * sA + pz0 * cA
                # X tilt (negative)
                px2 =  px1
                py2 =  py1 * cT + pz1 * sT
                pz2 = -py1 * sT + pz1 * cT

                D = 1.0 / (pz2 + camDist)
                if D > 0:
                    sx = W // 2 + fxH * D * px2
                    sy = H // 2 - fxV * D * py2
                    ix, iy = int(round(sx)), int(round(sy))
                    if 0 <= ix < W and 0 <= iy < H and pz2 < zbuf[iy][ix]:
                        zbuf[iy][ix] = pz2

                        b = base_b
                        # Apple logo recess: darker patch on top face
                        if is_apple_logo(name, u, v):
                            b *= 0.35

                        # Map to density ramp.
                        idx = max(0, min(len(SHADES) - 1, int(b * len(SHADES))))
                        out[iy][ix] = SHADES[idx]

                v += step
            u += step

    return '\n'.join(''.join(row) for row in out)


def main():
    frames = []
    for i in range(N_FRAMES):
        angle = 2 * math.pi * i / N_FRAMES
        frames.append(render_frame(angle))

    json.dump(frames, sys.stdout)
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
