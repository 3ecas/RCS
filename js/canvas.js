// RCS — The drawing canvas. It always fills the whole window. The tower (the arena, W × H) is scaled to fit
// and centred: a wide window shows extra wall at the sides, a tall one extra sky above.
'use strict';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
// The view (in game units): at least the arena, stretched to the window's shape. OX / OY: arena's offset in it.
let VW = W, VH = H, OX = 0, OY = 0;
// (A window with no size yet — e.g. a hidden frame — counts as the arena's own shape)
const winAspect = () => innerWidth > 0 && innerHeight > 0 ? innerWidth / innerHeight : ARENA_W / H;
// The width a new tower gets: the same everywhere
const arenaW = () => ARENA_W;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const aspect = winAspect();
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
