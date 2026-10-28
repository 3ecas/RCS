// RCS — The side-scroller (horizontal.html). Loaded after the other scripts, it replaces the tower's
// level, camera, edges and drawing with sideways versions. Menus, players, online play and dangers are shared.
'use strict';

const H_FLOOR = H - 120;          // height of the starting floor
const H_TOP = 260, H_BOTTOM = 800; // platforms stay between these heights
const H_LEVEL_SCALE = 3;          // the screen covers ground ~3x faster sideways, so obstacles unlock over 3x the distance

const distM = x => x / PX_PER_M;                            // distance shown on screen (metres)
const levelAt = x => Math.max(0, distM(x) / H_LEVEL_SCALE);  // "metres" used for unlocking obstacles
const hDiff = x => clamp(levelAt(x) / 400, 0, 1);            // 0 → 1 difficulty

// A new run: a starting floor on the left, then platforms out to just past the right edge
function startWorld() {
  platforms = [{ id: 0, x: -200, y: H_FLOOR, w: 960, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, crumbleT: -1, falling: false }];
  gen = { prev: platforms[0], prevHaz: false, nextX: 760 };
  generate();
}

// Players start side by side on the floor
function spawnPos(i, n) { return { x: 140 + i * 56, y: H_FLOOR - PS }; }

function generate() {
  while (gen.nextX < camX + W + 400) genColumn();
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
  const allowHaz = !gen.prevHaz;   // never hazards on two platforms in a row
  // The lane is just this platform, so makePlatform won't make it slide sideways
  const p = makePlatform(left + w / 2, y, w, d, left, left + w, allowHaz, m);
  // Moving platforms here bob up and down instead
  if (p.type === 'normal' && !p.spikes && m >= unlock.move && R() < lerp(0.1, 0.3, ramp(m, unlock.move, 250))) {
    p.type = 'move'; p.axis = 'y'; p.baseX = p.x; p.baseY = y;
    p.amp = wrand(40, 90); p.spd = wrand(0.8, 1.4) * (1 + d * 0.5);
    p.y = p.baseY + Math.sin(p.t * p.spd) * p.amp;
  }
  platforms.push(p);
  let haz = !!p.spikes;
  // A shuriken patrolling above the platform
  if (allowHaz && !haz && m >= unlock.shuriken && R() < lerp(0.12, 0.3, ramp(m, unlock.shuriken, 300))) {
    addBlade(y, left - 40, left + p.w + 40, m);
    haz = true;
  }
  gen.prevHaz = haz;
  gen.prev = p;
  gen.nextX = left + p.w;
}

// The screen scrolls right at a speed that rises with distance, and catches up with the leader
function updateCamera(dt) {
  if (state === 'play') {
    scrollSpeed = Math.min(120 + levelAt(camX) * 1.1, 330);
    camX += scrollSpeed * dt;
  }
  const lead = Math.max(...alive().map(p => p.x));
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
