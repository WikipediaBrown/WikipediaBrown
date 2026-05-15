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

# World-space half-dimensions. Real M4 Mac mini is 130×130×50mm
# (h/w ≈ 0.385); bumped further so the silhouette reads as a proper
# chunky cube at projection scale.
wD, dD, hD = 20.0, 20.0, 10.6

# Perspective camera — mild distance so foreshortening is subtle.
DISTANCE = 100.0
VIEW_SCALE = 72.0    # bumped so the Mac mini fills more of the canvas

# Fixed character per face. Each face reads as a distinct surface.
TOP    = '@'
FRONT  = '#'
BACK   = ';'
RIGHT  = '*'
LEFT   = '+'
BOTTOM = ':'    # rendered when the tumble exposes it
APPLE  = '.'    # Apple-logo recess on top (darker)
PORT   = '.'    # Port recess — a low-density mark ON the face, not an
                # empty hole. Rendering ports as ' ' punched visible gaps
                # that scattered as the box rotated, making it look
                # "blown apart". '.' keeps every face solid; the port
                # just reads as a darker indentation.

# Sampling stride in WORLD units. The loop steps u and v from -wD to +wD
# at this step size; smaller = denser sampling. 0.25 gives ~160 samples
# per dim, enough to resolve the Apple-logo bitmap mask (24×22) AND the
# port rectangles on the side faces without making the JS payload absurd.
STRIDE = 0.25

# Apple-logo region size as a fraction of the top face's half-extent.
# Logo lives in u, v ∈ [-APPLE_HALF, +APPLE_HALF] on the top face.
# 1/3 linear → 1/9 area, per the user spec.
APPLE_HALF = 0.33


# Hand-tuned 2D bitmap of the Apple silhouette. Each row is the same
# length; '#' = inside the logo, '.' = outside. We rasterize (u, v) ∈
# [-1, 1] into this grid — gives pixel-level control over the leaf, the
# heart-indent at the top of the body, the bite cut from the right side,
# and the bottom taper.
_APPLE_MASK = [
    "............#...........",   # row  0  — leaf tip
    "...........###..........",   # row  1
    "...........####.........",   # row  2
    "............###.........",   # row  3
    "............##..........",   # row  4  — leaf base
    "........................",   # row  5  — clear gap to body
    "......####...####.......",   # row  6  — heart-indent: two lobes start
    ".....######.######......",   # row  7  — lobes
    "....##################..",   # row  8  — body merges, full width
    "....##################..",   # row  9
    "....################....",   # row 10  — BITE: right edge starts cutting
    "....##############......",   # row 11  — BITE: deeper
    "....#############.......",   # row 12  — BITE: deepest
    "....##############......",   # row 13  — BITE: easing out
    "....################....",   # row 14  — BITE done
    "....##################..",   # row 15  — full body width
    ".....################...",   # row 16  — body taper begins
    "......##############....",   # row 17
    ".......############.....",   # row 18
    "........##########......",   # row 19
    ".........########.......",   # row 20
    "..........######........",   # row 21  — bottom tip
]
_APPLE_H = len(_APPLE_MASK)
_APPLE_W = len(_APPLE_MASK[0])


def is_apple(u: float, v: float) -> bool:
    """Look up (u, v) in the Apple-silhouette bitmap. (u, v) ∈ [-1, 1].
    Logo is constrained to the centered |u|, |v| < APPLE_HALF area of
    the top face — 1/9 of the face by area (1/3 linearly per side)."""
    if abs(u) > APPLE_HALF or abs(v) > APPLE_HALF:
        return False
    # Rescale (u, v) from [-APPLE_HALF, APPLE_HALF] → [-1, 1] for mask lookup.
    un = u / APPLE_HALF
    vn = v / APPLE_HALF
    col = (un + 1.0) * 0.5 * (_APPLE_W - 1)
    row = (1.0 - vn) * 0.5 * (_APPLE_H - 1)
    ic = int(round(col))
    ir = int(round(row))
    if ir < 0 or ir >= _APPLE_H or ic < 0 or ic >= _APPLE_W:
        return False
    return _APPLE_MASK[ir][ic] == '#'


