// wikipediabrown.dev — parallax starfield
// 3 depth layers drifting slowly the same way; occasional shooting
// stars and a rare slow satellite. Subtle, paused when hidden, and
// reduced to a still sky when the user prefers reduced motion.

(() => {
  const canvas = document.getElementById('stars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  const reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Drift: every layer moves this way, scaled by depth (parallax).
  const DRIFT = { x: 7, y: -3 };           // px/sec for the nearest layer
  const LAYERS = [
    { depth: 0.30, size: [0.5, 0.9], alpha: [0.18, 0.40] }, // far
    { depth: 0.60, size: [0.7, 1.3], alpha: [0.30, 0.62] }, // mid
    { depth: 1.00, size: [0.9, 1.8], alpha: [0.45, 0.95] }, // near
  ];

  let dpr = 1, W = 0, H = 0, stars = [], shooters = [], sats = [];
  let nextShooter = 0, nextSat = 0, last = 0, raf = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const total = Math.min(240, Math.max(70, Math.round((W * H) / 7600)));
    const split = [0.52, 0.32, 0.16];
    stars = [];
    LAYERS.forEach((L, i) => {
      const n = Math.round(total * split[i]);
      for (let s = 0; s < n; s++) {
        stars.push({
          L,
          x: Math.random() * W,
          y: Math.random() * H,
          r: rnd(L.size[0], L.size[1]),
          a: rnd(L.alpha[0], L.alpha[1]),
          tw: Math.random() * Math.PI * 2,           // twinkle phase
          tws: rnd(0.4, 1.2),                        // twinkle speed
        });
      }
    });
  }

  function spawnShooter() {
    // start somewhere along the top / upper edges, travel down & across
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? rnd(-40, W * 0.5) : rnd(W * 0.5, W + 40);
    const y = rnd(-30, H * 0.35);
    const ang = (fromLeft ? rnd(20, 42) : rnd(138, 160)) * Math.PI / 180;
    const sp = rnd(680, 1100);
    shooters.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      len: rnd(120, 240), life: 0, max: rnd(0.7, 1.15),
    });
  }

  function spawnSat() {
    const edge = Math.floor(Math.random() * 3); // 0 top, 1 left, 2 right
    let x, y, ang;
    if (edge === 0) { x = rnd(0, W); y = -20; ang = rnd(60, 120); }
    else if (edge === 1) { x = -20; y = rnd(0, H * 0.7); ang = rnd(-25, 25); }
    else { x = W + 20; y = rnd(0, H * 0.7); ang = rnd(155, 205); }
    const sp = rnd(34, 60);
    sats.push({
      x, y, vx: Math.cos(ang * Math.PI / 180) * sp,
      vy: Math.sin(ang * Math.PI / 180) * sp, blink: Math.random() * Math.PI * 2,
    });
  }

  function drawStars(t, dt) {
    for (const s of stars) {
      if (!reduce) {
        s.x += DRIFT.x * s.L.depth * dt;
        s.y += DRIFT.y * s.L.depth * dt;
        if (s.x < -2) s.x = W + 2; else if (s.x > W + 2) s.x = -2;
        if (s.y < -2) s.y = H + 2; else if (s.y > H + 2) s.y = -2;
      }
      const a = reduce ? s.a
        : s.a * (0.75 + 0.25 * Math.sin(s.tw + t * s.tws));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236,237,234,' + a.toFixed(3) + ')';
      ctx.fill();
    }
  }

  function drawShooters(dt) {
    for (let i = shooters.length - 1; i >= 0; i--) {
      const m = shooters[i];
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const k = 1 - m.life / m.max;
      if (k <= 0 || m.x < -120 || m.x > W + 120 || m.y > H + 120) {
        shooters.splice(i, 1); continue;
      }
      const mag = Math.hypot(m.vx, m.vy) || 1;
      const tx = m.x - (m.vx / mag) * m.len;
      const ty = m.y - (m.vy / mag) * m.len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * k).toFixed(3) + ')');
      g.addColorStop(0.3, 'rgba(0,242,176,' + (0.35 * k).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,242,176,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();
    }
  }

  function drawSats(t, dt) {
    for (let i = sats.length - 1; i >= 0; i--) {
      const s = sats[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) {
        sats.splice(i, 1); continue;
      }
      const blink = 0.55 + 0.45 * Math.sin(s.blink + t * 4);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236,237,234,0.85)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,242,176,' + (0.5 * blink).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = 0; return; }
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;                 // clamp tab-switch jumps
    const t = now / 1000;

    ctx.clearRect(0, 0, W, H);
    drawStars(t, dt);

    if (now >= nextShooter) { spawnShooter(); nextShooter = now + rnd(5200, 13000); }
    if (now >= nextSat) { spawnSat(); nextSat = now + rnd(19000, 40000); }
    drawShooters(dt);
    drawSats(t, dt);
  }

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  });

  resize();

  if (reduce) {
    ctx.clearRect(0, 0, W, H);
    drawStars(0, 0);                          // a still sky, no motion
    return;
  }
  nextShooter = performance.now() + 2200;
  nextSat = performance.now() + 9000;
  raf = requestAnimationFrame(frame);
})();
