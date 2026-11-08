// Scroll distance in desktop CSS pixels per frame; higher values slow the scrub.
export const PX_PER_FRAME = 14;
// Lenis scroll interpolation amount; lower values feel smoother and floatier.
export const LERP = 0.08;
// Number of frames used to blend between adjacent scenes; set 0 to disable.
export const CROSSFADE_FRAMES = 8;
// Portion of the scroll timeline reserved for fading in from black.
export const INTRO_FADE = 0.06;
// Portion of the scroll timeline reserved for fading out to black.
export const OUTRO_FADE = 0.06;
// Maximum black overlay during the outro so the held final frame stays visible.
export const OUTRO_MAX_OPACITY = 0.55;
// Scroll distance in mobile CSS pixels per frame; higher values slow the scrub.
export const MOBILE_PX_PER_FRAME = 10;
// Maximum device pixel ratio used for the canvas backing resolution.
export const DPR_CAP = 2;
// Optional subtle canvas contrast and saturation boost; false keeps source color unchanged.
export const SHARPEN = false;
// Film grain overlay opacity; set 0 to turn the texture off.
export const FILM_GRAIN_OPACITY = 0.05;
// Maximum frame movement per second; 60 matches a 60 Hz display without skips.
export const MAX_PLAYBACK_FPS = 60;
// Minimum frame movement per second so very small gaps still settle promptly.
export const MIN_PLAYBACK_FPS = 6;
// Catch-up strength for large scroll jumps; higher values shorten the settle time.
export const CATCHUP_EASE = 6;
// Number of frames to preload ahead in the direction of travel.
export const PREFETCH_AHEAD = 60;
// Number of frames to retain and preload behind the current position.
export const PREFETCH_BEHIND = 10;
// Show the scroll hint after the loader; set false to remove it.
export const SCROLL_HINT_ENABLED = true;
// CSS color applied to the Uiverse scroll indicator.
export const SCROLL_HINT_COLOR = 'skyblue';
// Scroll timeline progress after which the hint fades away.
export const SCROLL_HINT_HIDE_AT = 0.015;
// Show the optional uppercase label above the indicator.
export const SCROLL_HINT_SHOW_TEXT = false;
// Scroll distance used to raise the title slowly from below the viewport.
export const TITLE_RISE_DISTANCE = 1200;
