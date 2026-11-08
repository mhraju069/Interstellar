import './style.css';
import { FrameEngine } from './frameEngine.js';
import { startTimeline } from './scrollTimeline.js';
import { FILM_GRAIN_OPACITY } from './config.js';
import { initScrollHint } from './scrollHint.js';

const loader = document.querySelector('#loader');
const bar = loader.querySelector('i');
document.documentElement.style.setProperty('--grain-opacity', String(FILM_GRAIN_OPACITY));

async function boot() {
  try {
    const response = await fetch('/frames/manifest.json');
    if (!response.ok) throw new Error('Frame manifest is missing. Run bash scripts/optimize-frames.sh first.');
    const manifest = await response.json();
    if (!manifest.scenes?.length || manifest.scenes.some((scene) => !Number.isInteger(scene.count) || scene.count < 1)) {
      throw new Error('Frame manifest has no valid scenes.');
    }
    const engine = new FrameEngine(document.querySelector('#journey'), manifest, (progress) => { bar.style.transform = `scaleX(${progress})`; });
    const ready = await engine.prime(40);
    if (!ready) throw new Error('The first frame could not be decoded.');
    await engine.draw(0, false);
    startTimeline(engine);
    loader.classList.add('is-hidden');
    setTimeout(() => {
      loader.remove();
      initScrollHint();
    }, 900);
  } catch (error) {
    loader.querySelector('.loader-label').textContent = error.message;
    loader.classList.add('has-error');
    console.error(error);
  }
}

boot();
