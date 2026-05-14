// PerrisDavis.com — tiny progressive enhancement
// Jobs: (1) year stamp, (2) pause marquee on hover,
//       (3) rotating ASCII Mac mini (solid surface rendering) in the hero.

(() => {
  // --- (1) current year in the colophon ----------------------------------
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  // Scroll-triggered reveals removed — caused invisible sections for fast
  // scroll, anchor links, and headless capture. Hero entrance animation
  // (CSS @keyframes, no observer) still provides the page-load motion.

  // --- (2) pause the marquee on hover, gently ----------------------------
  const track = document.querySelector('.marquee__track');
  if (track) {
    const marquee = track.parentElement;
    marquee.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    marquee.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  }

  // --- (3) rotating ASCII Mac mini ---------------------------------------
  // Solid-surface 3D renderer: chunky cube (M4 Mac mini proportions, 5"×5"×2"),
  // per-face Lambertian shading, perspective projection, z-buffered.
  startMacMini();
})();

function startMacMini() {
  const el = document.getElementById('ascii-art');
  if (!el) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ----- Geometry (M4 Mac mini, half-dimensions) ------------------------
  // Real M4 Mac mini: 5" × 5" × 2"  →  half-dims 2.5, 2.5, 1.0
  // Slight visual tuning to make the top face read clearly.
  const w = 2.5;   // half-width
  const d = 2.5;   // half-depth
  const h = 1.0;   // half-height  (h/w = 0.4 — the M4 cube)

  // ----- View transform -------------------------------------------------
  const W = 60, H = 30;
  const tilt = 0.55;                       // X tilt — show the top
  const cT = Math.cos(tilt), sT = Math.sin(tilt);
  const camDist = 3.6;
  const fxH = 13;                          // horizontal projection scale
  const fxV = 10;                          // vertical projection scale

  // ----- Lighting -------------------------------------------------------
  // Directional light from upper-front-right (light vector points FROM that
  // direction toward the scene). Surfaces are brightest when their normal
  // opposes this vector — i.e. the top of the cube under a top-front light.
  const Lraw = [-0.30, -0.85, -0.40];
  const Llen = Math.hypot(Lraw[0], Lraw[1], Lraw[2]);
  const L = [Lraw[0] / Llen, Lraw[1] / Llen, Lraw[2] / Llen];

  // ----- Faces of the box ----------------------------------------------
  // Each face is parameterized over (u, v) ∈ [-1, 1]² mapping to its 3D
  // surface in local box coordinates. Local normal is constant per face.
  // Order: top, front (z=+d), back (z=-d), right (x=+w), left (x=-w).
  // Bottom is omitted — never visible under the chosen tilt.
  const faces = [
    { fn: (u, v) => [u * w,     h,     v * d ], n: [ 0,  1,  0] }, // top
    { fn: (u, v) => [u * w,  v * h,        d ], n: [ 0,  0,  1] }, // front
    { fn: (u, v) => [u * w,  v * h,       -d ], n: [ 0,  0, -1] }, // back
    { fn: (u, v) => [    w,  v * h,   u * d ],  n: [ 1,  0,  0] }, // right
    { fn: (u, v) => [   -w,  v * h,   u * d ],  n: [-1,  0,  0] }, // left
  ];

  const shades = ' .,:;!=*#$@';            // 11 brightness levels

  let A = 0;

  function frame() {
    if (document.hidden) {
      requestAnimationFrame(frame);
      return;
    }

    const cA = Math.cos(A), sA = Math.sin(A);
    const out  = new Array(W * H).fill(' ');
    const zbuf = new Array(W * H).fill(Infinity);

    for (let f = 0; f < faces.length; f++) {
      const face = faces[f];

      // --- Transform the face normal: Y-rotation, then X-tilt (negative
      //     so the top of the world tips TOWARD the camera, exposing the top
      //     face — the previous direction was culling the top face) -------
      const [nx0, ny0, nz0] = face.n;
      const nx1 =  nx0 * cA + nz0 * sA;
      const ny1 =  ny0;
      const nz1 = -nx0 * sA + nz0 * cA;
      const nx2 =  nx1;
      const ny2 =  ny1 * cT + nz1 * sT;
      const nz2 = -ny1 * sT + nz1 * cT;

      // Camera looks from -z toward +z; faces with normal pointing at
      // camera have nz2 < 0. Back-face cull with a small tolerance.
      if (nz2 >= -0.01) continue;

      // Lambertian: brightness ∝ -dot(N, L), clamped to [0, 1].
      const lambert = -(nx2 * L[0] + ny2 * L[1] + nz2 * L[2]);
      const brightness = Math.min(1, Math.max(0, lambert));
      const ch = shades[Math.min(shades.length - 1, Math.floor(brightness * shades.length))];

      // --- Sample the face surface densely -----------------------------
      const STEP = 0.035;
      for (let u = -1; u <= 1; u += STEP) {
        for (let v = -1; v <= 1; v += STEP) {
          const [px0, py0, pz0] = face.fn(u, v);

          // Y-rotation
          const px1 =  px0 * cA + pz0 * sA;
          const py1 =  py0;
          const pz1 = -px0 * sA + pz0 * cA;
          // X-tilt (negative — same direction as normal transform above)
          const px2 =  px1;
          const py2 =  py1 * cT + pz1 * sT;
          const pz2 = -py1 * sT + pz1 * cT;

          // Perspective project (camera at z = -camDist)
          const Dinv = 1 / (pz2 + camDist);
          if (Dinv <= 0) continue;
          const sx = W / 2 + fxH * Dinv * px2;
          const sy = H / 2 - fxV * Dinv * py2;
          const ix = Math.round(sx);
          const iy = Math.round(sy);
          if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;

          const idx = ix + W * iy;
          if (pz2 < zbuf[idx]) {
            zbuf[idx] = pz2;
            out[idx]  = ch;
          }
        }
      }
    }

    // --- Apple-logo marker on the top face --------------------------------
    // The top face is brightest, so a "dimmer" character at its center reads
    // as a logo silhouette. We project the top-face centroid in world space.
    {
      const cx = 0, cy = h, cz = 0;
      const px1 =  cx * cA + cz * sA;
      const py1 =  cy;
      const pz1 = -cx * sA + cz * cA;
      const px2 =  px1;
      const py2 =  py1 * cT + pz1 * sT;
      const pz2 = -py1 * sT + pz1 * cT;
      const Dinv = 1 / (pz2 + camDist);
      if (Dinv > 0) {
        const sx = W / 2 + fxH * Dinv * px2;
        const sy = H / 2 - fxV * Dinv * py2;
        const ix = Math.round(sx);
        const iy = Math.round(sy);
        if (ix >= 0 && ix < W && iy >= 0 && iy < H) {
          const idx = ix + W * iy;
          if (pz2 - 0.01 < zbuf[idx]) {
            out[idx] = '*';
          }
        }
      }
    }

    let buf = '';
    for (let r = 0; r < H; r++) {
      const start = r * W;
      buf += out.slice(start, start + W).join('') + '\n';
    }
    el.textContent = buf;

    A += 0.015;
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
