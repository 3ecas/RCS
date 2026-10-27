// RCS — Starts the game and runs it at a fixed 120 updates per second.
'use strict';

reset();
let last = performance.now(), acc = 0;
function frame(now) {
  // Online games must keep real time (so both computers stay in step), so allow bigger catch-ups
  const dt = Math.min(net.status === 'playing' ? 0.5 : 0.1, (now - last) / 1000);
  last = now; acc += dt;
  while (acc >= STEP) {
    update(STEP);
    for (const k in pressed) delete pressed[k];
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
