// PerrisDavis.com — tiny progressive enhancement
// Jobs: (1) mobile nav toggle, (2) pause marquee on hover, (3) static ASCII Mac mini.

(() => {
  // --- (1) Mobile nav: hamburger toggle ---------------------------------
  // Accessibility: real <button>, aria-expanded reflects state, focus moves
  // into the menu on open, Escape closes, click-outside closes.
  const toggle = document.querySelector('.nav__toggle');
  const menu   = document.getElementById('nav-menu');
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
      if (open) {
        // Move focus to the first link in the menu for keyboard users.
        const firstLink = menu.querySelector('a');
        if (firstLink) firstLink.focus();
      }
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
    });
    // Close on Escape, click-outside, or after an anchor link is followed.
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

  // --- (2) pause the marquee on hover -----------------------------------
  const track = document.querySelector('.marquee__track');
  if (track) {
    const marquee = track.parentElement;
    marquee.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    marquee.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  }

  // --- (3) static ASCII Mac mini ----------------------------------------
  // Hand-drawn isometric — CSS does the 3D rotation via rotateY+rotateX with
  // perspective. The GPU foreshortens the text characters as it rotates.
  paintMacMini();
})();

function paintMacMini() {
  const el = document.getElementById('ascii-art');
  if (!el) return;
  el.textContent = [
    "         _________________________________________",
    "       /                                          \\",
    "      /                                            \\",
    "     /                                              \\",
    "    /                     *                          \\",
    "   /                                                  \\",
    "  /____________________________________________________\\",
    "  |                                                    |",
    "  |                                                    |",
    "  |     o  o                                           |",
    "  |____________________________________________________|"
  ].join("\n");
}
