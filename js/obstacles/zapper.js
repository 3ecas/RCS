// RCS — Lightning: a beam between two posts, switching on and off on a timer (it flickers before it comes on).
// Placed from the platforms: over the platform and across the jump to it from the step before (sometimes
// a little tilted), so it always lies across your way up.
'use strict';

function addZapper(p, from, m) {
  const y = p.y - 62, [pa, pb] = extent(p);
  let a = pa - 30, b = pb + 30;
  if (from && from.type !== 'shaft' && from.type !== 'ground') { const f = center(from); a = Math.min(a, f); b = Math.max(b, f); }
  a = clamp(a, WALL + 16, W - WALL - 16); b = clamp(b, WALL + 16, W - WALL - 16);
  if (b - a < 180) { const mid = clamp((a + b) / 2, WALL + 106, W - WALL - 106); a = mid - 90; b = mid + 90; }
  const tilt = R() < 0.3 ? wrand(-30, 30) : 0;
  zaps.push({ x1: a, y1: y - tilt, x2: b, y2: y + tilt,
              period: wrand(2.4, 3.4), on: lerp(0.9, 1.4, heat(m)), off: wrand(0, 3), t: 0, last: 0, seed: (R() * 1000) | 0 });
}
function zapState(z) {
  const ph = (z.t + z.off) % z.period;
  if (ph >= z.period - z.on) return 2;          // on
  if (ph >= z.period - z.on - 0.6) return 1;    // warning flicker
  return 0;
}
function updateZaps(dt) {
  for (const z of zaps) {
    z.t += dt;
    const s = zapState(z);
    if (s === 2 && z.last !== 2 && z.y1 > camY && z.y1 < camY + H) sfx.zap();
    z.last = s;
  }
  zaps = zaps.filter(z => !offScreen(0, Math.min(z.y1, z.y2), 0));
}
function drawZapper(z) {
  if (Math.max(z.y1, z.y2) < camY - OY - 40 || Math.min(z.y1, z.y2) > camY + H + OY + 40) return;
  const s = zapState(z);
  if (s === 1 && Math.floor(time * 14) % 2) {
    // warming up: a row of butter dots between the posts
    const n = Math.max(2, Math.floor(Math.hypot(z.x2 - z.x1, z.y2 - z.y1) / 16));
    ctx.fillStyle = PAL.zapD; ctx.globalAlpha = 0.6;
    for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.arc(z.x1 + (z.x2 - z.x1) * i / n, z.y1 + (z.y2 - z.y1) * i / n, 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (s === 2) {
    const n = 12, dx = z.x2 - z.x1, dy = z.y2 - z.y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const k = Math.floor(time * 30);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const j = i === 0 || i === n ? 0 : (hash(z.seed + i, k) - 0.5) * 18;
      pts.push([z.x1 + dx * i / n + nx * j, z.y1 + dy * i / n + ny * j]);
    }
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
    // on: a soft butter bolt with a deeper edge and a white core, round at every bend
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,217,107,0.35)'; ctx.lineWidth = 14; path();
    ctx.strokeStyle = PAL.zapD; ctx.lineWidth = 7; path();
    ctx.strokeStyle = PAL.zap; ctx.lineWidth = 4.5; path();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; path();
  }
  for (const [x, y] of [[z.x1, z.y1], [z.x2, z.y2]]) {
    ctx.fillStyle = PAL.zapPost; ctx.beginPath(); ctx.roundRect(x - 8, y - 8, 16, 16, 5); ctx.fill();
    ctx.fillStyle = s ? PAL.zap : PAL.nozzle; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}
function zapHit(p) {
  for (const z of zaps) {
    if (zapState(z) !== 2) continue;
    // Closest point on the beam to the cube's centre, then is it inside the cube (a little forgiving)?
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, dx = z.x2 - z.x1, dy = z.y2 - z.y1;
    const t = clamp(((cx - z.x1) * dx + (cy - z.y1) * dy) / (dx * dx + dy * dy), 0, 1);
    const qx = z.x1 + dx * t, qy = z.y1 + dy * t;
    if (Math.abs(qx - cx) < p.w / 2 - 3 && Math.abs(qy - cy) < p.h / 2 - 3) return 'got zapped';
  }
  return null;
}
