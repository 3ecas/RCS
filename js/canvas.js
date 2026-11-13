// RCS — The drawing canvas. It always fills the whole window. The tower (the arena, W × H) is scaled to fit
// and centred: a wide window shows extra wall at the sides, a tall one extra sky above.
'use strict';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });   // opaque: the browser needn't blend it with the page
// The view (in game units): at least the arena, stretched to the window's shape. OX / OY: arena's offset in it.
let VW = W, VH = H, OX = 0, OY = 0;
// (A window with no size yet — e.g. a hidden frame — counts as the arena's own shape)
const winAspect = () => innerWidth > 0 && innerHeight > 0 ? innerWidth / innerHeight : ARENA_W / H;
// The width a new tower gets: the same everywhere
const arenaW = () => ARENA_W;
// The canvas's own resolution: sharp on high-density screens, but never more pixels than a 2560×1440
// screen needs (beyond that you can't see the difference, and every extra pixel costs drawing time)
const MAX_PIXELS = 2560 * 1440;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / Math.max(1, innerWidth * innerHeight)));
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
