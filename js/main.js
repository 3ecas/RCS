// RCS — Starts the game and runs it: every frame advances the game by exactly the time that passed,
// in small equal steps (at most STEP long). Screens refresh at 60, 75, 120, 144 Hz…: a fixed number of
// updates per second would land unevenly on the frames and make the motion judder.
'use strict';

// Start loading the font straight away (the canvas only asks for it when it first draws text; until it
// arrives the fallback font is used, and every frame is redrawn, so it simply switches over)
try { document.fonts.load(`600 20px ${FONT}`); document.fonts.load(`700 20px ${FONT}`); } catch (e) {}
reset();          // the lobby: the bottom of a new tower
let last = performance.now();
function frame(now) {
  // Online games must keep real time (so both computers stay in step), so allow bigger catch-ups
  const dt = Math.min(net.status === 'playing' ? 0.5 : 0.1, Math.max(0, (now - last) / 1000));
  last = now;
  const n = Math.max(1, Math.ceil(dt / STEP - 1e-6)), h = dt / n;
  for (let i = 0; i < n; i++) {
    update(h);
    for (const k in pressed) delete pressed[k];   // a key press counts once
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
