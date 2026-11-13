// RCS — Keyboard and mouse input.
'use strict';

const keys = {}, pressed = {};
// Player 1 = WASD, player 2 = arrow keys (in Solo and online, either set moves your cube)
const CONTROLS = [
  { left: 'KeyA', right: 'KeyD', jump: 'KeyW', down: 'KeyS' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', down: 'ArrowDown' },
];
addEventListener('keydown', e => {
  if (e.metaKey) return; // keep Cmd+Q etc. working
  if (e.target && e.target.tagName === 'INPUT') return;   // typing in the chat box
  e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  audioInit();
});
addEventListener('keyup', e => { keys[e.code] = false; });
// Mouse → game coordinates (the canvas is scaled to fit the window). The handlers wait until js/state.js
// has run (it defines `ui`): the mouse can move while the page is still loading.
function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * VW / r.width - OX, y: (e.clientY - r.top) * VH / r.height - OY };
}
canvas.addEventListener('mousemove', e => { if (typeof ui === 'undefined') return; const g = toGame(e); ui.mx = g.x; ui.my = g.y; ui.mouseMoved = true; });
canvas.addEventListener('mousedown', e => { if (typeof ui === 'undefined') return; ui.click = toGame(e); audioInit(); });
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  if (typeof state === 'undefined' || typeof net === 'undefined') return;   // still loading
  if ((state === 'play' || state === 'count') && net.status !== 'playing') { pausedFrom = state; state = 'paused'; }
});
