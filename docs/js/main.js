// PerrisDavis.com — tiny progressive enhancement
// Jobs:
//   (1) accessible mobile-nav hamburger
//   (2) pause marquee on hover
//   (3) frame-by-frame ASCII "decryption" animations — each cell starts as
//       a random glyph and settles to its real value over a pattern unique
//       to its subject (radial for Mac mini, left→right for typewriter,
//       top→bottom for envelope).

(() => {
  // --- (1) Mobile nav hamburger -----------------------------------------
  const toggle = document.querySelector('.nav__toggle');
  const menu   = document.getElementById('nav-menu');
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
      if (open) {
        const firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.target.closest('.nav')) return;
      setOpen(false);
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
  }

  // --- (2) Pause marquee on hover ---------------------------------------
  const track = document.querySelector('.marquee__track');
  if (track) {
    const marquee = track.parentElement;
    marquee.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    marquee.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  }

  // --- (3) ASCII decryption animations ----------------------------------
  const MAC_MINI = [
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@%@@%%%",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%@@@%%%%%%%",
    "@@@@@@%%%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%%@@@@@%%",
    "::::+%%%%@@@@@@@@@@@@@#+;;;+··;+%@@@@@@@@@@@%%%%##+:::::",
    ";;;:#%%@@@@@@@@@@@@@@@+         :#@@@@@@@@@%%%%%##+·::::",
    "@@@@@@@@@@@@@@@@@@@@@@@@%##%%###%@@@@@@@%%%%%%%######@@@",
    "%%%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%###**#%",
    "%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%##",
    "+:*%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#+:#",
    "%   ·:::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::·  ·%",
    "%: ..··············································.  *%",
    "%* ..·:::::::::::::::::::::::::::::::::::::::::::··. .%#",
    "*#. ··:::::::::::::::::::::::::::::::::::::::::::··. :**",
    "#%; ··:::::··:::::·::::::::::::::::::::;::::·::::··. :++",
    "##+.··:::::..::::: ·::::::::::::::::::;;:::·.:::··. .::;",
    "**:..·::::::::::::::::::::::::::::::::::::::::::·.. ·:::",
    "#*:·  .····::············::···················...   ·::;"
  ].join("\n");

  const mac      = document.getElementById('ascii-art');
  const blog     = document.getElementById('blog-ascii');
  const contact  = document.getElementById('contact-ascii');

  if (mac)     driveDecrypt(mac,     MAC_MINI,           { pattern: 'radial', durationMs: 1800, holdMs: 3200, tickMs: 55 });
  if (blog)    driveDecrypt(blog,    blog.textContent,   { pattern: 'ltr',    durationMs: 2100, holdMs: 3600, tickMs: 55 });
  if (contact) driveDecrypt(contact, contact.textContent,{ pattern: 'ttb',    durationMs: 2300, holdMs: 3800, tickMs: 55 });
})();

// --- driveDecrypt: a "settle-from-noise" frame animation -------------------
// At t=0 every non-space cell shows a random glyph; over `durationMs`, each
// cell flips to its real value at a moment determined by `pattern`:
//   - 'radial': cells near the centroid settle first, expanding outward
//   - 'ltr':    columns settle left-to-right
//   - 'ttb':    rows settle top-to-bottom
// After the full art is revealed it holds for holdMs, then restarts.
function driveDecrypt(el, fullText, opts) {
  const o = Object.assign({ pattern: 'radial', durationMs: 1800, holdMs: 3000, tickMs: 60 }, opts || {});

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fullText;
    return;
  }

  // Pre-parse the art into a row-major grid.
  const lines = fullText.split('\n');
  const rows  = lines.length;
  const cols  = lines.reduce((m, l) => Math.max(m, l.length), 0);

  // Build a settle-time map for each (row, col) cell.
  // Space cells keep their settleAt = 0 (always show the real char — a space)
  // so the animation reveals only the inked silhouette.
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxR = Math.hypot(cx, cy) || 1;

  // 2D arrays of length rows × cols
  const real    = [];
  const settle  = [];
  for (let r = 0; r < rows; r++) {
    const realRow = new Array(cols).fill(' ');
    const settleRow = new Array(cols).fill(0);
    const line = lines[r];
    for (let c = 0; c < cols; c++) {
      const ch = c < line.length ? line[c] : ' ';
      realRow[c] = ch;
      if (ch === ' ') { settleRow[c] = 0; continue; }

      let t;
      switch (o.pattern) {
        case 'ltr': {
          t = (c / Math.max(1, cols - 1)) * 0.85;
          break;
        }
        case 'ttb': {
          t = (r / Math.max(1, rows - 1)) * 0.85;
          break;
        }
        case 'radial':
        default: {
          const d = Math.hypot(c - cx, r - cy) / maxR;
          t = d * 0.85;
          break;
        }
      }
      // Add a little jitter so the wave doesn't look too clean.
      t += Math.random() * 0.18;
      settleRow[c] = Math.min(1, t) * o.durationMs;
    }
    real.push(realRow);
    settle.push(settleRow);
  }

  // Pool of glyphs to flicker through. Lean toward what the art uses so the
  // pre-settled cells visually rhyme with the destination.
  const NOISE = ' .,:;+*#%@!?/\\<>|=~$&^()[]{}0123456789';
  const noise = () => NOISE[1 + ((Math.random() * (NOISE.length - 1)) | 0)];

  let phase = 'decrypt';   // 'decrypt' → 'hold' → (reset) → 'decrypt'
  let t0 = performance.now();

  function frame(now) {
    if (document.hidden) {
      // Pause when tab is backgrounded — no wasted re-renders.
      setTimeout(() => requestAnimationFrame(frame), 250);
      return;
    }

    const elapsed = now - t0;

    if (phase === 'decrypt') {
      // Build the current frame in one pass; assign textContent once
      // (double-buffer — atomic update, no flicker).
      const out = [];
      for (let r = 0; r < rows; r++) {
        let line = '';
        for (let c = 0; c < cols; c++) {
          const ch = real[r][c];
          if (ch === ' ' || elapsed >= settle[r][c]) {
            line += ch;
          } else {
            line += noise();
          }
        }
        out.push(line);
      }
      el.textContent = out.join('\n');

      if (elapsed >= o.durationMs + 100) {
        phase = 'hold';
        t0 = now;
      }
    } else { // hold
      if (elapsed >= o.holdMs) {
        phase = 'decrypt';
        t0 = now;
      }
      // otherwise: textContent already shows the final art, no-op
    }

    setTimeout(() => requestAnimationFrame(frame), o.tickMs);
  }
  requestAnimationFrame(frame);
}
