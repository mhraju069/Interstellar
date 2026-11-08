import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupTextSections } from './textSections.js';
import { CATCHUP_EASE, CROSSFADE_FRAMES, DPR_CAP, FILM_GRAIN_OPACITY, INTRO_FADE, LERP, MAX_PLAYBACK_FPS, MIN_PLAYBACK_FPS, MOBILE_PX_PER_FRAME, OUTRO_FADE, OUTRO_MAX_OPACITY, PREFETCH_AHEAD, PREFETCH_BEHIND, PX_PER_FRAME, SHARPEN, TITLE_RISE_DISTANCE } from './config.js';

gsap.registerPlugin(ScrollTrigger);

export function startTimeline(engine) {
  const track = document.querySelector('#scroll-track');
  const fade = document.querySelector('#fade');
  const story = document.querySelector('#story');
  story.style.visibility = 'hidden';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debugMode = new URLSearchParams(location.search).has('debug');
  const playRange = 1 - INTRO_FADE - OUTRO_FADE;
  const tuning = {
    pxPerFrame: engine.mobile ? MOBILE_PX_PER_FRAME : PX_PER_FRAME,
    lerp: LERP,
    crossfadeFrames: CROSSFADE_FRAMES,
    maxPlaybackFps: MAX_PLAYBACK_FPS,
    minPlaybackFps: MIN_PLAYBACK_FPS,
    catchupEase: CATCHUP_EASE,
    prefetchAhead: PREFETCH_AHEAD,
    prefetchBehind: PREFETCH_BEHIND,
  };
  engine.prefetchAhead = tuning.prefetchAhead;
  engine.prefetchBehind = tuning.prefetchBehind;
  const frameSpan = engine.total - 1;
  const introFrames = Math.min(frameSpan, Math.max(1, Math.round(engine.total * INTRO_FADE)));
  const outroFrames = Math.min(frameSpan - introFrames, Math.max(1, Math.round(engine.total * OUTRO_FADE)));
  const middleFrames = Math.max(0, frameSpan - introFrames - outroFrames);
  let targetFrame = 0;
  let currentFrame = 0;
  let lastDrawn = null;
  let skippedFrames = 0;
  let direction = 1;
  let fps = 0;
  let previousTime = performance.now();
  let progress = 0;
  let trigger;
  const lenis = new Lenis({
    autoRaf: false,
    smoothWheel: !reduced,
    lerp: tuning.lerp,
    wheelMultiplier: 0.8,
    virtualScroll: ({ deltaY }) => !(progress >= 1 && currentFrame < frameSpan - 0.02 && deltaY > 0),
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.lagSmoothing(0);

  const setTrackHeight = () => {
    const playbackSpace = engine.total * tuning.pxPerFrame;
    const introSpace = playbackSpace * INTRO_FADE / playRange;
    const outroSpace = playbackSpace * OUTRO_FADE / playRange;
    track.style.height = `${Math.max(1, Math.ceil(playbackSpace + introSpace + outroSpace))}px`;
  };
  setTrackHeight();

  trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom top',
    onUpdate(self) {
      progress = self.progress;
      const previousTarget = targetFrame;
      if (progress < INTRO_FADE) {
        targetFrame = (progress / INTRO_FADE) * introFrames;
      } else if (progress <= 1 - OUTRO_FADE) {
        targetFrame = introFrames + ((progress - INTRO_FADE) / playRange) * middleFrames;
      } else {
        targetFrame = frameSpan - outroFrames + ((progress - (1 - OUTRO_FADE)) / OUTRO_FADE) * outroFrames;
      }
      targetFrame = Math.max(0, Math.min(frameSpan, targetFrame));
      if (targetFrame !== previousTarget) direction = Math.sign(targetFrame - previousTarget);
      if (progress >= 1 && currentFrame < frameSpan - 0.02 && lenis.scroll > self.end + 1) {
        lenis.scrollTo(self.end, { immediate: true, force: true });
      }
    },
  });

  function refreshTrack() {
    const savedProgress = trigger.progress;
    setTrackHeight();
    lenis.resize();
    ScrollTrigger.refresh();
    const destination = trigger.start + (trigger.end - trigger.start) * savedProgress;
    lenis.scrollTo(destination, { immediate: true, force: true });
    ScrollTrigger.update();
  }

  let stats;
  let pxSlider;
  if (debugMode) {
    const panel = document.createElement('aside');
    panel.id = 'debug-panel';
    panel.setAttribute('aria-label', 'Live frame tuning');
    panel.innerHTML = '<strong>Live tuning</strong><div class="debug-controls"></div><div class="debug-stats" aria-live="polite"></div><button type="button" class="copy-values">Copy values</button>';
    document.querySelector('#experience').append(panel);
    const controls = panel.querySelector('.debug-controls');
    stats = panel.querySelector('.debug-stats');

    const addSlider = (key, label, min, max, step, format, onInput) => {
      const row = document.createElement('label');
      row.className = 'debug-slider';
      const name = document.createElement('span');
      name.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(tuning[key]);
      const output = document.createElement('output');
      const updateOutput = () => { output.value = format(Number(input.value)); };
      input.addEventListener('input', () => {
        tuning[key] = Number(input.value);
        updateOutput();
        onInput();
      });
      updateOutput();
      row.append(name, input, output);
      controls.append(row);
      return input;
    };

    pxSlider = addSlider('pxPerFrame', 'PX_PER_FRAME', 4, 40, 1, (v) => `${v}px`, refreshTrack);
    addSlider('lerp', 'LERP', 0.02, 0.3, 0.01, (v) => v.toFixed(2), () => { lenis.options.lerp = tuning.lerp; });
    addSlider('crossfadeFrames', 'CROSSFADE_FRAMES', 0, 20, 1, (v) => String(v), () => { engine.crossfadeFrames = tuning.crossfadeFrames; });
    addSlider('maxPlaybackFps', 'MAX_PLAYBACK_FPS', 30, 90, 1, (v) => `${v} fps`, () => {});
    addSlider('minPlaybackFps', 'MIN_PLAYBACK_FPS', 1, 30, 1, (v) => `${v} fps`, () => {});
    addSlider('catchupEase', 'CATCHUP_EASE', 3, 12, 0.5, (v) => v.toFixed(1), () => {});
    addSlider('prefetchAhead', 'PREFETCH_AHEAD', 60, 120, 1, (v) => `${v} frames`, () => { engine.prefetchAhead = tuning.prefetchAhead; });
    addSlider('prefetchBehind', 'PREFETCH_BEHIND', 10, 40, 1, (v) => `${v} frames`, () => { engine.prefetchBehind = tuning.prefetchBehind; });
    panel.querySelector('.copy-values').addEventListener('click', async (event) => {
      const desktopPx = engine.mobile ? PX_PER_FRAME : tuning.pxPerFrame;
      const mobilePx = engine.mobile ? tuning.pxPerFrame : MOBILE_PX_PER_FRAME;
      const button = event.currentTarget;
      const values = `export const PX_PER_FRAME = ${desktopPx};\nexport const LERP = ${tuning.lerp.toFixed(2)};\nexport const CROSSFADE_FRAMES = ${tuning.crossfadeFrames};\nexport const INTRO_FADE = ${INTRO_FADE};\nexport const OUTRO_FADE = ${OUTRO_FADE};\nexport const OUTRO_MAX_OPACITY = ${OUTRO_MAX_OPACITY};\nexport const MOBILE_PX_PER_FRAME = ${mobilePx};\nexport const DPR_CAP = ${DPR_CAP};\nexport const SHARPEN = ${SHARPEN};\nexport const FILM_GRAIN_OPACITY = ${FILM_GRAIN_OPACITY};\nexport const MAX_PLAYBACK_FPS = ${tuning.maxPlaybackFps};\nexport const MIN_PLAYBACK_FPS = ${tuning.minPlaybackFps};\nexport const CATCHUP_EASE = ${tuning.catchupEase};\nexport const PREFETCH_AHEAD = ${tuning.prefetchAhead};\nexport const PREFETCH_BEHIND = ${tuning.prefetchBehind};`;
      const valuesWithTitle = `${values}\nexport const TITLE_RISE_DISTANCE = ${TITLE_RISE_DISTANCE};`;
      try {
        await navigator.clipboard.writeText(valuesWithTitle);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Clipboard unavailable';
      }
      setTimeout(() => { button.textContent = 'Copy values'; }, 1200);
    });
  }

  function tick(now) {
    const dt = Math.max(0, (now - previousTime) / 1000);
    const difference = targetFrame - currentFrame;
    const stepDirection = Math.sign(difference);
    engine.prefetch(currentFrame, stepDirection || direction);
    let candidate = currentFrame;
    if (Math.abs(difference) < 0.02) {
      candidate = targetFrame;
    } else {
      const maxStep = tuning.maxPlaybackFps * dt;
      const ease = Math.abs(difference) * tuning.catchupEase * dt;
      const step = Math.min(Math.abs(difference), maxStep, Math.max(ease, tuning.minPlaybackFps * dt));
      candidate = currentFrame + Math.sign(difference) * step;
    }

    const displayedFrame = Math.round(currentFrame);
    let candidateFrame = Math.max(0, Math.min(frameSpan, Math.round(candidate)));
    if (Math.abs(candidateFrame - displayedFrame) > 1) {
      candidate = stepDirection > 0 ? displayedFrame + 0.5 : displayedFrame - 0.5001;
      candidateFrame = Math.max(0, Math.min(frameSpan, Math.round(candidate)));
    }
    if (candidateFrame !== displayedFrame && !engine.isReady(candidateFrame)) {
      engine.load(candidateFrame, true);
      candidate = currentFrame;
    }
    currentFrame = candidate;

    const frame = Math.max(0, Math.min(frameSpan, Math.round(currentFrame)));
    if (frame !== lastDrawn && engine.isReady(frame)) {
      if (lastDrawn !== null && Math.abs(frame - lastDrawn) > 1) skippedFrames++;
      lastDrawn = frame;
      engine.draw(frame, true, tuning.crossfadeFrames);
    } else if (!engine.isReady(frame)) {
      engine.load(frame, true);
    }
    if (dt > 0) fps = fps * 0.9 + (1 / dt) * 0.1;
    previousTime = now;
    if (stats) {
      const locationInFrames = engine.sceneAt(frame);
      stats.textContent = `Frame ${frame + 1}/${engine.total} · Scene ${locationInFrames.index + 1} · Scroll ${(progress * 100).toFixed(1)}% · ${fps.toFixed(0)} FPS`;
    }
    let opacity = 0;
    if (currentFrame < introFrames) opacity = 1 - currentFrame / introFrames;
    if (currentFrame > frameSpan - outroFrames) opacity = ((currentFrame - (frameSpan - outroFrames)) / outroFrames) * OUTRO_MAX_OPACITY;
    gsap.set(fade, { opacity: Math.max(0, Math.min(1, opacity)) });
    const reachedEnd = currentFrame >= frameSpan - 0.02 && targetFrame >= frameSpan - 0.02;
    const textScrollStarted = lenis.scroll > trigger.end + 1;
    const textVisible = reachedEnd && textScrollStarted;
    story.style.visibility = textVisible ? 'visible' : 'hidden';
    story.style.pointerEvents = textVisible ? 'auto' : 'none';
    if (stats) {
      const position = engine.sceneAt(frame);
      stats.textContent = `Frame ${frame + 1}/${engine.total} · Scene ${position.index + 1} · Scroll ${(progress * 100).toFixed(1)}% · ${fps.toFixed(0)} FPS\ncurrentFrame=${currentFrame.toFixed(2)} · targetFrame=${targetFrame.toFixed(2)} · gap=${Math.abs(targetFrame - currentFrame).toFixed(2)} · skipped frames: ${skippedFrames}`;
    }
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
    tick(performance.now());
  });
  setupTextSections(story, () => engine.total * tuning.pxPerFrame);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      engine.resize();
      const mobile = matchMedia('(max-width: 767px)').matches;
      if (mobile !== engine.mobile) {
        engine.setMobile(mobile);
        lastDrawn = null;
        tuning.pxPerFrame = mobile ? MOBILE_PX_PER_FRAME : PX_PER_FRAME;
        if (pxSlider) {
          pxSlider.value = String(tuning.pxPerFrame);
          pxSlider.parentElement.querySelector('output').value = `${tuning.pxPerFrame}px`;
        }
        refreshTrack();
      }
    }, 150);
  }, { passive: true });
}
