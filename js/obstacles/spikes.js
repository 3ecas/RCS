// RCS — Spikes: a row of little rose spikes on part of a platform (at most 45% of it, so there's always room
// to land). Placed from the platforms: mostly on the end you arrive at from the step before, now and then the
// far end.
'use strict';

function addSpikes(p, from) {
  const len = wrand(26, p.w * 0.45);
  const arriveLeft = from && from.type !== 'shaft' && from.type !== 'ground' ? center(from) < p.x + p.w / 2 : R() < 0.5;
  const left = R() < 0.65 ? arriveLeft : !arriveLeft;
  const x0 = left ? 0 : p.w - len;
  p.spikes = { x0, x1: x0 + len };
}
// Drawn on the platform (drawPlatform in js/render.js calls this): x, y = the platform's drawn top-left
function drawSpikes(p, x, y) {
    const x0 = x + p.spikes.x0, len = p.spikes.x1 - p.spikes.x0;
  const n = Math.max(1, Math.floor(len / 11)), sw = len / n;
  ctx.fillStyle = PAL.spike; ctx.strokeStyle = PAL.spike; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let k = 0; k < n; k++) { ctx.moveTo(x0 + k * sw + 1, y); ctx.lineTo(x0 + k * sw + sw / 2, y - 10); ctx.lineTo(x0 + (k + 1) * sw - 1, y); ctx.closePath(); }
  ctx.fill(); ctx.stroke();
}
function spikeHit(p) {
  const px0 = p.x + 4, px1 = p.x + p.w - 4, py0 = p.y + 4, py1 = p.y + p.h;
  for (const pl of platforms) {
    if (!pl.spikes || pl.y < camY - 150 || pl.y > camY + H + 50) continue;
    const x0 = pl.x + pl.spikes.x0 + 3, x1 = pl.x + pl.spikes.x1 - 3;
    if (px1 > x0 && px0 < x1 && py1 > pl.y - 9 && py0 < pl.y) return 'got spiked';
  }
  return null;
}
