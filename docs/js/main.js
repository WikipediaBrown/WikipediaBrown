// PerrisDavis.com — tiny progressive enhancement
// Jobs:
//   (1) accessible mobile-nav hamburger
//   (2) pause marquee on hover
//   (3) rotating 3D ASCII object — frames live in a per-page file
//       (frames-macmini.js / frames-book.js / frames-envelope.js) that
//       sets window.ASCII_FRAMES. Generator: docs/_tools/ascii3d.py.

(() => {
  // --- (1) Mobile nav hamburger -----------------------------------------
  const toggle = document.querySelector('.nav__toggle');
  const menu   = document.getElementById('nav-menu');
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
      if (open) { const f = menu.querySelector('a'); if (f) f.focus(); }
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false); toggle.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.target.closest('.nav')) return;
      setOpen(false);
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  }

  // --- (2) Pause marquee on hover ---------------------------------------
  const track = document.querySelector('.marquee__track');
  if (track) {
    const m = track.parentElement;
    m.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    m.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  }

  // --- (3) Mount the rotating ASCII object ------------------------------
  // Whichever page we're on, the ASCII <pre> uses id="ascii-art" and the
  // page has loaded the matching frames file (window.ASCII_FRAMES).
  const el = document.getElementById('ascii-art');
  if (el && Array.isArray(window.ASCII_FRAMES)) {
    cycleFrames(el, window.ASCII_FRAMES, { fps: 7 });
  }

  // --- (4) Dress code blocks as macOS-style windows + copy --------------
  // Only real language blocks (not the plaintext ASCII diagram) get chrome.
  document.querySelectorAll('.post__body [class*="language-"].highlighter-rouge')
    .forEach((win) => {
      if (win.classList.contains('language-plaintext')) return;
      win.classList.add('codewin');

      const bar = document.createElement('div');
      bar.className = 'codewin__bar';

      const dots = document.createElement('span');
      dots.className = 'codewin__dots';
      dots.setAttribute('aria-hidden', 'true');
      for (let d = 0; d < 3; d++) dots.appendChild(document.createElement('i'));

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'codewin__copy';
      copy.textContent = 'Copy';
      copy.setAttribute('aria-label', 'Copy code to clipboard');

      bar.appendChild(dots);
      bar.appendChild(copy);
      win.insertBefore(bar, win.firstChild);

      copy.addEventListener('click', async () => {
        const code = win.querySelector('code');
        const text = code ? code.textContent : '';
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          }
          copy.textContent = 'Copied';
          copy.classList.add('is-copied');
        } catch (_) {
          copy.textContent = 'Press ⌘C';
        }
        clearTimeout(copy._t);
        copy._t = setTimeout(() => {
          copy.textContent = 'Copy';
          copy.classList.remove('is-copied');
        }, 1600);
      });
    });
})();

function cycleFrames(el, frames, opts) {
  const o = Object.assign({ fps: 8 }, opts || {});
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = frames[0];
    return;
  }
  const period = 1000 / o.fps;
  let i = 0, last = 0;
  function step(now) {
    if (document.hidden) { setTimeout(() => requestAnimationFrame(step), 250); return; }
    if (!last || now - last >= period) {
      el.textContent = frames[i];
      i = (i + 1) % frames.length;
      last = now;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
