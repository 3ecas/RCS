// RCS — Drawing the world: background, walls, platforms, hazards and players.
'use strict';

// Background colours: the region's, blending into the next region's over the last 20 m before it
function bgAt(m) {
  m = Math.max(0, m);
  const k = regionIndex(m), end = START_REGION + (k + 1) * REGION_LEN;
  const a = REGIONS[regionAt(m)].bg, b = REGIONS[regionAt(end)].bg;
  const t = Math.round(clamp((m - (end - 20)) / 20, 0, 1) * 24) / 24;   // in small steps (the picture is cached)
  return [mixHex(a[0], b[0], t), mixHex(a[1], b[1], t)];
}

function drawBackground() {
  const [top, bot] = bgAt(heightM(camY + H / 2));
  const g = ctx.createLinearGradient(0, -OY, 0, H + OY);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(WALL - 4, -OY, W - 2 * WALL + 8, VH);   // only inside the tower: the walls cover the rest
  drawScenery();

}

// Background: big soft geometric shapes drifting slower than the tower (each region has its own family of
// shapes, in its colours), and a sparse layer of small shapes rising through the air
// The background's only decoration: a sparse layer of little shapes drifting up the screen
function drawScenery() {
  // The rising air: little shapes drifting up the screen, swaying, fading in and out
  const AIR = ['dot', 'tri', 'ring', 'plus', 'sq'];
  for (let k = 0; k < 18; k++) {
    const sp = 18 + hash(k, 11) * 26, f = ((hash(k, 12) * VH + time * sp) % VH) / VH;
    const y = H + OY - f * VH, x = WALL + 10 + hash(k, 13) * (W - 2 * WALL - 20) + Math.sin(time * 0.7 + k) * 10;
    const R0 = REGIONS[regionAt(heightM(camY + y))];
    ctx.globalAlpha = 0.55 * Math.sin(f * Math.PI);
    drawShape(ctx, AIR[k % AIR.length], x, y, 2.2 + hash(k, 14) * 2.6, R0.plat[1], time * 0.5 + k);
  }
  ctx.globalAlpha = 1;
}

// Soft rounded blocks, laid in staggered courses on the world grid (so they scroll with the tower),
// filling the box x0…x1, y0…y1: the walls, the floor and the pillars are built from them
const TILE = '#f4effc';
// The blocks are drawn once into a small picture (two courses) and repeated as a pattern: one fill instead of
// hundreds of shapes every frame. Patterns sit on the world's grid, so the blocks scroll with the tower.
const tileCache = {};
function tilePattern(bw, bh, gap, color, base, c0 = ctx) {
  const k = Math.max(1, Math.round(c0.getTransform().a * 2) / 2);   // drawn at the screen's resolution
  const key = [bw, bh, gap, color, base, k].join('|');
  if (tileCache[key]) return tileCache[key];
  const rh = bh + gap, cw = bw + gap, c = document.createElement('canvas');
  c.width = Math.round(cw * k); c.height = Math.round(2 * rh * k);
  const g = c.getContext('2d');
  g.scale(c.width / cw, c.height / (2 * rh));
  if (base) { g.fillStyle = base; g.fillRect(0, 0, cw, 2 * rh); }   // the mortar colour too: then one fill does it all
  g.fillStyle = color; g.beginPath();
  g.roundRect(gap / 2, gap / 2, bw, bh, 8);                                   // first course
  g.roundRect(gap / 2 - cw / 2, rh + gap / 2, bw, bh, 8); g.roundRect(gap / 2 + cw / 2, rh + gap / 2, bw, bh, 8);   // second, staggered
  g.fill();
  const pat = c0.createPattern(c, 'repeat');
  pat.setTransform(new DOMMatrix().scale(cw / c.width, 2 * rh / c.height));
  return (tileCache[key] = pat);
}
function tiles(x0, x1, y0, y1, bw = 58, bh = 30, gap = 6, color = TILE, base = null, c0 = ctx) {
  if (x1 <= x0 || y1 <= y0) return;
  c0.fillStyle = tilePattern(bw, bh, gap, color, base, c0);
  c0.fillRect(x0, y0, x1 - x0, y1 - y0);
}

