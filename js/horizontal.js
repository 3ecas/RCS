// RCS — The side-scroller (horizontal.html). Loaded after the other scripts, it replaces the tower's
// level, camera, edges and drawing with sideways versions. Menus, players, online play and dangers are shared.
'use strict';

const H_FLOOR = H - 120;          // height of the starting floor
const H_TOP = 260, H_BOTTOM = 800; // platforms stay between these heights
const H_LEVEL_SCALE = 2;          // the screen covers ground faster sideways, so obstacles unlock over 2x the distance
// When the side-scroller's own obstacles first appear (in the same "metres" as the tower's STAGES)
const H_UNLOCK = { spikes: 3, pillar: 5, barrier: 8, saw: 12, shuriken: 20 };

const distM = x => x / PX_PER_M;                            // distance shown on screen (metres)
const levelAt = x => Math.max(0, distM(x) / H_LEVEL_SCALE);  // "metres" used for unlocking obstacles
const hDiff = x => clamp(levelAt(x) / 400, 0, 1);            // 0 → 1 difficulty

// A new run: a starting floor on the left, then platforms out to just past the right edge
function startWorld() {
  platforms = [{ id: 0, x: -200, y: H_FLOOR, w: 960, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, crumbleT: -1, falling: false }];
  // gates: walls the screen won't scroll past until someone gets beyond them
  gen = { prev: platforms[0], prevHaz: false, nextX: 760, gates: [], since: 0, every: 3 };
  generate();
}

// Building blocks
function plainPlatform(x, y, w) {
  return { id: nextPid++, x, y, w, h: 16, type: 'normal', dx: 0, dy: 0, t: wrand(0, 10), crumbleT: -1, falling: false, vy: 0, bounceT: 0 };
}
function solidBlock(x, y, w, h, type) { return { x, y, w, h, type, solid: true, dx: 0, dy: 0, falling: false }; }
function addSpikes(p, side) {           // spikes on one end of a platform, at most 40% of it
  const len = wrand(26, p.w * 0.4);
  const x0 = (side === undefined ? R() < 0.5 : side) ? 0 : p.w - len;
  p.spikes = { x0, x1: x0 + len };
}
function addSaw(x, lo, hi, d) {          // a saw going up and down
  const sp = lerp(110, 210, d);
  blades.push({ x, y: wrand(lo, hi), lo, hi, vx: 0, vy: (R() < 0.5 ? -1 : 1) * sp, axis: 'y', r: 18, ang: 0 });
}

// Players start side by side on the floor
function spawnPos(i, n) { return { x: 140 + i * 56, y: H_FLOOR - PS }; }

// Mostly a run of platforms; every few platforms a section that makes you go back and forth:
// a wall to zig-zag up and over, or a stack of floors to switchback down and under a hanging wall
function generate() {
  while (gen.nextX < camX + W + 400) {
    if (levelAt(gen.nextX) >= H_UNLOCK.barrier && gen.since >= gen.every) {
      if (gen.prev.y < 480 && R() < 0.6) genDescent(); else genClimb();
      gen.since = 0; gen.every = 4 + Math.floor(R() * 4);
    } else { genColumn(); gen.since++; }
  }
}

// The next platform on the path: a jumpable gap after the last one, at a reachable height
function genColumn() {
  const prev = gen.prev, x0 = gen.nextX;
  const m = levelAt(x0), d = hDiff(x0);
  let gap = wrand(lerp(50, 110, d), lerp(110, 165, d));
  const w = wrand(lerp(240, 130, d), lerp(340, 190, d));
  const y = clamp(prev.y + wrand(-130, 190), H_TOP, H_BOTTOM);   // at most 130 higher (jump reach ~176)
  if (prev.y - y > 90) gap = Math.min(gap, 115);                  // big step up: keep the gap short
  const left = x0 + gap;
  // The lane is just this platform, so makePlatform won't make it slide sideways.
  // (Its hazards are switched off here: the side-scroller picks its own obstacles below.)
  const p = makePlatform(left + w / 2, y, w, d, left, left + w, false, m);
  // Moving platforms here bob up and down instead
  if (p.type === 'normal' && !p.spikes && m >= unlock.move && R() < lerp(0.1, 0.3, ramp(m, unlock.move, 250))) {
    p.type = 'move'; p.axis = 'y'; p.baseX = p.x; p.baseY = y;
    p.amp = wrand(40, 90); p.spd = wrand(0.8, 1.4) * (1 + d * 0.5);
    p.y = p.baseY + Math.sin(p.t * p.spd) * p.amp;
  }
  platforms.push(p);

  // Obstacles: most platforms get one, harder stretches sometimes two
  const d2 = ramp(m, H_UNLOCK.spikes, 150);
  const options = [];
  if (m >= H_UNLOCK.spikes && (p.type === 'normal' || p.type === 'move') && p.w >= 110) options.push('spikes');
  if (m >= H_UNLOCK.pillar && p.type === 'normal' && p.w >= 200) options.push('pillar');
  if (m >= H_UNLOCK.saw && gap >= 70) options.push('saw');
  if (m >= H_UNLOCK.shuriken) options.push('shuriken');
  const count = !options.length || gen.prevHaz ? 0 : R() < lerp(0.45, 0.85, d2) ? (R() < lerp(0, 0.4, d2) ? 2 : 1) : 0;
  for (let k = 0; k < count && options.length; k++) {
    const pick = options.splice(Math.floor(R() * options.length), 1)[0];
    if (pick === 'spikes') { addSpikes(p); const i = options.indexOf('pillar'); if (i >= 0) options.splice(i, 1); }
    else if (pick === 'pillar') {
      // a block on the platform to jump over
      const ph = wrand(50, lerp(80, 115, d)), px = p.x + wrand(80, p.w - 80 - 34);
      walls.push(solidBlock(px, p.y - ph, 34, ph, 'pillar'));
      const i = options.indexOf('spikes'); if (i >= 0) options.splice(i, 1);
    }
    else if (pick === 'saw') addSaw(left - gap / 2, Math.min(prev.y, p.y) - 190, Math.max(prev.y, p.y) + 20, d);
    else if (pick === 'shuriken') addBlade(p.y, left - 40, left + p.w + 40, m);
  }
  gen.prevHaz = count === 2;   // after a double, the next platform is clear
  gen.prev = p;
  gen.nextX = left + p.w;
}

