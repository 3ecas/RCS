// RCS — Building the tower: platforms, spikes, shurikens and wall flames.
'use strict';

// A new tower: the starting floor, then rows of platforms up to just above the screen.
// Offline, the first two rows are the lobby (mode platforms and colour pads, js/lobby.js);
// online everyone gets the plain tower, built the same on every computer.
function startWorld(withLobby) {
  platforms = [{ id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, falling: false }];
  gen = { prev: null, prevHaz: false };   // last main-path platform, and whether the last row had a hazard
  rowK = 1;
  if (withLobby) {
    const padEnd = buildLobby();
    rowK = 2;
    // The mode platforms span the width, so the next row can start anywhere; keep it hazard-free.
    // On the sound pad's row the tower's platforms stay clear of the pad.
    gen = { prev: { type: 'normal', x: WALL, w: W - 2 * WALL }, prevHaz: true, lo: padEnd + 60, loUntil: GROUND_Y - 2.5 * ROW_GAP };
  }
  generate();
}

// ---- Regions ----
// The order of regions above the start one, from the tower's seed (so online everyone gets the same)
let regionOrder = [];
function makeRegionOrder(seed) {
  let s = seed | 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  regionOrder = [];
  for (let k = 0; k < 60; k++) {
    const prev = regionOrder[k - 1], pool = REGION_POOL.filter(r => r !== prev);
    regionOrder.push(pool[Math.floor(rnd() * pool.length)]);
  }
}
// Which region a height (metres) is in, and how far through it (0…1)
function regionIndex(m) { return m < START_REGION ? -1 : Math.floor((m - START_REGION) / REGION_LEN); }
function regionAt(m) {
  const k = regionIndex(m);
  return k < 0 ? 'start' : regionOrder[k % regionOrder.length];
}
const has = (m, hazard) => REGIONS[regionAt(m)].has.includes(hazard);
// How hard hazards are: 0 at the end of the start region, 1 by 600 m
const heat = m => ramp(m, START_REGION, 500);

// Where each player starts: spread evenly across the floor (closer together when there are many)
function spawnPos(i, n) {
  return { x: W / 2 - PS / 2 + (i - (n - 1) / 2) * Math.min(90, (W - 2 * WALL - PS - 20) / Math.max(1, n - 1)), y: GROUND_Y - PS };
}

