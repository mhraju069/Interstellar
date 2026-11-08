export function startStarfield(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.55 + 0.2 }));
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const star of stars) {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = '#e8e6df';
      ctx.beginPath();
      ctx.arc(star.x * innerWidth, star.y * innerHeight, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
}
