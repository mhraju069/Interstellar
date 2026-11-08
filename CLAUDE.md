# CLAUDE.md

Project: scroll-driven Interstellar-style website. Read `plan.md` fully before coding and follow its task order.

## Rules
- Stack: Vite + vanilla JS, GSAP + ScrollTrigger, Lenis, Canvas 2D. Do not add Three.js, React, or other heavy libraries without asking.
- Frames live in `public/frames/scene-N/f_0001.webp`. Counts come from `public/frames/manifest.json`. Never hardcode frame counts.
- One fixed canvas, one rAF loop, lerped frame index (see plan.md section 4.3).
- Never keep all frames decoded in memory. Use the sliding decode window (plan.md section 4.5).
- Animate only `transform` and `opacity`.
- First screen is pure black with no text. Ends in black, then text sections.
- All copy is original. Do not insert real movie quotes.
- Respect `prefers-reduced-motion`.

## Commands
- `npm run dev`: dev server
- `npm run build`: production build
- `npm run preview`: preview build
- `bash scripts/optimize-frames.sh`: convert `raw-frames/` to WebP and write the manifest

## Before saying "done"
- Run the build with no errors.
- Check the Definition of Done in plan.md section 10.
- Report the total JS size and the average frame size.
