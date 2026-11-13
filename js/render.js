// RCS — Drawing the world: background, walls, platforms, hazards and players.
'use strict';

// Background colours: the region's, blending into the next region's over the last 20 m before it
function bgAt(m) {
  m = Math.max(0, m);
  const k = regionIndex(m), end = START_REGION + (k + 1) * REGION_LEN;
  const a = REGIONS[regionAt(m)].bg, b = REGIONS[regionAt(end)].bg;
  const t = clamp((m - (end - 20)) / 20, 0, 1);
  return [mixHex(a[0], b[0], t), mixHex(a[1], b[1], t)];
}

function drawBackground() {
  const [top, bot] = bgAt(heightM(camY + H / 2));
  const g = ctx.createLinearGradient(0, -OY, 0, H + OY);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(-OX, -OY, VW, VH);   // the whole window
  drawScenery();

}

// Background: big soft geometric shapes drifting slower than the tower (each region has its own family of
// shapes, in its colours), and a sparse layer of small shapes rising through the air
function drawScenery() {
  const span = VH * 2.4;
  for (let k = 0; k < 16; k++) {
    const s = 26 + hash(k, 3) * 60;
    const x = WALL + hash(k, 1) * (W - 2 * WALL);
    let y = (hash(k, 2) * span - camY * 0.3) % span;
    if (y < 0) y += span;
    y -= s + OY;
    if (y > H + OY + s) continue;
    const R0 = REGIONS[regionAt(heightM(camY + y))];
    ctx.globalAlpha = 0.5;
    drawShape(ctx, R0.shapes[k % R0.shapes.length], x, y, s / 2, R0.plat[0], time * 0.08 * (k % 2 ? 1 : -1) + k);
  }
  // The rising air: little shapes drifting up the screen, swaying, fading in and out
  const AIR = ['dot', 'tri', 'ring', 'plus', 'sq'];
  for (let k = 0; k < 26; k++) {
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
function tiles(x0, x1, y0, y1, bw = 58, bh = 30, gap = 6, color = TILE) {
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.fillStyle = color; ctx.beginPath();
  const rh = bh + gap, cw = bw + gap;
  for (let r = Math.floor(y0 / rh); r * rh < y1; r++) {
    const off = (r & 1) ? cw / 2 : 0;
    for (let x = Math.floor((x0 - off) / cw) * cw + off; x < x1; x += cw) ctx.roundRect(x + gap / 2, r * rh + gap / 2, bw, bh, 8);
  }
  ctx.fill();
  ctx.restore();
}

function drawWalls() {
  // The side walls, carried on out to the edges of the window (and above / below on tall windows)
  const top = camY - OY, tall = VH;
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(-OX, top, OX + WALL, tall); ctx.fillRect(W - WALL, top, WALL + OX, tall);
  tiles(-OX, WALL - 4, top, top + tall); tiles(W - WALL + 4, W + OX, top, top + tall);
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
    ctx.fillStyle = PAL.ground; ctx.fillRect(-OX, y, VW, p.h + OY + 20);
    tiles(-OX, W + OX, y + 6, y + p.h + OY + 20, 58, 30, 6, 'rgba(255,255,255,0.28)');
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
    // faint track showing how far it slides
    ctx.fillStyle = 'rgba(127,207,176,0.35)';
    ctx.fillRect(p.baseX - p.amp, y + p.h / 2 - 1, p.w + 2 * p.amp, 2);
  }
  if (p.type === 'tilt') {
    // Seesaw: a post and pivot pin, and the plank turned around the pivot (centre of its top)
    ctx.fillStyle = cd;
    ctx.beginPath(); ctx.moveTo(p.px - 14, y + 34); ctx.lineTo(p.px + 14, y + 34); ctx.lineTo(p.px, y + 6); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(p.px, p.py); ctx.rotate(p.angle);
    slab(-p.w / 2, 0, p.w, p.h, c, cd);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 8, 4, 0, 7); ctx.fill();
    ctx.fillStyle = cd; ctx.beginPath(); ctx.arc(0, 8, 2, 0, 7); ctx.fill();
    ctx.restore();
  } else if (p.type === 'spring') {
    drawSpringI(x, y, p.w, p.bounceT > 0 ? 5 : 0);
  } else if (p.type === 'normal') {
    drawPlainPlatform(p);
  } else {
    slab(x, y, p.w, p.h, c, cd);
  }

  if (p.spikes) {
    const x0 = x + p.spikes.x0, len = p.spikes.x1 - p.spikes.x0;
    const n = Math.max(1, Math.floor(len / 11)), sw = len / n;
    ctx.fillStyle = PAL.spike;
    for (let k = 0; k < n; k++) {
      ctx.beginPath(); ctx.moveTo(x0 + k * sw, y); ctx.lineTo(x0 + k * sw + sw / 2, y - 11); ctx.lineTo(x0 + (k + 1) * sw, y); ctx.closePath(); ctx.fill();
    }
  }
}

