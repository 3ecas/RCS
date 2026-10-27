// RCS — The drawing canvas, scaled to fit the window.
'use strict';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const s = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
  canvas.width = Math.round(W * s * dpr);
  canvas.height = Math.round(H * s * dpr);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
}
addEventListener('resize', resize);
resize();
