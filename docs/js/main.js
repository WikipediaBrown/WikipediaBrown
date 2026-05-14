// PerrisDavis.com — tiny progressive enhancement
// Jobs:
//   (1) mobile nav toggle (accessible hamburger)
//   (2) pause marquee on hover
//   (3) frame-by-frame ASCII animations: a typing reveal that types each
//       photo-derived ASCII piece in line-by-line, holds, restarts.

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

  // --- (3) ASCII frame-by-frame typing reveals --------------------------
  // Mac mini ASCII lives in JS (preserved from the image-to-ASCII pipeline);
  // typewriter & envelope ASCII live inline in their pages — we read them
  // from textContent once, then drive the reveal animation from JS.

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

  if (mac)      driveReveal(mac, MAC_MINI, { lineMs: 60, holdMs: 3200, clearMs: 700 });
  if (blog)     driveReveal(blog, blog.textContent, { lineMs: 55, holdMs: 3600, clearMs: 700 });
  if (contact)  driveReveal(contact, contact.textContent, { lineMs: 80, holdMs: 3800, clearMs: 700 });
})();

// Frame-by-frame typing reveal:
//   frame 0:  ""
//   frame 1:  line[0]
//   frame N:  line[0..N-1]
//   then HOLD at the full art, blank, then restart.
// All frames are rendered as a single textContent set — atomic, no flicker
// (the "double buffering" tip from the user's guide).
function driveReveal(el, fullText, opts) {
  const o = Object.assign({ lineMs: 70, holdMs: 3000, clearMs: 600 }, opts || {});

  // Respect reduced motion: render full art and stop.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fullText;
    return;
  }

  const lines = fullText.split('\n');
  const total = lines.length;
  let i = 0;

  // Pad to the full height with spaces so the element's box doesn't reflow
  // each frame — reserves the canvas, as the user's guide recommends.
  const padTo = (n) => {
    const head = lines.slice(0, n).join('\n');
    const padding = '\n'.repeat(Math.max(0, total - n));
    return head + padding;
  };

  function tick() {
    if (document.hidden) { setTimeout(tick, 300); return; }

    if (i <= total) {
      el.textContent = padTo(i);
      i += 1;
      setTimeout(tick, i === total + 1 ? o.holdMs : o.lineMs);
    } else {
      // Clear and restart
      el.textContent = padTo(0);
      i = 0;
      setTimeout(tick, o.clearMs);
    }
  }
  tick();
}