// A side wall, drawn once into an off-screen picture (a little taller than the window) and then just copied
// each frame, shifted to where the blocks are: copying a picture is the cheapest thing a canvas does
const wallCache = {};
function wallStrip(x0, x1, top, tall) {
  const period = 2 * 36, k = Math.max(1, Math.round(ctx.getTransform().a * 2) / 2), w = x1 - x0, hh = tall + period;
  const key = [Math.round(x0), Math.round(w), Math.round(hh), k].join('|');
  let c = wallCache[key];
  if (!c) {
    if (Object.keys(wallCache).length > 6) for (const old in wallCache) delete wallCache[old];   // (after resizes)
    c = document.createElement('canvas');
    c.width = Math.ceil(w * k); c.height = Math.ceil(hh * k);
    const g = c.getContext('2d');
    g.scale(k, k); g.translate(-x0, 0);
    tiles(x0, x1, 0, hh, 58, 30, 6, TILE, PAL.wall, g);
    wallCache[key] = c;
  }
  const y = top - (((top % period) + period) % period);   // keep the blocks on the world grid
  ctx.drawImage(c, x0, y, w, hh);
}

function drawWalls() {
  // The side walls, carried on out to the edges of the window (and above / below on tall windows)
  const top = camY - OY, tall = VH;
  wallStrip(-OX, WALL, top, tall); wallStrip(W - WALL, W + OX, top, tall);
  ctx.fillStyle = PAL.wallLine;   // the tower's inner edge
  ctx.fillRect(WALL - 3, top, 3, tall); ctx.fillRect(W - WALL, top, 3, tall);
  // Height markers every 25 m
  ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center';
  const mTop = Math.ceil(heightM(camY + H) / 25) * 25, mMax = heightM(camY);
  for (let mm = Math.max(25, mTop); mm <= mMax; mm += 25) {
    const y = GROUND_Y - mm * PX_PER_M;
    ctx.fillStyle = PAL.wallLine;
    ctx.fillRect(8, y - 1, WALL - 16, 2); ctx.fillRect(W - WALL + 8, y - 1, WALL - 16, 2);
    ctx.fillStyle = PAL.inkSoft;
    ctx.fillText(mm + 'm', WALL / 2, y - 6); ctx.fillText(mm + 'm', W - WALL / 2, y - 6);
  }
  if (best > 0 && mode !== 'versus') {
    const y = GROUND_Y - best * PX_PER_M;
    if (y > camY - 10 && y < camY + H + 10) {
      ctx.setLineDash([8, 8]); ctx.strokeStyle = PAL.good; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(WALL, y); ctx.lineTo(W - WALL, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = PAL.good; ctx.textAlign = 'left'; ctx.font = `800 13px ${FONT}`;
      ctx.fillText('BEST ' + best + 'm', WALL + 8, y - 6);
    }
  }
}

// The look shared by buttons and platforms: a face, a crisp outline, and a solid shadow under it
function slab(x, y, w, h, face, edge, lw = 2, drop = 0) {
  const r = Math.min(5, h / 2, w / 2);   // softly rounded corners
  if (drop) { ctx.fillStyle = edge; ctx.beginPath(); ctx.roundRect(x, y + drop, w, h, r); ctx.fill(); }
  ctx.fillStyle = face; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.beginPath(); ctx.roundRect(x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2)); ctx.stroke();
}
// A white button-platform (lobby, wardrobe, room). on: someone stands on it — it lights up in `color`.
function buttonSlab(p, on, color = PAL.ink, drop = 0) {
  slab(p.x, p.y, p.w, p.h, '#ffffff', on ? color : PAL.normalD, on ? 3 : 2, drop);
}

