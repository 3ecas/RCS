// RCS — The drawing canvas. It always fills the whole window: the tower (the arena, W × H) is scaled to
// fit and centred, and the view around it stretches to the window's shape — wider windows show more of the
// walls at the sides, taller ones show more of the tower above and below. The tower itself never changes
// size, so everyone online races exactly the same tower.
'use strict';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
// The view (in game units): at least the arena, stretched to the window's shape. OX / OY: arena's offset in it.
let VW = W, VH = H, OX = 0, OY = 0;
function resize() {
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