def is_corner_cutoff(u: float, v: float) -> bool:
    """Round only the true CORNERS of each face (where both |u| and |v|
    are large), never the edge midpoints — so adjacent faces still meet
    along their shared edges and the box stays solid while the corners
    visibly round off.

    With inner = 0.72:
      edge midpoint (1, 0): du²        = 0.0784  → kept  (< 0.11)
      true corner   (1, 1): du² + dv²  = 0.1568  → cut   (> 0.11)
    The threshold sits between those two, so edges survive and corners
    arc away — a noticeably rounder silhouette than before."""
    du = max(0.0, abs(u) - 0.72)
    dv = max(0.0, abs(v) - 0.72)
    return du * du + dv * dv > 0.11


# M4 Mac mini port layout. Each port is small enough at projection size
# that adjacent ports read as DISCRETE holes, not as a continuous slot
# (the "disk tray" effect from the earlier oversized ports).
# (u, v) ∈ [-1, 1] face-local coords.

# --- Port-shape primitives ----------------------------------------------
# Sized from the actual M4 Mac mini back. Each port shape is a clearly
# different aspect ratio so the row reads correctly:
#
#  Power : LARGEST (chunky 2-prong C5/figure-8 plug). Wide AND tall.
#  Ethernet (RJ-45) : square-ish, smaller than power, taller than HDMI.
#  HDMI : wide flat rectangle, less tall than Ethernet.
#  USB-C (Thunderbolt): narrow thin slot, MUCH smaller than the others.

_POWER_RX, _POWER_RY = 0.0280, 0.0160   # widest + tallest
_ETH_RX,   _ETH_RY   = 0.0110, 0.0110   # square-ish
_HDMI_RX,  _HDMI_RY  = 0.0220, 0.0055   # wide flat
_USBC_RX,  _USBC_RY  = 0.0050, 0.0020   # narrow thin slot


def _hit(u, v, cx, rx, ry):
    return (u - cx) ** 2 / rx + (v ** 2) / ry < 1


def is_front_port(u: float, v: float) -> bool:
    """M4 front: 2 USB-C clustered on the left + headphone jack on the right."""
    if abs(v) > 0.15:
        return False
    return (
        _hit(u, v, -0.42, _USBC_RX, _USBC_RY) or   # USB-C 1
        _hit(u, v, -0.22, _USBC_RX, _USBC_RY) or   # USB-C 2
        _hit(u, v,  0.52, 0.0040, 0.0040)          # headphone jack (small round)
    )


def is_back_port(u: float, v: float) -> bool:
    """M4 back, left → right (matches the Apple product photo):
        power plug · Gigabit Ethernet · HDMI · Thunderbolt (USB-C) × 3"""
    if abs(v) > 0.16:
        return False
    return (
        _hit(u, v, -0.78, _POWER_RX, _POWER_RY) or   # power plug — biggest
        _hit(u, v, -0.42, _ETH_RX,   _ETH_RY)   or   # Gigabit Ethernet
        _hit(u, v, -0.13, _HDMI_RX,  _HDMI_RY)  or   # HDMI
        _hit(u, v,  0.25, _USBC_RX,  _USBC_RY)  or   # Thunderbolt 1
        _hit(u, v,  0.48, _USBC_RX,  _USBC_RY)  or   # Thunderbolt 2
        _hit(u, v,  0.71, _USBC_RX,  _USBC_RY)       # Thunderbolt 3
    )


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
                # Front face (z = +dD) — plot ports as explicit dark dots
                # instead of skipping, so they always show as discrete
                # holes regardless of what face is behind them.
                if is_front_port(uu, uu_h):
                    plot(u, vv_h, dD, PORT)
                else:
                    plot(u, vv_h, dD, FRONT)
                # Back face (z = -dD)
                if is_back_port(uu, uu_h):
                    plot(u, vv_h, -dD, PORT)
                else:
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
