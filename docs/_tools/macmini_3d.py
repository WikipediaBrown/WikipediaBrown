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

W, H = 88, 42        # higher-resolution grid → finer detail on the Apple logo
N_FRAMES = 48

# World-space half-dimensions (real M4 Mac mini ratio).
wD, dD, hD = 20.0, 20.0, 7.7   # h/w = 0.385

# Perspective camera — mild distance so foreshortening is subtle.
DISTANCE = 100.0
VIEW_SCALE = 50.0    # scaled up to match the bigger canvas

# Fixed character per face. Each face reads as a distinct surface.
TOP    = '@'
FRONT  = '#'
BACK   = ';'
RIGHT  = '*'
LEFT   = '+'
BOTTOM = ':'    # rendered when the tumble exposes it
APPLE  = '.'    # Apple-logo recess on top (darker)

# Sampling stride — smaller now so the denser grid fills properly.
STRIDE = 0.42


def is_apple(u: float, v: float) -> bool:
    """Apple-logo recess on the top face. (u, v) ∈ [-1, 1].

    Composed regions, recognisable as the Apple silhouette:
      - Body: TWO overlapping circles ('left lobe' + 'right lobe') so the
        top of the body has the characteristic heart-shaped indent
        (where the two lobes don't quite overlap), instead of being a
        plain ellipse.
      - Bottom point: a small ellipse extending below the lobes for the
        slight tapering at the apple's base.
      - Bite: a clear disc cut OUT of the right side of the body.
      - Leaf: a small angled ellipse positioned above the body with a
        visible gap.
    """
    # ----- Leaf — angled ellipse, clearly separated above the body -----
    lu = u - 0.06
    lv = v - 0.62
    lrot_u =  lu * 0.88 + lv * 0.47
    lrot_v = -lu * 0.47 + lv * 0.88
    if (lrot_u * lrot_u) / 0.013 + (lrot_v * lrot_v) / 0.045 < 1:
        return True

    # ----- Body: two overlapping lobes + a bottom point ----------------
    # Left lobe
    llu = u + 0.13
    llv = v - 0.05
    in_left  = (llu * llu) / 0.078 + (llv * llv) / 0.095 < 1
    # Right lobe
    rlu = u - 0.13
    rlv = v - 0.05
    in_right = (rlu * rlu) / 0.078 + (rlv * rlv) / 0.095 < 1
    # Bottom point — small ellipse below the lobes
    bpu = u
    bpv = v + 0.32
    in_bp = (bpu * bpu) / 0.030 + (bpv * bpv) / 0.060 < 1

    in_body = in_left or in_right or in_bp
    if not in_body:
        return False

    # ----- Bite — clear disc carved out of the right side --------------
    bxu = u - 0.34
    bxv = v - 0.02
    if (bxu * bxu) / 0.030 + (bxv * bxv) / 0.024 < 1:
        return False

    return True


def is_corner_cutoff(u: float, v: float) -> bool:
    """Skip the very corners of each face to suggest Mac mini's rounded
    edges. (u, v) ∈ [-1, 1]. Slightly rounds the silhouette."""
    du = max(0.0, abs(u) - 0.90)
    dv = max(0.0, abs(v) - 0.90)
    # Outside a small quarter-circle in each corner — skip the cell.
    return du * du + dv * dv > 0.0064


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
    u = -wD
    while u < wD:
        v = -wD
        while v < wD:
            uu, vv = u / wD, v / wD     # normalize to [-1, 1]

            # Top face (y = +hD): Apple logo recess in the center
            if not is_corner_cutoff(uu, vv):
                plot(u, hD, v, APPLE if is_apple(uu, vv) else TOP)
                # Bottom face (y = -hD): rendered when the tumble exposes it
                plot(u, -hD, v, BOTTOM)

            # Side faces use a (u, v) parameter where v sweeps over [-wD, wD]
            # mapped to the FACE's vertical extent (h = hD). For each side
            # face we re-parameterize so that the v-axis maps to height.
            vv_h = v * hD / wD                  # actual height coord
            uu_h = vv_h / hD                    # normalised to [-1, 1] over height
            if not is_corner_cutoff(uu, uu_h):
                # Front face (z = +dD)
                plot(u, vv_h, dD, FRONT)
                # Back face (z = -dD)
                plot(u, vv_h, -dD, BACK)
                # Right face (x = +wD)
                plot(wD, vv_h, u, RIGHT)
                # Left face (x = -wD)
                plot(-wD, vv_h, u, LEFT)

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
