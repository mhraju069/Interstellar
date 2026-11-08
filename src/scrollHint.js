import { SCROLL_HINT_COLOR, SCROLL_HINT_ENABLED, SCROLL_HINT_HIDE_AT, SCROLL_HINT_SHOW_TEXT } from './config.js';

export function initScrollHint() {
  const wrapper = document.querySelector('#scroll-hint');
  if (!wrapper) return;
  if (!SCROLL_HINT_ENABLED) {
    wrapper.remove();
    return;
  }

  const icon = wrapper.querySelector('.scrolldown');
  icon.style.setProperty('--color', SCROLL_HINT_COLOR);
  if (SCROLL_HINT_SHOW_TEXT) {
    const label = document.createElement('span');
    label.className = 'scroll-hint-label';
    label.textContent = 'SCROLL DOWN';
    label.style.setProperty('--color', SCROLL_HINT_COLOR);
    wrapper.prepend(label);
  }

  let hideTimer;
  const show = () => {
    clearTimeout(hideTimer);
    wrapper.style.visibility = 'visible';
    wrapper.classList.remove('is-hiding');
    requestAnimationFrame(() => wrapper.classList.add('is-visible'));
  };
  const hide = () => {
    clearTimeout(hideTimer);
    wrapper.classList.remove('is-visible');
    wrapper.classList.add('is-hiding');
    hideTimer = setTimeout(() => {
      if (wrapper.classList.contains('is-hiding')) wrapper.style.visibility = 'hidden';
    }, 400);
  };

  const update = () => {
    const track = document.querySelector('#scroll-track');
    if (!track || track.offsetHeight === 0) return;
    const progress = Math.max(0, Math.min(1, -track.getBoundingClientRect().top / track.offsetHeight));
    if (progress > SCROLL_HINT_HIDE_AT) hide();
    else if (window.scrollY <= 1) show();
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}
