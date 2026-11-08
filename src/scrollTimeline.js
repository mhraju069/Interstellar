import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupTextSections } from './textSections.js';
export { startTimeline } from './scrollTimelineTuned.js';

gsap.registerPlugin(ScrollTrigger);

function legacyStartTimeline(engine) {
  const track = document.querySelector('#scroll-track');
  const fade = document.querySelector('#fade');
  const story = document.querySelector('#story');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 767px)').matches;
  const pxPerFrame = mobile ? 4 : 6;
  track.style.height = `${Math.max(1, engine.total * pxPerFrame)}px`;

  const lenis = new Lenis({ autoRaf: false, smoothWheel: !reduced, lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.lagSmoothing(0);

  let target = 0;
  let current = 0;
  let lastDrawn = -1;
  let fps = 0;
  let previousTime = performance.now();
  const debug = document.querySelector('#debug');
  const frameSpan = engine.total - 1;

  ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate(self) {
      const p = self.progress;
      if (p < 0.06) {
        target = 0;
        gsap.set(fade, { opacity: 1 - p / 0.06 });
        story.style.pointerEvents = 'none';
      } else if (p <= 0.88) {
        target = ((p - 0.06) / 0.82) * frameSpan;
        gsap.set(fade, { opacity: 0 });
      } else {
        target = frameSpan;
        gsap.set(fade, { opacity: Math.min(1, (p - 0.88) / 0.06) });
        story.style.pointerEvents = p > 0.94 ? 'auto' : 'none';
      }
    },
  });

  const debugMode = new URLSearchParams(location.search).has('debug');
  function tick(now) {
    current += (target - current) * (reduced ? 1 : 0.12);
    const frame = Math.round(current);
    if (frame !== lastDrawn) {
      lastDrawn = frame;
      engine.draw(frame);
    }
    const dt = now - previousTime;
    if (dt > 0) fps = fps * 0.9 + (1000 / dt) * 0.1;
    previousTime = now;
    if (debugMode) {
      const position = engine.sceneAt(frame);
      debug.textContent = `frame ${frame + 1}/${engine.total} · scene ${position.index + 1} · ${fps.toFixed(0)} fps`;
      debug.hidden = false;
    }
  }
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
    tick(performance.now());
  });

  setupTextSections(story, () => engine.total * pxPerFrame);
  const resize = () => engine.resize();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); }, { passive: true });
}
