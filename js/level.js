// RCS — Building the tower: platforms, spikes, shurikens and wall flames.
'use strict';

// A new tower: the starting floor, then rows of platforms up to just above the screen
function startWorld() {
  platforms = [{ id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, crumbleT: -1, falling: false }];
  gen = { prev: null, prevHaz: false };   // last main-path platform, and whether the last row had a hazard
  rowK = 1;
  generate();
}

// Where each player starts: spread evenly across the floor (closer together when there are many)
function spawnPos(i, n) {
  return { x: W / 2 - PS / 2 + (i - (n - 1) / 2) * Math.min(90, (W - 2 * WALL - PS - 20) / Math.max(1, n - 1)), y: GROUND_Y - PS };
}

function generate() {
  while (GROUND_Y - rowK * ROW_GAP > camY - 300) {
    const nudge = R() < ROW_WOBBLE ? wrand(-14, 14) : 0;
    genRow(GROUND_Y - rowK * ROW_GAP + nudge);
    rowK++;
  }
}

const center = p => p.type === 'move' ? p.baseX + p.w / 2 : p.x + p.w / 2;
// Horizontal gap between a would-be platform (cx, w) and an existing one (0 if they overlap)
const gapTo = (cx, w, q) => Math.max(0, Math.abs(cx - center(q)) - (w + q.w) / 2);

// Pick a centre inside [lo, hi] that is within jumping reach (G) of every reference platform
function pickCx(w, lo, hi, refs, G) {
  const a = lo + w / 2, b = hi - w / 2;
  if (b <= a) return (lo + hi) / 2;
  if (!refs.length) return wrand(a, b);
  for (let k = 0; k < 25; k++) {
    const cx = wrand(a, b);
    if (refs.every(q => gapTo(cx, w, q) <= G)) return cx;
  }
  let bestCx = a, bestV = 1e9;
  for (let k = 0; k <= 30; k++) {
    const cx = a + (b - a) * k / 30;
    const v = Math.max(...refs.map(q => gapTo(cx, w, q)));
    if (v < bestV) { bestV = v; bestCx = cx; }
  }
  return bestCx;
}

// Horizontal space a platform can ever occupy (moving ones include their full slide range)
const extent = p => p.type === 'move' ? [p.baseX - p.amp, p.baseX + p.amp + p.w] : [p.x, p.x + p.w];

function genRow(y) {
  const m = heightM(y), d = diff(y);
  const G = lerp(110, 160, d);   // max horizontal gap from the previous step on the path
  // A row right after a row with any hazard is always hazard-free,
  // so you never have to dodge hazards on two steps back to back.
  const allowHaz = !gen.prevHaz;

  // The main path: one platform per row, always within reach of the last one
  const w = wrand(lerp(150, 95, d), lerp(210, 135, d));
  const cx = pickCx(w, WALL, W - WALL, gen.prev ? [gen.prev] : [], G);
  const main = makePlatform(cx, y, w, d, WALL, W - WALL, allowHaz);
  platforms.push(main);
  let rowHaz = !!main.spikes;

  // Sometimes an extra platform sticks out to the side, in the free space beside the main one
  if (R() < lerp(0.35, 0.15, d)) {
    const GAP = 50, minW = lerp(110, 80, d);
    const [mL, mR] = extent(main);
    const spaces = [[WALL, mL - GAP], [mR + GAP, W - WALL]].filter(([a, b]) => b - a >= minW);
    if (spaces.length) {
      const [lo, hi] = spaces[Math.floor(R() * spaces.length)];
      const w2 = Math.min(wrand(minW, minW * 1.5), hi - lo);
      const side = makePlatform(wrand(lo + w2 / 2, hi - w2 / 2), y, w2, d, lo, hi, allowHaz && !rowHaz);
      platforms.push(side);
      rowHaz = rowHaz || !!side.spikes;
    }
  }

  // One flying obstacle (shuriken or wall flame) in the gap above this row
  if (allowHaz && !rowHaz) {
    const pJet = m >= unlock.wallflame ? lerp(0.12, 0.3, ramp(m, unlock.wallflame, 300)) : 0;
    const pBlade = m >= unlock.shuriken ? lerp(0.12, 0.3, ramp(m, unlock.shuriken, 300)) : 0;
    const r = R();
    if (r < pJet) { addJet(R() < 0.5 ? 'L' : 'R', y); rowHaz = true; }
    else if (r < pJet + pBlade) {
      addBlade(y, clamp(cx - w / 2 - 90, WALL, W - WALL), clamp(cx + w / 2 + 90, WALL, W - WALL), m);
      rowHaz = true;
    }
  }
  gen.prevHaz = rowHaz;
  gen.prev = main;
}

// lo/hi: the horizontal lane this platform must stay inside
// m: how far into the level (metres) — sets which obstacles can appear
function makePlatform(cx, y, w, d, lo, hi, allowHaz, m = heightM(y)) {
  const p = { id: nextPid++, x: cx - w / 2, y, w, h: 16, type: 'normal', dx: 0, t: wrand(0, 10), crumbleT: -1, falling: false, vy: 0, bounceT: 0 };
  const r = R();
  const pMove = m >= unlock.move ? lerp(0.08, 0.28, ramp(m, unlock.move, 250)) : 0;
  const pCrumble = m >= unlock.crumble ? lerp(0.06, 0.2, ramp(m, unlock.crumble, 250)) : 0;
  const pSpring = m >= unlock.spring ? 0.05 : 0;
  if (r < pMove) {
    // Slides around its own centre, always inside its lane
    const amp = Math.min(wrand(50, 130), cx - lo - w / 2, hi - w / 2 - cx);
    if (amp >= 30) {
      p.type = 'move'; p.amp = amp; p.baseX = cx - w / 2;
      p.spd = wrand(0.8, 1.4) * (1 + d * 0.5);
      p.x = p.baseX + Math.sin(p.t * p.spd) * amp;
    }
  } else if (r < pMove + pCrumble) {
    p.type = 'crumble';
  } else if (r < pMove + pCrumble + pSpring) {
    p.type = 'spring'; p.w = 70; p.x = cx - 35;
  }
  // Spikes: at most 45% of the platform, so there's always room to land
  const pHaz = m >= unlock.spikes ? lerp(0.15, 0.45, ramp(m, unlock.spikes, 300)) : 0;
  if (allowHaz && (p.type === 'normal' || p.type === 'move') && p.w >= 100 && R() < pHaz) {
    const len = wrand(26, p.w * 0.45);
    const x0 = R() < 0.5 ? 0 : p.w - len;
    p.spikes = { x0, x1: x0 + len };
  }
  return p;
}

// Spinning shuriken that patrols left-right in the gap above a row
function addBlade(rowY, lo, hi, m) {
  const sp = lerp(70, 150, ramp(m, unlock.shuriken, 300));
  blades.push({ x: wrand(lo + 20, hi - 20), y: rowY - 62, lo: lo + 16, hi: hi - 16, vx: (R() < 0.5 ? -1 : 1) * sp, r: 18, ang: 0 });
}
// Flame jet that fires out of a side wall on a timer
function addJet(side, rowY) {
  jets.push({ side, y: rowY - 62, period: wrand(2.6, 3.6), off: wrand(0, 3), t: 0, last: 0 });
}
function jetState(j) {
  const ph = (j.t + j.off) % j.period;
  if (ph >= j.period - 1.0) return 2;   // burning
  if (ph >= j.period - 1.6) return 1;   // warning
  return 0;
}
function jetRect(j) {
  return j.side === 'L' ? [WALL, WALL + JET_LEN] : [W - WALL - JET_LEN, W - WALL];
}
