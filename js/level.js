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
    gen = { prev: platforms.find(p => p.stair) || { type: 'normal', x: WALL, w: W - 2 * WALL }, prevHaz: true, lo: padEnd + 60, loUntil: GROUND_Y - 2.5 * ROW_GAP,
            lobby: true };   // (the start scene: see clearTopEdge)
  }
  generate();
}

// ---- Regions ----
// The order of regions above the start one, from the tower's seed (so online everyone gets the same)
let regionOrder = [];
function makeRegionOrder(seed) {
  let s = seed | 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  regionOrder = []; soloCache = {};
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
const has = (m, hazard) => REGIONS[regionAt(m)].has.includes(hazard) || soloExtras(m).includes(hazard);
// Solo and co-op runs get more obstacles, coming in gradually (online races are unchanged, so every racer
// gets the same tower): from the second region on, each region also mixes in a hazard borrowed from another
// one, two from the fourth region on — and all hazards get more frequent the higher you are (hz).
const SOLO_EXTRA = ['spikes', 'shuriken', 'wallflame', 'zapper', 'tilt'], NO_EXTRA = [];
let soloCache = {};
function soloExtras(m) {
  if (mode === 'versus') return NO_EXTRA;
  const k = regionIndex(m);
  if (k < 1) return NO_EXTRA;
  if (soloCache[k]) return soloCache[k];
  const own = REGIONS[regionAt(m)].has, pool = SOLO_EXTRA.filter(h => !own.includes(h));
  const a = Math.floor(hash(k, towerSeed & 0xffff) * pool.length), out = [pool[a]];
  if (k >= 3 && pool.length > 1) out.push(pool[(a + 1 + Math.floor(hash(towerSeed & 0xffff, k) * (pool.length - 1))) % pool.length]);
  return (soloCache[k] = out);
}
// How much more often hazards turn up (solo / co-op): a little less than now at the start, up to 1.45x high up
const hz = m => mode === 'versus' ? 1 : lerp(0.75, 1.45, ramp(m, START_REGION, 1000));
// How hard hazards are: 0 at the end of the start region, 1 by 600 m
const heat = m => ramp(m, START_REGION, 500);

// Where each player starts: spread evenly across the floor (closer together when there are many)
function spawnPos(i, n) {
  return { x: W / 2 - PS / 2 + (i - (n - 1) / 2) * Math.min(90, (W - 2 * WALL - PS - 20) / Math.max(1, n - 1)), y: GROUND_Y - PS };
}

function generate() {
  while (GROUND_Y - rowK * ROW_GAP > camY - OY - 600) {   // build well past the top of the window (rows are there before they scroll in)
    const y0 = GROUND_Y - rowK * ROW_GAP;
    const nudge = R() < ROW_WOBBLE ? wrand(-14, 14) : 0;
    genRow(gen.lobby ? clearTopEdge(y0 + nudge) : y0 + nudge);
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

// The start scene doesn't scroll, so a row lying across the top of the window would sit there cut in half:
// move such a row a little (fully below the edge, or fully above it — whichever is the smaller move; rows
// are ROW_GAP apart and a jump reaches well over that, so a few pixels either way keep it in reach)
function clearTopEdge(y) {
  const top = -OY, PH = 16;
  if (y >= top + 10 || y + PH <= top - 6) return y;
  const down = top + 10 - y, up = y + PH - (top - 6);
  return down <= up ? y + down : y - up;
}
function genRow(y) {
  const m = heightM(y), d = diff(y);
  const L = gen.lo && y > gen.loUntil ? gen.lo : WALL;   // left edge (the lobby's colour column takes the left)
  const first = platforms.length;
  genPathRow(y, m, d, L);
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
  const pBlade = has(m, 'shuriken') ? lerp(0.25, 0.45, heat(m)) * hz(m) : 0;
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
    // Mostly (90%) right beside the path — another way through the same route — now and then anywhere free
    const r = R(), dist = sp => Math.max(0, sp[0] - cx, cx - sp[1]);
    const near = r < 0.9;
    const [lo, hi] = near ? free.reduce((a, b) => dist(b) < dist(a) ? b : a) : free[Math.floor((r - 0.9) / 0.1 * free.length)];
    const w2 = Math.min(wrand(minW, minW * 1.5), hi - lo);
    const sx = near ? clamp(cx + wrand(-30, 30), lo + w2 / 2, hi - w2 / 2) : wrand(lo + w2 / 2, hi - w2 / 2);
    // The first extra follows the path's hazard rules. Further ones are off the path,
    // so they can have their own spikes or shuriken (they don't make the next row hazard-free).
    const first = k === 0;
    const side = makePlatform(sx, y, w2, d, lo, hi, first ? allowHaz && !rowHaz : true);
    platforms.push(side); row.push(side);
    if (first) rowHaz = rowHaz || !!side.spikes;
    else if (!side.spikes && R() < pBlade) addShuriken(side, m);
  }

  snapToWalls(row);   // no thin gaps between a platform and a wall
  // This row's obstacles (js/obstacles.js): picked here, each one placed from the platforms
  const ob = obstaclesForRow({ main, prev: gen.prev, m, allowHaz, rowHaz, noFly: pc.noFly });
  rowHaz = ob.rowHaz;
  const blade = ob.blade;
  placeGems(y, row, main, blade);   // gems off the path (js/pieces.js)
  gen.prevHaz = rowHaz;
  gen.prev = pc.prev || main;
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
  const pMove = has(m, 'move') ? lerp(0.15, 0.32, heat(m)) * hz(m) : 0;
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
  const pHaz = has(m, 'spikes') ? Math.min(0.8, lerp(0.3, 0.55, heat(m)) * hz(m)) : 0;
  if (allowHaz && (p.type === 'normal' || p.type === 'move') && p.w >= 100 && R() < pHaz) addSpikes(p, gen.prev);   // (js/obstacles/spikes.js)
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


