// RCS — Flamethrowers: a nozzle that fires a flame on a timer (a flicker of warning first). ox, oy = the
// nozzle, dx, dy = which way the flame goes, len / thick = its reach and thickness. Placed from the platforms:
//  - from the side wall next to a platform, in the air above it, reaching past its middle
//  - on a platform: at one end straight up (time your landing / take-off), or sideways from the end you
//    arrive at, back the way you come (over your jump)
//  - inside a chimney late in the climb: from a pillar, across the shaft
'use strict';

const flameTimer = () => ({ period: wrand(2.6, 3.6), off: wrand(0, 3), t: 0, last: 0 });
function addWallFlame(p) {
  const c = center(p), left = c < W / 2;
  const reach = (left ? c - WALL : W - WALL - c) + p.w * 0.25;
  jets.push({ ox: left ? WALL : W - WALL, oy: p.y - 62, dx: left ? 1 : -1, dy: 0, len: clamp(reach, 150, 560), thick: JET_THICK, wall: true, ...flameTimer() });
}
function addPlatformFlame(p, from) {
  const base = { ...flameTimer(), period: wrand(2.4, 3.4) };
  const arriveLeft = from && from.type !== 'shaft' && from.type !== 'ground' ? center(from) < center(p) : R() < 0.5;
  // (straight up it stops short of the row above: it mustn't reach that row's platform)
  if (R() < 0.6) jets.push({ ...base, ox: arriveLeft ? p.x + 18 : p.x + p.w - 18, oy: p.y, dx: 0, dy: -1, len: Math.min(PJET_LEN, ROW_GAP + 80), thick: PJET_THICK });
  else jets.push({ ...base, ox: arriveLeft ? p.x : p.x + p.w, oy: p.y - 20, dx: arriveLeft ? -1 : 1, dy: 0, len: PJET_LEN + 20, thick: PJET_THICK });
}
// A pillar's inner face at x, firing across the shaft toward dir (-1 left, 1 right), at row y
function addShaftFlame(x, y, dir) {
  jets.push({ ox: x, oy: y - 50, dx: dir, dy: 0, len: SHAFT_W * 0.55, thick: 26, shaft: true, ...flameTimer(), period: wrand(2.4, 3.2) });
}
function jetState(j) {
  const ph = (j.t + j.off) % j.period;
  if (ph >= j.period - 1.0) return 2;   // burning
  if (ph >= j.period - 1.6) return 1;   // warning
  return 0;
}
// The flame's box [x0, x1, y0, y1]. reach: how much of its length counts (the drawn flame narrows to a point,
// so the part that burns stops a little short of its tip)
function jetBox(j, reach = 1) {
  const len = j.len * reach, ex = j.ox + j.dx * len, ey = j.oy + j.dy * len, h = j.thick / 2;
  return j.dy ? [j.ox - h, j.ox + h, Math.min(j.oy, ey), Math.max(j.oy, ey)]
              : [Math.min(j.ox, ex), Math.max(j.ox, ex), j.oy - h, j.oy + h];
}
function updateJets(dt) {
  for (const j of jets) {
    j.t += dt;
    const s = jetState(j);
    if (s === 2 && j.last !== 2 && j.oy > camY && j.oy < camY + H) sfx.flame();
    j.last = s;
  }
  jets = jets.filter(j => !offScreen(W, j.oy, 0));
}
// Flamethrower: a nozzle (on a wall or a platform), a flicker while it warms up, then the flame
function drawJet(j) {
  const [, , y0, y1] = jetBox(j);
  if (y1 < camY - OY - 40 || y0 > camY + H + OY + 40) return;
  const s = jetState(j), h = j.thick / 2;
  ctx.save();
  ctx.translate(j.ox, j.oy);
  ctx.rotate(Math.atan2(j.dy, j.dx));        // draw it along +x
  ctx.fillStyle = s ? PAL.flame : PAL.nozzle; // nozzle
  if (j.wall) { ctx.beginPath(); ctx.roundRect(-12, -h * 0.6, 14, h * 1.2, 5); ctx.fill(); }
  else { ctx.beginPath(); ctx.roundRect(-4, -h * 0.55, 14, h * 1.1, 4); ctx.fill(); ctx.fillStyle = PAL.zapPost; ctx.beginPath(); ctx.roundRect(-4, -h * 0.55, 5, h * 1.1, 2); ctx.fill(); }
  if (s === 1 && Math.floor(time * 12) % 2) {   // warming up: a small flickering tongue
    ctx.fillStyle = PAL.flame; ctx.beginPath(); ctx.roundRect(0, -h * 0.4, 22, h * 0.8, h * 0.4); ctx.fill();
  }
  if (s === 2) {
    // Burning: three rounded tongues (apricot, butter, cream), each flickering on its own,
    // and a few little shapes drifting off the tip
    const f = k => 0.9 + 0.1 * Math.sin(time * (24 + k * 7) + j.ox * 0.1 + k);
    ctx.save(); ctx.beginPath(); ctx.rect(-1, -h * 2, j.len * 1.4, h * 4); ctx.clip();   // nothing behind the nozzle
    // a tongue: round at the nozzle, swelling a little, then narrowing to a soft point
    const tongue = (len, th, col) => {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(0, -th);
      ctx.bezierCurveTo(len * 0.45, -th * 1.2, len * 0.8, -th * 0.5, len, 0);
      ctx.bezierCurveTo(len * 0.8, th * 0.5, len * 0.45, th * 1.2, 0, th);
      ctx.arc(0, 0, th, Math.PI / 2, Math.PI * 1.5);
      ctx.fill();
    };
    tongue(j.len * f(0), h * 0.9, PAL.flame);
    tongue(j.len * 0.74 * f(1), h * 0.6, PAL.flame2);
    tongue(j.len * 0.42 * f(2), h * 0.28, PAL.flameCore);
    ctx.restore();
    for (let k = 0; k < 3; k++) {
      const ph = (time * 2.2 + k / 3 + j.ox * 0.01) % 1;
      ctx.globalAlpha = 1 - ph;
      drawShape(ctx, k % 2 ? 'tri' : 'dot', j.len * (0.88 + ph * 0.2), Math.sin(time * 5 + k * 2) * h * 0.6, 3.5 - ph * 2, PAL.flame, time * 3 + k);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function flameHit(p) {
  const px0 = p.x + 4, px1 = p.x + p.w - 4, py0 = p.y + 4, py1 = p.y + p.h;
  for (const j of jets) {
    if (jetState(j) !== 2) continue;
    const [x0, x1, y0, y1] = jetBox(j, 0.86);
    if (px1 > x0 + 4 && px0 < x1 - 4 && py1 > y0 + 4 && py0 < y1 - 4) return 'got burned';
  }
  return null;
}
