// RCS — Fireballs (fire region): a warning blinks at the top of the screen, then a fireball drops. They're
// aimed at the platforms coming up — the ones you're about to climb onto. Online, only Player 1's computer
// decides them and tells the others where (relay 'f').
'use strict';

// Where the next one falls: over one of the platforms in the upper part of the screen
function fireballX() {
  const ahead = platforms.filter(p => p.type !== 'ground' && p.type !== 'shaft' && p.y > camY + 40 && p.y < camY + H * 0.65);
  if (!ahead.length) return Math.round(rand(WALL + 20, W - WALL - 20));
  const p = ahead[Math.floor(rand(0, ahead.length))];
  return Math.round(clamp(center(p) + rand(-p.w / 3, p.w / 3), WALL + 20, W - WALL - 20));
}
function updateFireballs(dt) {
  const m = levelM(), fd = heat(m);
  if (state === 'play' && has(m, 'fireball') && !(net.status === 'playing' && net.me !== 0)) {
    fireTimer -= dt;
    if (fireTimer <= 0) {
      fireTimer = rand(lerp(3, 1.2, fd), lerp(4.5, 2.2, fd));
      const x = fireballX();
      warnings.push({ x, t: 1.1 });
      if (net.status === 'playing') relay({ k: 'f', x });
    }
  }
  for (const w of warnings) {
    w.t -= dt;
    if (w.t <= 0) { fireballs.push({ x: w.x, y: camY - OY - 40, vy: 360 + fd * 260, r: 13 }); sfx.fireball(); }
  }
  warnings = warnings.filter(w => w.t > 0);
  for (const f of fireballs) { f.vy += 250 * dt; f.y += f.vy * dt; }
  fireballs = fireballs.filter(f => f.y < camY + H + 80);
}
function drawFireballs() {
  for (const f of fireballs) {
    // a little flame-coloured ball: a soft halo, an apricot ball, a butter middle and a cream spark
    ctx.fillStyle = PAL.flame; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(f.x, f.y - f.r * 0.3, f.r * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.fire; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.flame2; ctx.beginPath(); ctx.arc(f.x, f.y + f.r * 0.15, f.r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.flameCore; ctx.beginPath(); ctx.arc(f.x - f.r * 0.15, f.y + f.r * 0.25, f.r * 0.28, 0, Math.PI * 2); ctx.fill();
  }
}
function drawFireballWarnings() {
  for (const w of warnings) {
    if (Math.floor(w.t * 10) % 2) continue;
    ctx.fillStyle = PAL.fire;
    const wx = w.x;
    const wy = 14 - OY;   // top of the window
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - 13, wy + 22); ctx.lineTo(wx + 13, wy + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 14px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('!', wx, wy + 19);
  }
}
function fireballHit(p) {
  for (const f of fireballs) if (circleHit(p, f.x, f.y, f.r - 2)) return 'was hit by a fireball';
  return null;
}
