// PerrisDavis.com — tiny progressive enhancement
// Jobs: (1) year stamp, (2) reveal-on-scroll, (3) pause marquee on hover,
//       (4) rotating ASCII torus in the hero.

(() => {
  // --- (1) current year in the colophon ----------------------------------
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  // --- (2) reveal sections as they enter the viewport --------------------
  const targets = document.querySelectorAll('.section, .marquee');
  targets.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(el => io.observe(el));
  } else {
    targets.forEach(el => el.classList.add('in'));
  }

  // --- (3) pause the marquee on hover, gently ----------------------------
  const track = document.querySelector('.marquee__track');
  if (track) {
    const marquee = track.parentElement;
    marquee.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    marquee.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  }

  // --- (4) rotating ASCII torus (donut) ----------------------------------
  // Direct port of Andy Sloane's donut.c: parametric torus,
  // perspective-projected onto a character grid with Lambertian shading.
  startDonut();
})();

function startDonut() {
  const el = document.getElementById('ascii-art');
  if (!el) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Character grid (width × height). Tuned so the torus reads at this scale.
  const W = 64, H = 26;
  const shades = '.,-~:;=!*#$@';

  let A = 0, B = 0;
  let lastVisible = !document.hidden;

  function frame() {
    if (document.hidden) {
      // Pause when tab is backgrounded; resume cleanly.
      lastVisible = false;
      requestAnimationFrame(frame);
      return;
    }
    if (!lastVisible) {
      lastVisible = true;
    }

    const cA = Math.cos(A), sA = Math.sin(A);
    const cB = Math.cos(B), sB = Math.sin(B);

    const out = new Array(W * H).fill(' ');
    const z   = new Array(W * H).fill(0);

    // theta sweeps the small circle (tube), phi sweeps the big circle.
    for (let theta = 0; theta < 6.283; theta += 0.07) {
      const cT = Math.cos(theta), sT = Math.sin(theta);
      for (let phi = 0; phi < 6.283; phi += 0.02) {
        const cP = Math.cos(phi), sP = Math.sin(phi);

        const circ = cT + 2;                       // R2 + R1·cos(theta), with R1=2, R2=1
        const Dinv = 1 / (sP * circ * sA + sT * cA + 5);   // 1/(z-distance to camera)
        const tt   = sP * circ * cA - sT * sA;

        const x = Math.floor(W / 2 + 30 * Dinv * (cP * circ * cB - tt * sB));
        const y = Math.floor(H / 2 - 14 * Dinv * (cP * circ * sB + tt * cB));
        const o = x + W * y;

        // Lambertian shading via the normal · light dot product.
        const lum = (sT * sA - sP * cT * cA) * cB - sP * cT * sA - sT * cA - cP * cT * sB;
        const idx = Math.floor(lum * 8);

        if (y >= 0 && y < H && x >= 0 && x < W && Dinv > z[o]) {
          z[o] = Dinv;
          out[o] = shades[idx > 0 ? idx : 0];
        }
      }
    }

    // Compose to a single string with newlines per row.
    let buf = '';
    for (let row = 0; row < H; row++) {
      const start = row * W;
      buf += out.slice(start, start + W).join('') + '\n';
    }
    el.textContent = buf;

    A += 0.035;
    B += 0.018;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
