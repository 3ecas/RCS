// RCS — Starts the game and runs it: every frame advances the game by exactly the time that passed,
// in small equal steps (at most STEP long). Screens refresh at 60, 75, 120, 144 Hz…: a fixed number of
// updates per second would land unevenly on the frames and make the motion judder.
'use strict';

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
