// PerrisDavis.com — tiny progressive enhancement
// Three jobs: (1) year stamp, (2) reveal-on-scroll, (3) pause marquee on hover.

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
})();