// WALL CLIMB: a tall wall blocks the way. Ledges before it alternate left and right, so you
// zig-zag up (back and forth), walk over the top and drop down the other side.
function genClimb() {
  const prev = gen.prev, m = levelAt(gen.nextX), d = hDiff(gen.nextX);
  const left = gen.nextX + wrand(70, 120);
  const floorY = clamp(prev.y + wrand(-60, 60), 640, 800);
  platforms.push(plainPlatform(left, floorY, 560));                      // the floor in front of the wall
  const wallTop = Math.max(210, floorY - wrand(330, 430));
  const wx = left + 600;
  const rise = floorY - (wallTop + 100);                                 // the last ledge sits 100 below the top
  const n = Math.ceil(rise / 120), step = rise / n;
  for (let i = 1; i <= n; i++) {
    const right = (n - i) % 2 === 0;                                     // the last ledge is next to the wall
    const ledge = plainPlatform(right ? left + 340 : left + 60, floorY - i * step, 180);
    if (i < n && m >= H_UNLOCK.spikes && R() < lerp(0.15, 0.45, d)) addSpikes(ledge, right ? false : true);   // on the far end
    else if (i < n && m >= unlock.crumble && R() < lerp(0.1, 0.35, d)) ledge.type = 'crumble';
    platforms.push(ledge);
  }
  // A shuriken sweeping across the climb
  if (m >= H_UNLOCK.shuriken && R() < lerp(0.2, 0.6, d)) {
    const k = Math.floor(R() * n);
    blades.push({ x: wrand(left + 80, left + 500), y: floorY - (k + 0.5) * step, lo: left + 60, hi: left + 520, vx: lerp(70, 140, d), r: 18, ang: 0 });
  }
  walls.push(solidBlock(wx, wallTop, 70, H + 600 - wallTop, 'wall'));
  const landing = plainPlatform(wx + 70 + wrand(30, 70), clamp(wallTop + wrand(150, 380), wallTop + 100, 780), 260);
  platforms.push(landing);
  gen.gates.push({ x: wx, w: 70 });
  gen.prev = landing; gen.nextX = landing.x + landing.w; gen.prevHaz = true;
}

// SWITCHBACK DESCENT: a wall hangs down from the sky. Underneath, floors stacked like a building have
// gaps at alternating ends: walk right, drop, walk left, drop, walk right… then pass under the wall.
function genDescent() {
  const prev = gen.prev, m = levelAt(gen.nextX), d = hDiff(gen.nextX);
  const left = gen.nextX + wrand(60, 110);
  const y0 = clamp(prev.y + wrand(-40, 40), 280, 460);
  const span = 560, open = 90, ys = [y0, y0 + 120, y0 + 240, y0 + 360];
  walls.push(solidBlock(left, ys[0], span - open, 20, 'floor'));          // gap on the right
  walls.push(solidBlock(left + open, ys[1], span - open, 20, 'floor'));   // gap on the left
  walls.push(solidBlock(left, ys[2], span - open, 20, 'floor'));          // gap on the right
  walls.push(solidBlock(left, ys[0] + 20, 20, ys[3] - ys[0], 'wall'));    // closes the left side
  const exitW = 260;
  walls.push(solidBlock(left, ys[3], span + 60 + exitW, 20, 'floor'));    // bottom floor, runs under the wall
  walls.push(solidBlock(left + span, -1200, 60, 1200 + ys[3] - 90, 'wall'));   // the hanging wall
  // Spikes to hop over in the corridors (in the middle, away from the gaps)
  for (const [i, x0, x1] of [[1, left + 160, left + 400], [2, left + 120, left + 360]]) {
    if (m >= H_UNLOCK.spikes && R() < lerp(0.3, 0.75, d)) {
      const strip = plainPlatform(wrand(x0, x1), ys[i], 50);
      strip.spikes = { x0: 0, x1: 50 };
      platforms.push(strip);
    }
  }
  gen.gates.push({ x: left + span, w: 60 });
  gen.prev = { x: left + span + 60, w: exitW, y: ys[3] };
  gen.nextX = left + span + 60 + exitW; gen.prevHaz = true;
}

