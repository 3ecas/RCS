// RCS — Shuriken: a spinning blade patrolling left and right in the air you jump through above a platform,
// from just past one end of it to just past the other (so it always crosses your way up).
'use strict';

function addShuriken(p, m) {
  const [a, b] = extent(p);
  const lo = clamp(a - 50, WALL + 20, W - WALL - 20), hi = clamp(b + 50, WALL + 20, W - WALL - 20);
  const sp = lerp(70, 150, heat(m));
  const s = { x: wrand(lo, hi), y: p.y - 62, lo, hi, vx: (R() < 0.5 ? -1 : 1) * sp, r: 18, ang: 0 };
  blades.push(s);
  return s;
}
function updateBlades(dt) {
  for (const b of blades) {
    b.x += b.vx * dt;
    if (b.x < b.lo) { b.x = b.lo; b.vx = -b.vx; }
    if (b.x > b.hi) { b.x = b.hi; b.vx = -b.vx; }
    b.ang += dt * 9 * Math.sign(b.vx);
  }
  blades = blades.filter(b => !offScreen(b.hi, b.y, 0));
}
function drawBlade(b) {
  if (b.y < camY - OY - 40 || b.y > camY + H + OY + 40) return;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(b.ang);
  ctx.fillStyle = PAL.blade; ctx.strokeStyle = PAL.bladeD; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const r = k % 2 ? b.r * 0.4 : b.r - 1;
    const a = k * Math.PI / 4;
    k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(r, 0);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = PAL.bladeD; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  // its patrol track: small dots
  ctx.fillStyle = PAL.bladeD; ctx.globalAlpha = 0.22;
  for (let tx = b.lo; tx <= b.hi; tx += 14) { ctx.beginPath(); ctx.arc(tx, b.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function bladeHit(p) {
  for (const b of blades) if (circleHit(p, b.x, b.y, b.r - 5)) return 'was hit by a shuriken';
  return null;
}