// A plain platform in its region's style: colours, a decoration, and a bracket into the wall when it's next to one
function drawPlainPlatform(p) {
  const R0 = REGIONS[regionAt(heightM(p.y))], [c, cd] = R0.plat, x = p.x, y = p.y, w = p.w, h = p.h;
  ctx.fillStyle = cd;
  if (x - WALL < 0.5) { ctx.beginPath(); ctx.moveTo(WALL, y + h); ctx.lineTo(WALL + Math.min(40, w * 0.5), y + h); ctx.lineTo(WALL, y + h + 26); ctx.closePath(); ctx.fill(); }
  else if (W - WALL - (x + w) < 0.5) { ctx.beginPath(); ctx.moveTo(W - WALL, y + h); ctx.lineTo(W - WALL - Math.min(40, w * 0.5), y + h); ctx.lineTo(W - WALL, y + h + 26); ctx.closePath(); ctx.fill(); }
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

// Spring shaped like an "I": top bar you land on, a short post, and a bottom bar.
// `sq` pushes the top bar down while it's bouncing.
function drawSpringI(x, y, w, sq) {
  ctx.fillStyle = PAL.springD;
  ctx.fillRect(x + 4, y + 16, w - 8, 6);                 // bottom bar
  ctx.fillRect(x + w / 2 - 5, y + 6 + sq, 10, 10 - sq);  // post
  slab(x, y + sq, w, 8, PAL.spring, PAL.springD);         // top bar
}

function drawBlade(b) {
  if (b.y < camY - OY - 40 || b.y > camY + H + OY + 40) return;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(b.ang);
  ctx.fillStyle = PAL.blade;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const r = k % 2 ? b.r * 0.38 : b.r;
    const a = k * Math.PI / 4;
    k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(r, 0);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
  ctx.restore();
  // faint patrol track
  ctx.fillStyle = 'rgba(108,91,123,0.12)';
  ctx.fillRect(b.lo, b.y - 1, b.hi - b.lo, 2);
}

// Lightning beam: two posts, a flicker while it warms up, then a jagged bolt while it's on
function drawZapper(z) {
  if (Math.max(z.y1, z.y2) < camY - OY - 40 || Math.min(z.y1, z.y2) > camY + H + OY + 40) return;
  const s = zapState(z);
  if (s === 1 && Math.floor(time * 14) % 2) {
    ctx.strokeStyle = 'rgba(255,216,74,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); ctx.stroke(); ctx.setLineDash([]);
  } else if (s === 2) {
    const n = 12, dx = z.x2 - z.x1, dy = z.y2 - z.y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const k = Math.floor(time * 30);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const j = i === 0 || i === n ? 0 : (hash(z.seed + i, k) - 0.5) * 18;
      pts.push([z.x1 + dx * i / n + nx * j, z.y1 + dy * i / n + ny * j]);
    }
    const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,216,74,0.35)'; ctx.lineWidth = 12; path();
    ctx.strokeStyle = PAL.zap; ctx.lineWidth = 4; path();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; path();
  }
  for (const [x, y] of [[z.x1, z.y1], [z.x2, z.y2]]) {
    ctx.fillStyle = PAL.zapPost; ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.fillStyle = s ? PAL.zap : '#b4a5d1'; ctx.fillRect(x - 3, y - 3, 6, 6);
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
  const g = ctx.createLinearGradient(0, b.bot, 0, b.top);
  g.addColorStop(0, 'rgba(124,200,236,0.32)'); g.addColorStop(1, 'rgba(124,200,236,0.04)');
  ctx.fillStyle = g; ctx.fillRect(b.x, b.top, b.w, b.bot - b.top);
  const h = b.bot - b.top;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
  for (let k = 0; k < 9; k++) {
    const sp = 80 + hash(b.seed, k) * 70, r = 3 + hash(k, b.seed) * 5;
    const y = b.bot - ((time * sp + hash(b.seed + k, 7) * h) % h);
    const x = b.x + b.w / 2 + Math.sin(time * 3 + k) * (b.w / 2 - 10) * hash(k, 3);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  }
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
  if (j.wall) ctx.fillRect(-12, -h * 0.6, 12, h * 1.2);
  else { ctx.fillRect(-4, -h * 0.55, 14, h * 1.1); ctx.fillStyle = PAL.blade; ctx.fillRect(-4, -h * 0.55, 4, h * 1.1); }
  if (s === 1 && Math.floor(time * 12) % 2) {
    ctx.fillStyle = 'rgba(255,154,118,0.6)'; ctx.fillRect(0, -h * 0.4, 18, h * 0.8);
  }
  if (s === 2) {
    const len = j.len * (0.92 + 0.08 * Math.sin(time * 30 + j.ox));
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, PAL.flame2); g.addColorStop(0.5, PAL.flame); g.addColorStop(1, 'rgba(255,154,118,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -h * 0.7); ctx.lineTo(len * 0.25, -h); ctx.lineTo(len, -h * 0.6); ctx.lineTo(len, h * 0.6); ctx.lineTo(len * 0.25, h); ctx.lineTo(0, h * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, -h * 0.25, len * 0.5, h * 0.5);
  }
  ctx.restore();
}

// A player's cube, squashed when it lands. Other computers' cubes are faded ghosts (js/look.js).
function drawPlayer(p) {
  if (p.dead) return;
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
    ctx.fillStyle = 'rgba(255,140,105,0.25)'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 1.8, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.fire; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
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
    ctx.fillStyle = 'rgba(255,123,156,0.35)'; ctx.fillRect(-OX, H - 1, VW, 2);
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
  g.addColorStop(0, `rgba(255,123,156,${0.45 * danger * (0.7 + 0.3 * Math.sin(time * 12))})`); g.addColorStop(1, 'rgba(255,123,156,0)');
  ctx.fillStyle = g; ctx.fillRect(-OX, H - 150, VW, 150);
}

function text(str, x, y, size, color, align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align;
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}

// A cube on a menu / results screen (size s), with its look
function cube(x, y, s, P, look) { drawCubeArt(x, y, s, s, P, look, 0, 1); }
