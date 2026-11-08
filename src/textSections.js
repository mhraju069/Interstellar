import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { startStarfield } from './starfield.js';
import { TITLE_RISE_DISTANCE } from './config.js';

const panels = [
  ['The Descent', 'Below us, an ocean of cloud with no shore.<br>Above us, a ring of fire bent by gravity itself.'],
  ['The Silence', 'Out here, time is not a constant.<br>An hour can cost a lifetime.'],
  ['The Weight', 'Every second near the edge is borrowed.<br>We pay it back in years we will never see.'],
  ['The Signal', 'Across distance and time, something still answers.<br>Love and memory travel where nothing else can.'],
];

export function setupTextSections(root) {
  root.innerHTML = `
    <canvas id="starfield" aria-hidden="true"></canvas>
    <section class="title-section text-section"><div class="title-copy"><p class="eyebrow">AN ODYSSEY THROUGH SPACE AND TIME</p><h1>BEYOND THE HORIZON</h1><p class="subtitle">Some journeys are measured in light-years. Some in choices.</p></div></section>
    <section class="gallery text-section" aria-label="The journey">${panels.map(([title, body], i) => `<article class="panel"><span class="panel-number">0${i + 1}</span><div><h2>${title}</h2><p>${body}</p></div></article>`).join('')}</section>
    <section class="closing text-section"><p>We were never meant to stay on Earth.<br>We were meant to look up.</p><small>A scroll experience inspired by the cosmos.</small></section>`;

  startStarfield(root.querySelector('#starfield'));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const title = root.querySelector('h1');
  title.innerHTML = [...title.textContent].map((char) => `<span>${char === ' ' ? '&nbsp;' : char}</span>`).join('');
  const titleSection = root.querySelector('.title-section');
  const titleCopy = root.querySelector('.title-copy');
  gsap.set(titleCopy, { scale: 0, transformOrigin: '50% 50%' });
  gsap.to(titleCopy, {
    scale: 1, ease: 'none',
    scrollTrigger: {
      trigger: titleSection,
      start: 'top top',
      end: `+=${TITLE_RISE_DISTANCE}`,
      scrub: 1.5,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
  const gallery = root.querySelector('.gallery');
  if (!reduced) {
    gsap.to(gallery.querySelectorAll('.panel'), {
      xPercent: -100 * (panels.length - 1), ease: 'none',
      scrollTrigger: { trigger: gallery, start: 'top top', end: '+=3000', scrub: 1, pin: true, invalidateOnRefresh: true },
    });
  }
  gsap.fromTo(root.querySelector('.closing p'), { opacity: 0, ...(reduced ? {} : { letterSpacing: '0.6em' }) }, {
    opacity: 1, ...(reduced ? {} : { letterSpacing: '0.2em' }), duration: reduced ? 0.8 : 2,
    scrollTrigger: { trigger: '.closing', start: 'top 75%' },
  });
}
