// PerrisDavis.com — tiny progressive enhancement
// Jobs: (1) year stamp, (2) pause marquee on hover,
//       (3) rotating ASCII Mac mini stack in the hero.

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

  // --- (3) rotating wireframe stack of Mac minis -------------------------
  // 3D ASCII renderer: 6 stacked rectangular boxes (Mac mini proportions),
  // perspective-projected and drawn as a see-through wireframe.
  startTower();
})();

function startTower() {
  const el = document.getElementById('ascii-art');
  if (!el) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ----- Geometry (Mac mini box, stacked) -------------------------------
  const N    = 8;     // number of minis
  const w    = 1.55;  // half-width  (Mac mini is square in plan)
  const d    = 1.55;  // half-depth
  const h    = 0.22;  // half-height (each mini is flat)
  const gap  = 0.08;  // gap between minis

  const slabH = 2 * h;
  const stepH = slabH + gap;
  const totalH = N * slabH + (N - 1) * gap;
  const y0Base = -totalH / 2;

  // Build vertices (8 per slab) and edges (12 per slab).
  const verts = [];
  const edges = [];
  for (let i = 0; i < N; i++) {
    const yLo = y0Base + i * stepH;
    const yHi = yLo + slabH;
    const b = verts.length;
    verts.push(
      [-w, yLo, -d], [ w, yLo, -d], [ w, yLo,  d], [-w, yLo,  d], // bottom rect
      [-w, yHi, -d], [ w, yHi, -d], [ w, yHi,  d], [-w, yHi,  d]  // top rect
    );
    edges.push(
      [b+0, b+1], [b+1, b+2], [b+2, b+3], [b+3, b+0],  // bottom rect
      [b+4, b+5], [b+5, b+6], [b+6, b+7], [b+7, b+4],  // top rect
      [b+0, b+4], [b+1, b+5], [b+2, b+6], [b+3, b+7]   // verticals
    );
  }

  // ----- View transform -------------------------------------------------
  const W = 56, H = 30;            // ASCII grid (chars are taller than wide)
  const tilt = 0.36;               // fixed X-tilt: lets us see the top a bit
  const cT = Math.cos(tilt), sT = Math.sin(tilt);
  const camDist = 5.4;             // perspective camera distance
  const fxH = 22;                  // horizontal projection scale (px / unit)
  const fxV = 13;                  // vertical projection scale  (chars are tall)

  // Light direction for shaded line-color glyph (subtle highlight on front edges)
  // — we don't shade; we just pick characters by slope. Kept simple by design.

  let A = 0;

  function projectAll(cA, sA) {
    const proj = new Array(verts.length);
    for (let i = 0; i < verts.length; i++) {
      const [x, y, z] = verts[i];
      // Rotate around Y axis (the tower spins on its vertical axis)
      const xr =  x * cA + z * sA;
      const zr = -x * sA + z * cA;
      // Tilt forward around X axis (so we see the top faces a bit)
      const yt = y * cT - zr * sT;
      const zt = y * sT + zr * cT;
      // Perspective: camera looking down +z toward origin from -camDist
      const Dinv = 1 / (zt + camDist);
      const sx = W / 2 + fxH * Dinv * xr;
      const sy = H / 2 - fxV * Dinv * yt;
      proj[i] = [sx, sy, zt];
    }
    return proj;
  }

  function frame() {
    if (document.hidden) {
      requestAnimationFrame(frame);
      return;
    }

    const cA = Math.cos(A), sA = Math.sin(A);
    const out = new Array(W * H).fill(' ');

    const proj = projectAll(cA, sA);

    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i];
      const [x0, y0] = proj[a];
      const [x1, y1] = proj[b];
      drawLine(out, W, H, x0, y0, x1, y1);
    }

    let buf = '';
    for (let r = 0; r < H; r++) {
      const start = r * W;
      buf += out.slice(start, start + W).join('') + '\n';
    }
    el.textContent = buf;

    A += 0.018;
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// Wireframe line on a character grid.
// Picks glyph by slope: '-' horizontal, '|' vertical, '/' or '\' diagonal.
// No hidden-line removal — classic see-through wireframe.
function drawLine(out, W, H, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const steps = Math.ceil(Math.max(adx, ady));
  if (steps <= 0) return;

  let ch;
  if (adx > 2.4 * ady)      ch = '-';
  else if (ady > 2.4 * adx) ch = '|';
  else if (dx * dy > 0)     ch = '\\';
  else                      ch = '/';

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + t * dx);
    const y = Math.round(y0 + t * dy);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    out[x + W * y] = ch;
  }
}
