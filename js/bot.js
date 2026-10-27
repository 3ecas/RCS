// RCS — The computer opponent for Solo > Race the bot.
'use strict';

// speed: share of human run speed. think: pause (seconds) after landing before the next jump.
const BOT = { speed: 0.9, think: [0.12, 0.4] };

// The part of a platform that's safe to stand on (avoids its spikes), as [left, right] in x
function safeSpan(q) {
  const x = q.x;
  if (!q.spikes) return [x, x + q.w];
  const a = [x, x + q.spikes.x0 - 6], b = [x + q.spikes.x1 + 6, x + q.w];
  return (a[1] - a[0]) >= (b[1] - b[0]) ? a : b;
}

// Closest x (player centre) where the bot can land fully on the safe part of platform t
function landingX(p, t) {
  const [s0, s1] = safeSpan(t), half = p.w / 2;
  const lo = s0 + half - 6, hi = s1 - half + 6;
  return lo <= hi ? clamp(p.x + half, lo, hi) : (s0 + s1) / 2;
}

// Next platform to jump to: the nearest safe one in the row above.
// If nothing up there is in reach, look further out, then try hopping sideways on the same row.
function pickTarget(p) {
  const feet = p.y + p.h, pc = p.x + p.w / 2, half = p.w / 2;
  const stand = p.ground && !p.ground.isPlayer ? p.ground : null;
  const [wlo, whi] = walkRange(p, stand);
  // Can we take off from our platform on the safe side of q's spikes (so we don't fly up through them)?
  const approachable = q => {
    if (!q.spikes) return true;
    const s0 = q.x + q.spikes.x0 - 4, s1 = q.x + q.spikes.x1 + 4;
    const safeRight = q.spikes.x0 < 1;   // spikes on the left end → safe part is on the right
    return safeRight ? whi >= s1 + half : wlo <= s0 - half;
  };
  const tries = [[40, 170, 260, true], [40, 170, 520, true], [-25, 25, 260, true], [40, 170, 520, false]];   // [min rise, max rise, max sideways, must be approachable]
  for (const [rMin, rMax, hMax, strict] of tries) {
    let bestQ = null, bestScore = 1e9;
    for (const q of platforms) {
      if (q.falling || q.type === 'ground' || q === p.ground) continue;
      const rise = feet - q.y;
      if (rise < rMin || rise > rMax) continue;
      const [a, b] = safeSpan(q);
      if (b - a < 24) continue;
      const hd = pc < a ? a - pc : pc > b ? pc - b : 0;
      if (hd > hMax || (rMin < 0 && hd < 20)) continue;
      if (strict && rMin > 0 && !approachable(q)) continue;
      const score = hd + (q.type === 'crumble' ? 40 : 0) + (q.type === 'move' ? 20 : 0);
      if (score < bestScore) { bestScore = score; bestQ = q; }
    }
    if (bestQ) return bestQ;
  }
  return null;
}

// Somewhere to land when we're already high in the air: nearest safe platform below us
function pickLanding(p) {
  const feet = p.y + p.h, pc = p.x + p.w / 2;
  let bestQ = null, bestScore = 1e9;
  for (const q of platforms) {
    if (q.falling || q.type === 'ground' || q.y < feet + 5 || q.y > feet + 420) continue;
    const [a, b] = safeSpan(q);
    if (b - a < 24) continue;
    const hd = pc < a ? a - pc : pc > b ? pc - b : 0;
    const score = hd + (q.y - feet) * 0.3;
    if (score < bestScore) { bestScore = score; bestQ = q; }
  }
  return bestQ;
}

// Is it safe to jump now? Checks shurikens and wall flames in the gap we'd fly through
function pathClear(p, t, goal) {
  const feet = p.y + p.h;
  const x0 = Math.min(p.x, goal - 20) - 20, x1 = Math.max(p.x + p.w, goal + 20) + 20;
  for (const b of blades) {
    if (b.y > feet || b.y < t.y - 40) continue;
    // Where will it be over the next ~0.6 s (bouncing off the ends of its track)?
    for (let k = 0; k <= 6; k++) {
      let bx = b.x + b.vx * k * 0.1;
      if (bx > b.hi) bx = 2 * b.hi - bx; if (bx < b.lo) bx = 2 * b.lo - bx;
      if (bx > x0 - 40 && bx < x1 + 40) return false;
    }
  }
  for (const j of jets) {
    if (j.y > feet || j.y < t.y - 60) continue;
    const [jx0, jx1] = jetRect(j);
    if (jx1 < x0 || jx0 > x1) continue;
    if (jetState(j)) return false;
    const ph = (j.t + j.off) % j.period;
    if (j.period - 1.6 - ph < 0.7) return false;   // about to fire
  }
  return true;
}