function drawPlatform(p) {
  if (p.y < camY - OY - 60 || p.y > camY + H + OY + 80) return;
  const y = p.y;
  if (p.type === 'ground') {
    // The floor: a lilac slab with a rounded deep edge on top, built of the same soft blocks
    tiles(-OX, W + OX, y, y + p.h + OY + 20, 58, 30, 6, 'rgba(255,255,255,0.28)', PAL.ground);
    ctx.fillStyle = PAL.groundD; ctx.beginPath(); ctx.roundRect(p.x - 2, y, p.w + 4, 5, 2.5); ctx.fill();
    ctx.fillStyle = PAL.inkSoft; ctx.font = `700 16px ${FONT}`; ctx.textAlign = 'center';
    if (state !== 'lobby' && state !== 'room' && state !== 'wardrobe') ctx.fillText('START', W / 2, y + 40);
    return;
  }
  if (p.menu === 'start') return drawStartPlatform(p);   // online room (js/room.js)
  if (p.menu) return drawMenuPlatform(p);   // lobby platforms (js/lobby.js)
  let x = p.x;
  const colors = { normal: [PAL.normal, PAL.normalD], move: [PAL.move, PAL.moveD], tilt: [PAL.tilt, PAL.tiltD], spring: [PAL.spring, PAL.springD] };
  const [c, cd] = colors[p.type];

  if (p.type === 'move') {
    // Its track: a row of small dots between two rings, showing how far it slides
    const t0 = p.baseX - p.amp + 6, t1 = p.baseX + p.amp + p.w - 6, ty = y + p.h / 2;
    ctx.fillStyle = cd; ctx.globalAlpha = 0.35;
    for (let tx = t0 + 14; tx < t1 - 10; tx += 14) { ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 0.6;
    drawShape(ctx, 'ring', t0, ty, 6, cd); drawShape(ctx, 'ring', t1, ty, 6, cd);
    ctx.globalAlpha = 1;
  }
  if (p.type === 'tilt') {
    // Seesaw: a post and pivot pin, and the plank turned around the pivot (centre of its top)
    // the pivot: a soft triangle with a deeper edge, on a little base plate
    ctx.fillStyle = c; ctx.strokeStyle = cd; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(p.px - 13, y + 31); ctx.lineTo(p.px + 13, y + 31); ctx.lineTo(p.px, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    slab(p.px - 19, y + 30, 38, 6, cd, cd);
    // the plank, turned around the pin at its middle; a dot near each end shows which way it tips
    ctx.save();
    ctx.translate(p.px, p.py); ctx.rotate(p.angle);
    slab(-p.w / 2, 0, p.w, p.h, c, cd);
    ctx.fillStyle = cd;
    for (const dx of [-p.w / 2 + 10, p.w / 2 - 10]) { ctx.beginPath(); ctx.arc(dx, p.h / 2, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = cd; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 8, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (p.type === 'spring') {
    drawSpringI(x, y, p.w, p.comp || 0);
  } else if (p.type === 'normal') {
    drawPlainPlatform(p);
  } else {
    slab(x, y, p.w, p.h, c, cd);
    if (p.type === 'move') {   // two small dots on its face, marking it as one that moves
      ctx.fillStyle = cd;
      for (const dx of [10, p.w - 10]) { ctx.beginPath(); ctx.arc(x + dx, y + p.h / 2, 2.6, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  if (p.spikes) {
    const x0 = x + p.spikes.x0, len = p.spikes.x1 - p.spikes.x0;
    const n = Math.max(1, Math.floor(len / 11)), sw = len / n;
    ctx.fillStyle = PAL.spike; ctx.strokeStyle = PAL.spike; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k < n; k++) { ctx.moveTo(x0 + k * sw + 1, y); ctx.lineTo(x0 + k * sw + sw / 2, y - 10); ctx.lineTo(x0 + (k + 1) * sw - 1, y); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
  }
}

// A plain platform in its region's style: colours, a decoration, and a bracket into the wall when it's next to one
function drawPlainPlatform(p) {
  const R0 = REGIONS[regionAt(heightM(p.y))], [c, cd] = R0.plat, x = p.x, y = p.y, w = p.w, h = p.h;
  ctx.fillStyle = cd; ctx.strokeStyle = cd; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  if (x - WALL < 0.5) { ctx.beginPath(); ctx.moveTo(WALL, y + h); ctx.lineTo(WALL + Math.min(40, w * 0.5), y + h); ctx.lineTo(WALL, y + h + 26); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (W - WALL - (x + w) < 0.5) { ctx.beginPath(); ctx.moveTo(W - WALL, y + h); ctx.lineTo(W - WALL - Math.min(40, w * 0.5), y + h); ctx.lineTo(W - WALL, y + h + 26); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  slab(x, y, w, h, c, cd);
}

// A gem: a turquoise diamond that bobs and glints
function drawGemIcon(x, y, r) {
  ctx.fillStyle = '#2fb7cc';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y - r * 0.2); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y - r * 0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8ef0fb';
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y - r * 0.2); ctx.lineTo(x, y - r * 0.05); ctx.lineTo(x - r * 0.8, y - r * 0.2); ctx.closePath(); ctx.fill();
}
function drawGem(g) {
  if (g.taken || g.y < camY - OY - 30 || g.y > camY + H + OY + 30) return;
  const y = g.y + Math.sin(time * 3 + g.t) * 4;
  ctx.fillStyle = 'rgba(95,216,232,0.25)'; ctx.beginPath(); ctx.arc(g.x, y, GEM_R * 1.5, 0, 7); ctx.fill();
  drawGemIcon(g.x, y, GEM_R);
  if (Math.floor(time * 2 + g.t) % 5 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(g.x - 1, y - GEM_R - 5, 2, 6); ctx.fillRect(g.x - 3, y - GEM_R - 3, 6, 2); }
}

// Spring: a pad you land on, a coil, and a base. comp = how far the pad is pushed down (0 rest,
// 1 all the way down, below 0 stretched up while it wobbles after a launch).
function drawSpringI(x, y, w, comp) {
  const ty = y + clamp(comp, -0.9, 1.05) * SPRING_DEPTH;   // the pad's top
  const by = y + 22;                                      // the base's top
  const cx = x + w / 2, rx = Math.min(13, w * 0.2);
  // the coil: three loops squeezed between the pad and the base
  const c0 = ty + 9, h = Math.max(2, by - c0), turns = 3, ry = h / (turns * 2);
  ctx.strokeStyle = PAL.springD; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < turns; i++) {
    ctx.beginPath(); ctx.ellipse(cx, c0 + ry * (2 * i + 1), rx, Math.max(1, ry), 0, 0, Math.PI * 2); ctx.stroke();
  }
  slab(x + 8, by, w - 16, 7, PAL.springD, PAL.springD);   // base
  slab(x, ty, w, 10, PAL.spring, PAL.springD);            // pad
  ctx.fillStyle = '#ffffff';                              // two little highlights on the pad
  for (const dx of [10, w - 10]) { ctx.beginPath(); ctx.arc(x + dx, ty + 5, 1.8, 0, Math.PI * 2); ctx.fill(); }
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

// Lightning beam: two posts, a flicker while it warms up, then a jagged bolt while it's on
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

// Two Paths region: the dividing wall, in the same stone as the side walls
function drawDivider(dv) {
  const top = Math.max(dv.top, camY - OY - 10), bot = Math.min(dv.bot, camY + H + OY + 10);
  if (bot <= top) return;
  // A column of the wall's soft blocks, with a rounded deep edge, a foot and (pillars) a cap
  ctx.fillStyle = PAL.wall; ctx.beginPath(); ctx.roundRect(dv.x, top, dv.w, bot - top, 6); ctx.fill();
  tiles(dv.x + 3, dv.x + dv.w - 3, top + 2, bot - 2, dv.w - 6, 30, 6);
  ctx.strokeStyle = PAL.wallLine; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(dv.x + 1, top + 1, dv.w - 2, bot - top - 2, 6); ctx.stroke();
  ctx.fillStyle = PAL.nozzle;
  if (dv.bot <= bot) { ctx.beginPath(); ctx.roundRect(dv.x - 4, dv.bot - 7, dv.w + 8, 7, 3.5); ctx.fill(); }    // its foot
  if (dv.pillar && dv.top >= top) { ctx.beginPath(); ctx.roundRect(dv.x - 4, dv.top, dv.w + 8, 7, 3.5); ctx.fill(); }   // a pillar's cap
}

// Bubble column: a pale blue stream with bubbles rising through it
function drawBubbles(b) {
  if (b.bot < camY - OY - 20 || b.top > camY + H + OY + 20) return;
  const [soft, deep] = SOFT.sky, h = b.bot - b.top, cx = b.x + b.w / 2;
  // the column: a soft rounded sky shape with a light edge (round at the top, open into the vent below)
  ctx.globalAlpha = 0.4; ctx.fillStyle = soft;
  ctx.beginPath(); ctx.roundRect(b.x, b.top, b.w, h, [b.w / 2, b.w / 2, 6, 6]); ctx.fill();
  ctx.globalAlpha = 0.45; ctx.strokeStyle = soft; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(b.x + 1, b.top + 1, b.w - 2, h - 2, [b.w / 2, b.w / 2, 6, 6]); ctx.stroke();
  // chevrons drifting up the middle: this way!
  ctx.globalAlpha = 0.5; ctx.strokeStyle = deep; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 0; k < 4; k++) {
    const y = b.bot - 20 - ((time * 70 + k * h / 4) % (h - 40));
    ctx.beginPath(); ctx.moveTo(cx - 7, y + 4); ctx.lineTo(cx, y - 3); ctx.lineTo(cx + 7, y + 4); ctx.stroke();
  }
  // bubbles: rings and dots rising and swaying, bigger as they go up
  for (let k = 0; k < 9; k++) {
    const sp = 80 + hash(b.seed, k) * 70, f = ((time * sp + hash(b.seed + k, 7) * h) % h) / h;
    const y = b.bot - f * h, x = cx + Math.sin(time * 3 + k) * (b.w / 2 - 12) * hash(k, 3);
    const r = (2.5 + hash(k, b.seed) * 3.5) * (0.7 + f * 0.6);
    ctx.globalAlpha = 0.85 * Math.min(1, (1 - f) * 4);
    drawShape(ctx, k % 3 ? 'ring' : 'dot', x, y, r, k % 3 ? '#ffffff' : deep);
  }
  ctx.globalAlpha = 1;
  // the vent it rises from
  slab(b.x + 4, b.bot - 4, b.w - 8, 8, soft, deep);
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

// A player's cube, squashed when it lands. Other computers' cubes are faded ghosts (js/look.js).
function drawPlayer(p) {
  if (p.dead) {   // knocked out: the cube spins up and tumbles away (knockOut in js/game.js)
    const a = p.deathAnim;
    if (!a || a.t > 3 || a.y > camY + H + OY + 80) return;
    ctx.save();
    ctx.globalAlpha = (p.remote ? 0.5 : 1) * clamp(2.6 - a.t, 0, 1);
    ctx.translate(a.x + p.w / 2, a.y + p.h / 2); ctx.rotate(a.rot);
    const P = p.remote ? GHOST : { c: p.color, d: p.dark }, k = p.w / PS;
    drawCubeArt(-p.w / 2, -p.h / 2, p.w, p.h, P, p.look, 0, 1, true);   // X eyes, hat off
    ctx.restore();
    // the hat and the shades, flying off on their own
    for (const [o, draw] of [[a.hat, () => drawHat(-p.w / 2, 0, p.w, p.look.h, k, 0, P)],
                             [a.shades, () => drawFace(-p.w / 2, -p.h * 0.36 - 3, p.w, p.h, 5, k, 0, false)]]) {
      if (!o) continue;
      ctx.save(); ctx.globalAlpha = (p.remote ? 0.5 : 1) * clamp(2.6 - a.t, 0, 1);
      ctx.translate(o.x, o.y); ctx.rotate(o.rot); draw(); ctx.restore();
    }
    return;
  }
  const sx = 1 / Math.sqrt(p.sq), sy = p.sq;
  const w = p.w * sx, h = p.h * sy;
  const x = p.x + p.w / 2 - w / 2, y = p.y + p.h - h;
  if (p.remote) ctx.globalAlpha = 0.5;
  drawCubeArt(x, y, w, h, p.remote ? GHOST : { c: p.color, d: p.dark }, p.look, p.face, p.blink);
  ctx.globalAlpha = 1;
}

function render() {
  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);
  drawBackground();
  if (state === 'wardrobe') drawWardrobeRoom();   // wallpaper, exit door, mirror (js/wardrobe.js)

  ctx.save();
  ctx.translate(0, -camY);
  for (const b of bubbles) drawBubbles(b);
  for (const p of platforms) drawPlatform(p);
  if (state === 'lobby') drawLobbyDoor();   // the wardrobe door on the floor (js/wardrobe.js)
  for (const z of zaps) drawZapper(z);
  for (const dv of dividers) drawDivider(dv);
  for (const g of gems) drawGem(g);
  for (const b of blades) drawBlade(b);
  // Other computers' cubes first, so yours are always drawn in front
  for (const p of players) if (p.remote) drawPlayer(p);
  for (const p of players) if (!p.remote) drawPlayer(p);
  for (const f of fireballs) {
    // a little flame-coloured ball: a soft halo, an apricot ball, a butter middle and a cream spark
    ctx.fillStyle = PAL.flame; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(f.x, f.y - f.r * 0.3, f.r * 1.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.fire; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.flame2; ctx.beginPath(); ctx.arc(f.x, f.y + f.r * 0.15, f.r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.flameCore; ctx.beginPath(); ctx.arc(f.x - f.r * 0.15, f.y + f.r * 0.25, f.r * 0.28, 0, Math.PI * 2); ctx.fill();
  }
  for (const q of particles) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    if (q.kind) drawShape(ctx, q.kind, q.x, q.y, q.size * 0.6, q.color, q.rot || 0);
    else { ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
  }
  ctx.globalAlpha = 1;
  drawWalls();
  for (const j of jets) drawJet(j);
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = clamp(t.t, 0, 1);
    ctx.font = `900 ${t.size}px ${FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineJoin = 'round';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Fireball warnings at the top edge
  for (const w of warnings) {
    if (Math.floor(w.t * 10) % 2) continue;
    ctx.fillStyle = PAL.fire;
    const wx = w.x;
    const wy = 14 - OY;   // top of the window
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - 13, wy + 22); ctx.lineTo(wx + 13, wy + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 14px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('!', wx, wy + 19);
  }

  // Tall windows show a bit below the tower's bottom edge: that's out, so shade it
  if (OY > 0) {
    ctx.fillStyle = 'rgba(91,75,107,0.14)'; ctx.fillRect(-OX, H, VW, OY);
    ctx.fillStyle = 'rgba(232,106,152,0.35)'; ctx.fillRect(-OX, H - 1, VW, 2);
  }
  if (state === 'play') drawDanger();
  ctx.restore();
  drawHUD();
}

// Red glow at the bottom when someone is about to fall off the screen
function drawDanger() {
  if (camY >= -40) return;
  let danger = 0;
  for (const p of alive()) danger = Math.max(danger, (p.y - (camY + H * 0.72)) / (H * 0.28));
  danger = clamp(danger, 0, 1);
  if (danger <= 0) return;
  const g = ctx.createLinearGradient(0, H, 0, H - 150);
  g.addColorStop(0, `rgba(232,106,152,${0.45 * danger * (0.7 + 0.3 * Math.sin(time * 12))})`); g.addColorStop(1, 'rgba(232,106,152,0)');
  ctx.fillStyle = g; ctx.fillRect(-OX, H - 150, VW, 150);
}

// OUTLINE: draw a soft white edge round the letters first (cheap, unlike a blurred shadow)
let OUTLINE = false;
function text(str, x, y, size, color, align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align;
  if (OUTLINE) { ctx.lineWidth = Math.max(3, size * 0.14); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}

// A cube on a menu / results screen (size s), with its look
function cube(x, y, s, P, look) { drawCubeArt(x, y, s, s, P, look, 0, 1); }
