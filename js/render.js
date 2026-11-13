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

// Background shapes drifting slower than the tower, matching the region at their height: clouds,
// trees, crystals, hills, gears, flames, storm clouds, seaweed, columns
function drawScenery() {
  const span = VH * 2.4;
  for (let k = 0; k < 18; k++) {
    const s = 50 + hash(k, 3) * 110;
    const x = WALL + hash(k, 1) * (W - 2 * WALL);
    let y = (hash(k, 2) * span - camY * 0.3) % span;
    if (y < 0) y += span;
    y -= s + OY;
    if (y > H + OY + s) continue;
    const R0 = REGIONS[regionAt(heightM(camY + y))];
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = R0.plat[1]; ctx.strokeStyle = R0.plat[1];
    drawSceneryShape(R0.scenery, s, k);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawSceneryShape(kind, s, k) {
  // Shapes made of several parts are built as one path and filled once, so the see-through
  // parts don't overlap into darker patches
  const blob = (circles, rect) => {
    ctx.beginPath();
    for (const [x, y, r] of circles) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
    if (rect) ctx.rect(...rect);
    ctx.fill('nonzero');
  };
  if (kind === 'cloud' || kind === 'storm') {
    blob([[-s * 0.3, s * 0.02, s * 0.28], [0, -s * 0.12, s * 0.38], [s * 0.32, s * 0.02, s * 0.26]], [-s * 0.3, 0, s * 0.62, s * 0.28]);
    if (kind === 'storm' && Math.floor(time * 2 + k) % 7 === 0) {
      ctx.globalAlpha = 0.5; ctx.strokeStyle = PAL.zap; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.lineTo(-s * 0.1, s * 0.6); ctx.lineTo(s * 0.06, s * 0.6); ctx.lineTo(-s * 0.06, s * 0.95); ctx.stroke();
    }
  } else if (kind === 'tree') {
    blob([[0, -s * 0.05, s * 0.36], [-s * 0.22, s * 0.1, s * 0.24], [s * 0.22, s * 0.1, s * 0.24]], [-s * 0.06, 0, s * 0.12, s * 0.7]);
  } else if (kind === 'crystal') {
    ctx.beginPath();
    for (const [dx, h, w] of [[-s * 0.2, 0.7, 0.18], [0, 1, 0.24], [s * 0.22, 0.55, 0.16]]) {
      ctx.moveTo(dx, -s * h * 0.6); ctx.lineTo(dx + s * w, 0); ctx.lineTo(dx, s * 0.4); ctx.lineTo(dx - s * w, 0); ctx.closePath();
    }
    ctx.fill('nonzero');
  } else if (kind === 'hill') {
    ctx.beginPath(); ctx.moveTo(-s, s * 0.4); ctx.quadraticCurveTo(0, -s * 0.6, s, s * 0.4); ctx.closePath(); ctx.fill();
  } else if (kind === 'gear') {
    ctx.rotate(time * 0.3 * (k % 2 ? 1 : -1));
    // Teeth, the wheel and its hole in one path: the hole (drawn the other way round) stays empty,
    // so the background shows through it
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, c = Math.cos(a), n = Math.sin(a), tw = s * 0.08;
      const pt = (u, v) => [u * c - v * n, u * n + v * c];
      [[-tw, -s * 0.5], [tw, -s * 0.5], [tw, -s * 0.3], [-tw, -s * 0.3]].forEach(([u, v], j) => { const [x, y] = pt(u, v); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
    }
    ctx.moveTo(s * 0.36, 0); ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
    ctx.moveTo(s * 0.13, 0); ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
  } else if (kind === 'flame') {
    const f = 1 + Math.sin(time * 4 + k) * 0.06;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.6 * f); ctx.quadraticCurveTo(s * 0.4, 0, s * 0.2, s * 0.35); ctx.quadraticCurveTo(0, s * 0.5, -s * 0.2, s * 0.35); ctx.quadraticCurveTo(-s * 0.4, 0, 0, -s * 0.6 * f); ctx.fill();
  } else if (kind === 'weed') {
    ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
    for (const dx of [-s * 0.15, s * 0.12]) {
      ctx.beginPath(); ctx.moveTo(dx, s * 0.6);
      for (let i = 1; i <= 6; i++) ctx.lineTo(dx + Math.sin(time * 1.5 + i + k) * s * 0.08, s * 0.6 - i * s * 0.2);
      ctx.stroke();
    }
  } else if (kind === 'column') {
    ctx.fillRect(-s * 0.14, -s * 0.5, s * 0.28, s); ctx.fillRect(-s * 0.22, -s * 0.58, s * 0.44, s * 0.1); ctx.fillRect(-s * 0.22, s * 0.48, s * 0.44, s * 0.1);
  }
}

function drawWalls() {
  // The side walls, carried on out to the edges of the window (and above / below on tall windows)
  const top = camY - OY, tall = VH;
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(-OX, top, OX + WALL, tall); ctx.fillRect(W - WALL, top, WALL + OX, tall);
  if (OX > 0) {   // faint stone courses on the wide parts
    ctx.fillStyle = 'rgba(199,186,223,0.45)';
    for (let y = Math.floor(top / 60) * 60; y < top + tall; y += 60) {
      ctx.fillRect(-OX, y, OX, 2); ctx.fillRect(W, y, OX, 2);
    }
  }
  ctx.fillStyle = PAL.wallLine;
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
function slab(x, y, w, h, face, edge, lw = 2, drop = 4) {
  ctx.fillStyle = edge; ctx.fillRect(x, y + drop, w, h);
  ctx.fillStyle = face; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
}
// A white button-platform (lobby, wardrobe, room). on: someone stands on it — it lights up in `color`.
function buttonSlab(p, on, color = PAL.ink) {
  slab(p.x, p.y, p.w, p.h, '#ffffff', on ? color : PAL.wallLine, on ? 4 : 2, 5);
}

function drawPlatform(p) {
  if (p.y < camY - OY - 60 || p.y > camY + H + OY + 80) return;
  const y = p.y;
  if (p.type === 'ground') {
    ctx.fillStyle = PAL.ground; ctx.fillRect(p.x, y, p.w, p.h);
    ctx.fillStyle = PAL.groundD; ctx.fillRect(p.x, y, p.w, 5);
    ctx.fillStyle = PAL.inkSoft; ctx.font = `700 16px ${FONT}`; ctx.textAlign = 'center';
    if (state !== 'lobby' && state !== 'room' && state !== 'wardrobe') ctx.fillText('START', W / 2, y + 40);
    return;
  }
  if (p.menu === 'start') return drawStartPlatform(p);   // online room (js/room.js)
  if (p.menu === 'door') return drawDoorPlatform(p);     // wardrobe door (js/wardrobe.js)
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
  switch (R0.deco) {
    case 'grass':
      ctx.fillStyle = '#6fb35a';
      for (let i = 6; i < w - 4; i += 11) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + 3, y - 5 - hash(p.id, i) * 3); ctx.lineTo(x + i + 6, y); ctx.fill(); }
      break;
    case 'crystal':
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 10; i < w - 10; i += 34) { ctx.beginPath(); ctx.moveTo(x + i, y + 3); ctx.lineTo(x + i + 4, y + 8); ctx.lineTo(x + i, y + 12); ctx.lineTo(x + i - 4, y + 8); ctx.fill(); }
      break;
    case 'planks':
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let i = 22; i < w; i += 24) ctx.fillRect(x + i, y + 1, 2, h - 5);
      break;
    case 'rivets':
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 7; i < w; i += 18) { ctx.beginPath(); ctx.arc(x + i, y + 6, 1.8, 0, 7); ctx.fill(); }
      break;
    case 'embers':
      for (let i = 8; i < w - 4; i += 16) {
        ctx.fillStyle = `rgba(255,140,80,${0.35 + 0.35 * Math.sin(time * 4 + i + p.id)})`;
        ctx.fillRect(x + i, y + h - 3, 4, 3);
      }
      break;
    case 'stripe':
      ctx.save(); ctx.beginPath(); ctx.rect(x, y + h - 4, w, 4); ctx.clip();
      ctx.fillStyle = PAL.zap;
      for (let i = -4; i < w; i += 12) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 6, y + h); ctx.lineTo(x + i + 10, y + h - 4); ctx.lineTo(x + i + 4, y + h - 4); ctx.fill(); }
      ctx.restore();
      break;
    case 'drips':
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
      for (let i = 12; i < w; i += 30) { ctx.beginPath(); ctx.arc(x + i, y + h + 5 + ((time * 14 + i) % 14), 2.4, 0, 7); ctx.stroke(); }
      break;
    case 'bricks':
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (let i = 16; i < w; i += 32) ctx.fillRect(x + i, y + 1, 2, 6);
      for (let i = 0; i < w; i += 32) ctx.fillRect(x + i, y + 7, 2, 5);
      ctx.fillRect(x, y + 6, w, 1.5);
      break;
  }
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
  slab(x, y + sq, w, 8, PAL.spring, PAL.springD, 2, 3);   // top bar
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
  ctx.fillStyle = PAL.wall; ctx.fillRect(dv.x, top, dv.w, bot - top);
  ctx.fillStyle = PAL.wallLine;
  ctx.fillRect(dv.x, top, 3, bot - top); ctx.fillRect(dv.x + dv.w - 3, top, 3, bot - top);
  for (let y = Math.ceil(top / 60) * 60; y < bot; y += 60) ctx.fillRect(dv.x + 3, y, dv.w - 6, 2);
  if (dv.bot <= bot) { ctx.fillStyle = PAL.nozzle; ctx.fillRect(dv.x - 3, dv.bot - 6, dv.w + 6, 6); }   // its foot
  if (dv.pillar && dv.top >= top) { ctx.fillStyle = PAL.nozzle; ctx.fillRect(dv.x - 4, dv.top, dv.w + 8, 7); }   // a pillar's cap
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
    ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
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