// Where the bot's centre may walk on the platform it stands on (stops before edges and spikes)
function walkRange(p, stand) {
  const half = p.w / 2;
  if (!stand) return [-1e9, 1e9];
  let lo = stand.x + 4, hi = stand.x + stand.w - 4;
  if (stand.spikes) {
    const s0 = stand.x + stand.spikes.x0, s1 = stand.x + stand.spikes.x1, pc = p.x + half;
    if (pc < (s0 + s1) / 2) hi = Math.min(hi, s0 - half - 4);
    else lo = Math.max(lo, s1 + half + 4);
  }
  return [lo, hi];
}

function botThink(p, dt) {
  const ai = p.ai;
  ai.left = ai.right = ai.jumpPressed = ai.down = false;
  const pc = p.x + p.w / 2, feet = p.y + p.h;

  // Sidestep falling fireballs
  for (const f of fireballs) {
    if (f.y < p.y && p.y - f.y < 320 && Math.abs(f.x - pc) < 45) {
      if (f.x > pc) ai.left = true; else ai.right = true;
      return;
    }
  }

  if (p.onGround) {
    if (!ai.wasGround) { ai.wait = rand(BOT.think[0], BOT.think[1]); ai.target = null; }   // just landed: rethink
    ai.wasGround = true;
    ai.jump = false;
    const stand = p.ground && !p.ground.isPlayer ? p.ground : null;
    const rise = ai.target ? feet - ai.target.y : 0;
    if (!ai.target || ai.target.falling || rise < -25 || rise > 170 || !platforms.includes(ai.target)) ai.target = pickTarget(p);
    const t = ai.target;
    const [lo, hi] = walkRange(p, stand);
    if (!t) {   // nothing in reach: drift toward the middle
      if (pc < W / 2 - 20 && pc < hi) ai.right = true; else if (pc > W / 2 + 20 && pc > lo) ai.left = true;
      return;
    }
    const goal = landingX(p, t);
    const dist = goal - pc;
    ai.wait -= dt;
    const hurry = stand && stand.type === 'crumble';
    const ready = (ai.wait <= 0 || hurry) && pathClear(p, t, goal);
    // Don't fly up through the target's spikes: only take off where the path up misses them
    const half = p.w / 2;
    const sp = t.spikes ? [t.x + t.spikes.x0 - 4, t.x + t.spikes.x1 + 4] : null;
    const crosses = sp && Math.max(pc, goal) + half > sp[0] && Math.min(pc, goal) - half < sp[1];
    if (!crosses && Math.abs(dist) <= 140 && ready) { ai.jumpPressed = true; ai.jump = true; return; }
    // Where we'd stop if we let go now (so we brake before edges and spikes, not after)
    const stopAt = pc + p.vx * Math.abs(p.vx) / (2 * 3200);
    if (goal - pc > 3 && stopAt < hi - 2) ai.right = true;
    else if (goal - pc < -3 && stopAt > lo + 2) ai.left = true;
    else if (ready && (!crosses || Math.abs(dist) <= 3 || stopAt >= hi - 2 || stopAt <= lo + 2)) { ai.jumpPressed = true; ai.jump = true; }
    return;
  }

  // In the air: steer to the target's safe area, hold jump while rising
  ai.wasGround = false;
  ai.jump = p.vy < 0;
  // Flying up: dodge sideways if we're about to pass up through spikes
  if (p.vy < 0) {
    const reach = p.vy * p.vy / (2 * GRAV);
    for (const q of platforms) {
      if (!q.spikes || q.falling || q.y > feet || q.y < p.y - reach - 10) continue;
      const s0 = q.x + q.spikes.x0 - 6, s1 = q.x + q.spikes.x1 + 6;
      if (p.x + p.w > s0 && p.x < s1) {
        if (pc - s0 < s1 - pc) ai.left = true; else ai.right = true;
        return;
      }
    }
  }
  // Far above our target (e.g. after a spring launch): pick somewhere new to land
  if (!ai.target || ai.target.falling || ai.target.y > feet + 150) ai.target = pickLanding(p);
  const t = ai.target;
  if (t && !t.falling) {
    const d = landingX(p, t) - pc;
    if (Math.abs(d) > 4) { if (d > 0) ai.right = true; else ai.left = true; }
    // Press jump just before touching a spring for the big launch
    if (t.type === 'spring' && p.vy > 0 && t.y - feet < 30 && t.y - feet > 0 && Math.abs(d) < 30) ai.jumpPressed = true;
  }
}