function generate() {
  while (GROUND_Y - rowK * ROW_GAP > camY - OY - 300) {   // build a little past the top of the window
    // Rows next to a Two Paths region stay on the grid, so its entrance and exit rows land where they should
    const y0 = GROUND_Y - rowK * ROW_GAP, nearSplit = [-1, 0, 1].some(k => has(heightM(y0 + k * ROW_GAP), 'divider'));
    const nudge = R() < ROW_WOBBLE && !nearSplit ? wrand(-14, 14) : 0;
    genRow(y0 + nudge);
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
  const L = gen.lo && y > gen.loUntil ? gen.lo : WALL;   // left edge (the lobby's colour column takes the left)
  const first = platforms.length;
  if (has(m, 'divider')) genSplitRow(y, m, d, L);
  else genPathRow(y, m, d, L);
  clearGems(platforms.slice(first));   // no gem tucked under this row's platforms (js/pieces.js)
}
function genPathRow(y, m, d, L) {
  const G = lerp(110, 160, d);   // max horizontal gap from the previous step on the path
  // A row right after a row with any hazard is always hazard-free,
  // so you never have to dodge hazards on two steps back to back.
  const allowHaz = !gen.prevHaz;

  // The main path, from the current set piece (js/pieces.js): always within reach of the last step
  const pc = pieceRow(y, m, d, L, G, allowHaz);
  const main = pc.main, cx = center(main), w = main.w;
  let rowHaz = pc.rowHaz;

  // Sometimes an extra platform off to the side, in the free space beside the path
  const row = [...pc.row], extras = 1;
  const pBlade = has(m, 'shuriken') ? lerp(0.25, 0.45, heat(m)) : 0;
  for (let k = 0; k < extras; k++) {
    if (R() >= lerp(0.28, 0.12, d)) continue;
    const GAP = 50, minW = lerp(110, 80, d);
    const taken = [...row.map(extent), ...(pc.block ? [pc.block] : [])].sort((a, b) => a[0] - b[0]);
    const spaces = [];
    let from = L;
    for (const [a, b] of taken) { spaces.push([from, a - GAP]); from = Math.max(from, b + GAP); }
    spaces.push([from, W - WALL]);
    const free = spaces.filter(([a, b]) => b - a >= minW);
    if (!free.length) break;
    const [lo, hi] = free[Math.floor(R() * free.length)];
    const w2 = Math.min(wrand(minW, minW * 1.5), hi - lo);
    const sx = wrand(lo + w2 / 2, hi - w2 / 2);
    // The first extra follows the path's hazard rules. Further ones are off the path,
    // so they can have their own spikes or shuriken (they don't make the next row hazard-free).
    const first = k === 0;
    const side = makePlatform(sx, y, w2, d, lo, hi, first ? allowHaz && !rowHaz : true);
    platforms.push(side); row.push(side);
    if (first) rowHaz = rowHaz || !!side.spikes;
    else if (!side.spikes && R() < pBlade) addBlade(y, clamp(sx - w2 / 2 - 60, lo, hi), clamp(sx + w2 / 2 + 60, lo, hi), m);
  }

  snapToWalls(row);   // no thin gaps between a platform and a wall
  // Fire region: a flamethrower on the path's platform (strategic: you have to land / jump past it)
  if (has(m, 'wallflame') && allowHaz && !rowHaz && main.type === 'normal' && main.w >= 110 && R() < lerp(0.3, 0.5, heat(m))) {
    addPlatformJet(main); rowHaz = true;
  }
  // One flying obstacle (shuriken, wall flame or lightning beam) in the gap above this row
  let blade = null;
  if (allowHaz && !rowHaz && !pc.noFly) {
    const pJet = has(m, 'wallflame') ? lerp(0.25, 0.45, heat(m)) : 0;
    const pZap = has(m, 'zapper') ? lerp(0.35, 0.55, heat(m)) : 0;
    const r = R();
    if (r < pJet) { addJet(R() < 0.5 ? 'L' : 'R', y); rowHaz = true; }
    else if (r < pJet + pBlade) {
      addBlade(y, clamp(cx - w / 2 - 90, L, W - WALL), clamp(cx + w / 2 + 90, L, W - WALL), m);
      blade = blades[blades.length - 1];
      rowHaz = true;
    } else if (r < pJet + pBlade + pZap) { addZapper(y, cx, L, m); rowHaz = true; }
  }
  // Water region: bubble columns rising from some rows (helpers, not hazards). Wider towers get more.
  if (has(m, 'bubbles')) {
    const tries = Math.max(1, Math.round((W - WALL - L) / 700));
    for (let k = 0; k < tries; k++) if (R() < 0.3) addBubbles(y, wrand(L + BUBBLE_W, W - WALL - BUBBLE_W));
  }
  placeGems(y, row, main, blade);   // gems off the path (js/pieces.js)
  gen.prevHaz = rowHaz;
  gen.prev = pc.prev || main;
}

// Two Paths region: a full-width entrance platform, then a wall up the middle with a separate path on
// each side (you can't cross it), then a full-width exit platform where the paths meet again.
function genSplitRow(y, m, d, L) {
  const k = regionIndex(m), mid = W / 2;
  const full = () => {
    const p = { id: nextPid++, x: L, y, w: W - WALL - L, h: 16, type: 'normal', dx: 0, t: 0, falling: false, vy: 0, bounceT: 0 };
    platforms.push(p);
    return p;
  };
  if (gen.splitK !== k) {                       // the entrance (the wall starts just above it, so you can walk under)
    gen.splitK = k; gen.piece = null;           // set pieces start fresh after this region
    const g = full();
    gen.divider = { x: mid - DIVIDER_W / 2, w: DIVIDER_W, bot: y - PS - 36, top: GROUND_Y - (START_REGION + (k + 1) * REGION_LEN) * PX_PER_M };
    dividers.push(gen.divider);
    gen.lanes = [{ lo: L, hi: mid - DIVIDER_W / 2, prev: g }, { lo: mid + DIVIDER_W / 2, hi: W - WALL, prev: g }];
    gen.prev = g; gen.prevHaz = true;
    return;
  }
  if (regionIndex(heightM(y - ROW_GAP)) !== k) { // the exit: the paths meet again
    const r = full();
    gen.divider.top = y + r.h;
    gen.prev = r; gen.prevHaz = true; gen.lanes = null;
    return;
  }
  // One path per side, each always within jumping reach of its last step, plus extra platforms on wide sides
  const G = lerp(110, 160, d), allowHaz = !gen.prevHaz;
  let rowHaz = false;
  for (const lane of gen.lanes) {
    const span = lane.hi - lane.lo;
    const w = Math.min(wrand(lerp(150, 95, d), lerp(210, 135, d)), span - 30);
    const cx = pickCx(w, lane.lo + 6, lane.hi - 6, [lane.prev], G);
    const p = makePlatform(cx, y, w, d, lane.lo + 6, lane.hi - 6, allowHaz);
    platforms.push(p); lane.prev = p; snapToWalls([p]);
    rowHaz = rowHaz || !!p.spikes;
    const tries = Math.max(1, Math.round(span / 450));
    for (let t = 0; t < tries; t++) {
      if (R() >= 0.35) continue;
      const [a, b] = extent(p), sw = wrand(80, 130);
      const spaces = [[lane.lo + 6, a - 50], [b + 50, lane.hi - 6]].filter(([u, v]) => v - u >= sw);
      if (!spaces.length) break;
      const [u, v] = spaces[Math.floor(R() * spaces.length)];
      const q = makePlatform(wrand(u + sw / 2, v - sw / 2), y, sw, d, u, v, false);
      platforms.push(q); snapToWalls([q]);
      break;
    }
  }
  gen.prevHaz = rowHaz;
}

// A still platform that ends just short of a wall (the tower's sides, a pillar, the Two Paths wall) is
// stretched to touch it: a gap too narrow to fall through would only look wrong
const SNAP = 30;
function snapToWalls(row) {
  for (const p of row) {
    if (p.type !== 'normal' || p.menu) continue;
    const near = dividers.filter(dv => p.y >= dv.top - 2 && p.y <= dv.bot + 2);
    for (const e of [WALL, ...near.map(dv => dv.x + dv.w)]) {        // walls on its left
      const g = p.x - e;
      if (g > 0 && g < SNAP) { p.x = e; p.w += g; if (p.spikes) { p.spikes.x0 += g; p.spikes.x1 += g; } }
    }
    for (const e of [W - WALL, ...near.map(dv => dv.x)]) {           // walls on its right
      const g = e - (p.x + p.w);
      if (g > 0 && g < SNAP) p.w += g;
    }
  }
}

// lo/hi: the horizontal lane this platform must stay inside
// m: how far into the level (metres) — sets which obstacles can appear
function makePlatform(cx, y, w, d, lo, hi, allowHaz, m = heightM(y)) {
  const p = { id: nextPid++, x: cx - w / 2, y, w, h: 16, type: 'normal', dx: 0, t: wrand(0, 10), falling: false, vy: 0, bounceT: 0 };
  const r = R();
  const pMove = has(m, 'move') ? lerp(0.15, 0.32, heat(m)) : 0;
  const pTilt = has(m, 'tilt') ? lerp(0.3, 0.45, heat(m)) : 0;
  const pSpring = has(m, 'spring') ? 0.12 : 0;
  if (r < pMove) {
    // Slides around its own centre, always inside its lane
    const amp = Math.min(wrand(50, 130), cx - lo - w / 2, hi - w / 2 - cx);
    if (amp >= 30) {
      p.type = 'move'; p.amp = amp; p.baseX = cx - w / 2;
      p.spd = wrand(0.8, 1.4) * (1 + d * 0.5);
      p.x = p.baseX + Math.sin(p.t * p.spd) * amp;
    }
  } else if (r < pMove + pTilt) {
    makeTilt(p);
  } else if (r < pMove + pTilt + pSpring) {
    p.type = 'spring'; p.w = 70; p.x = cx - 35;
  }
  // Spikes: at most 45% of the platform, so there's always room to land
  const pHaz = has(m, 'spikes') ? lerp(0.3, 0.55, heat(m)) : 0;
  if (allowHaz && (p.type === 'normal' || p.type === 'move') && p.w >= 100 && R() < pHaz) {
    const len = wrand(26, p.w * 0.45);
    const x0 = R() < 0.5 ? 0 : p.w - len;
    p.spikes = { x0, x1: x0 + len };
  }
  return p;
}

// Turn a platform into a seesaw: a plank on a pivot at its centre (on the top surface)
function makeTilt(p) {
  p.type = 'tilt'; p.angle = 0; p.av = 0;
  p.px = p.x + p.w / 2; p.py = p.y;
  return p;
}
// Height of a seesaw's top surface at x
function tiltY(pl, x) {
  return pl.py + clamp(x - pl.px, -pl.w / 2, pl.w / 2) * Math.tan(pl.angle);
}

// Spinning shuriken that patrols left-right in the gap above a row
function addBlade(rowY, lo, hi, m) {
  const sp = lerp(70, 150, heat(m));
  blades.push({ x: wrand(lo + 20, hi - 20), y: rowY - 62, lo: lo + 16, hi: hi - 16, vx: (R() < 0.5 ? -1 : 1) * sp, r: 18, ang: 0 });
}
// Lightning beam between two posts in the gap above a row, switching on and off on a timer.
// Near the path (cx); sometimes tilted.
function addZapper(rowY, cx, lo, m) {
  const len = wrand(200, lerp(280, 420, heat(m)));
  const mid = clamp(cx + wrand(-120, 120), lo + len / 2 + 10, W - WALL - len / 2 - 10);
  const tilt = R() < 0.35 ? wrand(-36, 36) : 0;
  const y = rowY - 62;
  zaps.push({ x1: mid - len / 2, y1: y - tilt, x2: mid + len / 2, y2: y + tilt,
              period: wrand(2.4, 3.4), on: lerp(0.9, 1.4, heat(m)), off: wrand(0, 3), t: 0, last: 0, seed: (R() * 1000) | 0 });
}
function zapState(z) {
  const ph = (z.t + z.off) % z.period;
  if (ph >= z.period - z.on) return 2;          // on
  if (ph >= z.period - z.on - 0.6) return 1;    // warning flicker
  return 0;
}
// Water region: a column of rising bubbles from a row up to three rows higher
function addBubbles(rowY, x) {
  bubbles.push({ x: x - BUBBLE_W / 2, w: BUBBLE_W, top: rowY - 3 * ROW_GAP - 40, bot: rowY + 10, seed: (R() * 1000) | 0 });
}

// Flamethrowers fire on a timer from a nozzle: ox, oy = the nozzle, dx, dy = which way the flame goes,
// len / thick = its reach and thickness.
// From a side wall, across the gap above a row:
function addJet(side, rowY) {
  const L = side === 'L';
  jets.push({ ox: L ? WALL : W - WALL, oy: rowY - 62, dx: L ? 1 : -1, dy: 0, len: JET_LEN, thick: JET_THICK, wall: true,
              period: wrand(2.6, 3.6), off: wrand(0, 3), t: 0, last: 0 });
}
// On a platform on the path: either at one end pointing straight up (time your landing / take-off),
// or at one end pointing out sideways over the gap, just above the platform
function addPlatformJet(p) {
  const left = R() < 0.5;
  const base = { period: wrand(2.4, 3.4), off: wrand(0, 3), t: 0, last: 0 };
  // (straight up it stops short of the row above: it mustn't reach that row's platform)
  if (R() < 0.6) jets.push({ ...base, ox: left ? p.x + 18 : p.x + p.w - 18, oy: p.y, dx: 0, dy: -1, len: Math.min(PJET_LEN, ROW_GAP + 80), thick: PJET_THICK });
  else jets.push({ ...base, ox: left ? p.x : p.x + p.w, oy: p.y - 20, dx: left ? -1 : 1, dy: 0, len: PJET_LEN + 20, thick: PJET_THICK });
}
function jetState(j) {
  const ph = (j.t + j.off) % j.period;
  if (ph >= j.period - 1.0) return 2;   // burning
  if (ph >= j.period - 1.6) return 1;   // warning
  return 0;
}
// The flame's box [x0, x1, y0, y1]
function jetBox(j) {
  const ex = j.ox + j.dx * j.len, ey = j.oy + j.dy * j.len, h = j.thick / 2;
  return j.dy ? [j.ox - h, j.ox + h, Math.min(j.oy, ey), Math.max(j.oy, ey)]
              : [Math.min(j.ox, ex), Math.max(j.ox, ex), j.oy - h, j.oy + h];
}