// The screen scrolls right at a speed that rises with distance, and catches up with the leader
// The screen stops in front of a wall section until someone has got past it
function updateCamera(dt) {
  const lead = Math.max(...alive().map(p => p.x));
  for (const g of gen.gates) if (!g.cleared && lead > g.x + g.w + 10) g.cleared = true;
  gen.gates = gen.gates.filter(g => !g.cleared || g.x > camX - 400);
  const gate = gen.gates.find(g => !g.cleared);
  if (state === 'play') {
    scrollSpeed = Math.min(120 + levelAt(camX) * 1.1, 330);
    camX += scrollSpeed * dt;
    if (gate) camX = Math.min(camX, gate.x - W * 0.45);
  }
  const target = lead - W * 0.45;
  if (target > camX) camX += (target - camX) * Math.min(1, 4 * dt);
}
function playerProgress(p) { return distM(p.x); }
function levelM() { return levelAt(camX); }
function outReason(p) {
  if (p.y > H + 20) return 'fell into the gap';
  if (p.x + p.w < camX - 4) return mode === 'versus' ? 'fell behind' : 'got left behind';
  return null;
}
// Can't run off the right edge of the screen (the left edge is the danger)
function clampX(p) {
  if (p.x + p.w > camX + W) { p.x = camX + W - p.w; p.vx = 0; }
}
function offScreen(x, y, w) { return x + w < camX - 300; }
function fireballX() { return Math.round(camX + rand(160, W - 120)); }

// ---- Drawing ----
function drawBackground() {
  const [top, bot] = bgAt(levelAt(camX + W / 2) * 1.5);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Soft floating squares (parallax)
  const span = W * 2;
  for (let k = 0; k < 22; k++) {
    const s = 30 + hash(k, 3) * 90;
    let x = (hash(k, 1) * span - camX * 0.25) % span;
    if (x < 0) x += span;
    x -= s;
    if (x > W) continue;
    const y = 60 + hash(k, 2) * (H - 220);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hash(k, 4) * 0.8 + time * 0.05 * (hash(k, 5) - 0.5));
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

// Instead of side walls: distance markers every 25 m, your best, and a soft haze over the gap below
function drawWalls() {
  ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center';
  const first = Math.max(25, Math.ceil(distM(camX) / 25) * 25), last = distM(camX + W);
  for (let mm = first; mm <= last; mm += 25) {
    const x = mm * PX_PER_M;
    ctx.fillStyle = 'rgba(199,186,223,0.5)'; ctx.fillRect(x - 1, 120, 2, H - 240);
    ctx.fillStyle = PAL.inkSoft; ctx.fillText(mm + 'm', x, 112);
  }
  if (best > 0 && mode !== 'versus') {
    const x = best * PX_PER_M;
    if (x > camX - 10 && x < camX + W + 10) {
      ctx.setLineDash([8, 8]); ctx.strokeStyle = PAL.good; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, 130); ctx.lineTo(x, H - 110); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = PAL.good; ctx.font = `800 13px ${FONT}`;
      ctx.fillText('BEST ' + best + 'm', x, 130);
    }
  }
  const g = ctx.createLinearGradient(0, H - 120, 0, H);
  g.addColorStop(0, 'rgba(108,91,123,0)'); g.addColorStop(1, 'rgba(108,91,123,0.35)');
  ctx.fillStyle = g; ctx.fillRect(camX, H - 120, W, 120);
}

// Red glow on the left when someone is about to be left behind
function drawDanger() {
  if (camX < 40) return;
  let danger = 0;
  for (const p of alive()) danger = Math.max(danger, (camX + W * 0.18 - p.x) / (W * 0.18));
  danger = clamp(danger, 0, 1);
  if (danger <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 180, 0);
  g.addColorStop(0, `rgba(255,123,156,${0.45 * danger * (0.7 + 0.3 * Math.sin(time * 12))})`); g.addColorStop(1, 'rgba(255,123,156,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 180, H);
}
