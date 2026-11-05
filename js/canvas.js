// RCS — The drawing canvas. It always fills the whole window. The tower (the arena, W × H) is as wide as
// the window's shape allows (see screenArenaW), so normally it fills the screen exactly. When it can't —
// a very tall window, an online race (fixed width), or a window resized mid-game — the arena is scaled to
// fit and centred, with extra wall at the sides or extra sky above.
'use strict';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
// The view (in game units): at least the arena, stretched to the window's shape. OX / OY: arena's offset in it.
let VW = W, VH = H, OX = 0, OY = 0;
// The arena width that exactly fills this window (H tall), within MIN_W … MAX_W
const screenArenaW = () => Math.round(clamp(H * innerWidth / innerHeight, MIN_W, MAX_W));
// The width a new tower gets: online everyone shares one width; offline it fills this window
const arenaW = () => typeof net !== 'undefined' && net.status === 'playing' ? ONLINE_W : screenArenaW();
W = screenArenaW();
function resize() {
  // On the menus the tower behind them is rebuilt to the new shape (reset sets W and calls resize again)
  if (typeof state !== 'undefined' && state === 'lobby' && players && arenaW() !== W) { reset(); return; }
  const dpr = window.devicePixelRatio || 1;
  const aspect = innerWidth / innerHeight;
  VW = Math.max(W, H * aspect);
  VH = Math.max(H, W / aspect);
  OX = (VW - W) / 2; OY = (VH - H) / 2;
  const s = innerWidth / VW;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  // Everything is drawn in arena coordinates; the view's edges are at x = -OX … W + OX, y = -OY … H + OY
  ctx.setTransform(s * dpr, 0, 0, s * dpr, OX * s * dpr, OY * s * dpr);
}
addEventListener('resize', resize);
resize();
