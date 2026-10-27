// RCS — Keyboard and mouse input.
'use strict';

const keys = {}, pressed = {};
const CONTROLS = [
  { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown' },
];
addEventListener('keydown', e => {
  if (e.metaKey) return; // keep Cmd+Q etc. working
  if (e.target && e.target.tagName === 'INPUT') {   // typing your name: let the text box have the keys
    if (e.key === 'Enter' || e.key === 'Escape') e.target.blur();
    return;
  }
  e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  audioInit();
});
addEventListener('keyup', e => { keys[e.code] = false; });
// Mouse → game coordinates (the canvas is scaled to fit the window)
function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
canvas.addEventListener('mousemove', e => { const g = toGame(e); ui.mx = g.x; ui.my = g.y; ui.mouseMoved = true; });
canvas.addEventListener('mousedown', e => { ui.click = toGame(e); audioInit(); });
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  if ((state === 'play' || state === 'count') && net.status !== 'playing') { pausedFrom = state; state = 'paused'; }
});
