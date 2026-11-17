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
  ctx.fillStyle = g;
  if (finaleOn() || deathCam) ctx.fillRect(-OX, -OY, VW, VH);   // zoomed in on a winner: the walls no longer cover the edges
  else ctx.fillRect(WALL - 4, -OY, W - 2 * WALL + 8, VH);   // only inside the tower: the walls cover the rest
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
  const top = camY - OY, tall = finaleOn() || deathCam ? VH + 400 : VH;   // (a little more while zoomed in on a winner)
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
// lw: the outline — 3 px, the same as the cubes' and the portals' (EDGE)
const EDGE = 3;
function slab(x, y, w, h, face, edge, lw = EDGE, drop = 0) {
  const r = Math.min(5, h / 2, w / 2);   // softly rounded corners
  if (drop) { ctx.fillStyle = edge; ctx.beginPath(); ctx.roundRect(x, y + drop, w, h, r); ctx.fill(); }
  ctx.fillStyle = face; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.beginPath(); ctx.roundRect(x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2)); ctx.stroke();
}
// A white button-platform (lobby, wardrobe, room). on: someone stands on it — it lights up in `color`.
function buttonSlab(p, on, color = PAL.ink, drop = 0) {
  slab(p.x, p.y, p.w, p.h, '#ffffff', on ? color : PAL.normalD, EDGE, drop);
}

// (Platforms only stop being drawn once they're fully out of view; the start scene's rows are placed so
// none is cut by the top of the window — see clearTopEdge in js/level.js.)
function drawPlatform(p) {
  if (p.y + p.h + 30 < camY - OY || p.y > camY + H + OY + 80) return;
  const y = p.y;
  if (p.type === 'ground') {
    // The floor: a lilac slab with a rounded deep edge on top, built of the same soft blocks
    const T = (a, b, y0, y1) => tiles(a, b, y0, y1, 58, 30, 6, 'rgba(255,255,255,0.28)', PAL.ground);
    if (p.hole) {   // the race floor over the room, with START's hole in it (js/lift.js)
      const hx = p.hole.x, hw = p.hole.w;
      T(-OX, hx, y, y + p.h); T(hx + hw, W + OX, y, y + p.h);
      if (!lift) T(-OX, W + OX, y + p.h, y + p.h + OY + 400);   // (while the lift runs, the room is below)
      ctx.fillStyle = PAL.groundD;
      ctx.beginPath(); ctx.roundRect(p.x - 2, y, hx - p.x + 2, 5, 2.5); ctx.roundRect(hx + hw, y, p.x + p.w + 2 - hx - hw, 5, 2.5); ctx.fill();
      return;
    }
    T(-OX, W + OX, y, y + p.h + OY + 400);   // (deep enough for the winner zoom too)
    ctx.fillStyle = PAL.groundD; ctx.beginPath(); ctx.roundRect(p.x - 2, y, p.w + 4, 5, 2.5); ctx.fill();
    ctx.fillStyle = PAL.inkSoft; ctx.font = `700 16px ${FONT}`; ctx.textAlign = 'center';
    if (state !== 'lobby' && state !== 'room' && state !== 'wardrobe' && state !== 'hub' && !p.roomPart && !(gen && gen.lobby)) ctx.fillText('START', W / 2, y + 40);
    return;
  }
  if (p.menu === 'lift') return drawLiftPlatform(p);     // (js/lift.js)
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

  if (p.spikes) drawSpikes(p, x, y);   // (js/obstacles/spikes.js)
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


// Lightning beam: two posts, a flicker while it warms up, then a jagged bolt while it's on

// Two Paths region: the dividing wall, in the same stone as the side walls
function drawDivider(dv) {
  if (dv.ceiling) return drawCeiling(dv);   // the online hub's low ceiling (js/hub.js)
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



// A player's cube, squashed when it lands. Other computers' cubes keep their colours, a little see-through.
const OTHERS_ALPHA = 0.5;
function drawPlayer(p) {
  if (p.liftHide) return;   // not on the lift: appears at the start line when it arrives
  if (p.dead) {   // knocked out: the cube spins up and tumbles away (knockOut in js/game.js)
    const a = p.deathAnim;
    if (!a || a.t > 3 || a.y > camY + H + OY + 80) return;
    ctx.save();
    ctx.globalAlpha = (p.remote ? OTHERS_ALPHA : 1) * clamp(2.6 - a.t, 0, 1);
    ctx.translate(a.x + p.w / 2, a.y + p.h / 2); ctx.rotate(a.rot);
    const P = { c: p.color, d: p.dark }, k = p.w / PS;
    drawCubeArt(-p.w / 2, -p.h / 2, p.w, p.h, P, p.look, 0, 1, true);   // one body: X eyes, hat and shades off
    ctx.restore();
    // the hat and the shades, flying off on their own
    for (const [o, draw] of [[a.hat, () => drawHat(-p.w / 2, 0, p.w, p.look.h, k, 0, P)],
                             [a.shades, () => drawFace(-p.w / 2, -p.h * 0.36 - 3, p.w, p.h, p.look.f, k, 0, false)]]) {
      if (!o) continue;
      ctx.save(); ctx.globalAlpha = (p.remote ? OTHERS_ALPHA : 1) * clamp(2.6 - a.t, 0, 1);
      ctx.translate(o.x, o.y); ctx.rotate(o.rot); draw(); ctx.restore();
    }
    return;
  }
  const sx = 1 / Math.sqrt(p.sq), sy = p.sq;
  const w = p.w * sx, h = p.h * sy;
  const x = p.x + p.w / 2 - w / 2, y = p.y + p.h - h;
  if (p.remote) ctx.globalAlpha = OTHERS_ALPHA;
  drawCubeArt(x, y, w, h, { c: p.color, d: p.dark }, p.look, p.face, p.blink);
  ctx.globalAlpha = 1;
}

function render() {
  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);
  drawBackground();
  if (state === 'wardrobe') drawWardrobeRoom();   // wallpaper, exit door, mirror (js/wardrobe.js)

  ctx.save();
  if (deathCam) {     // an obstacle got you: zoomed in on the moment of contact (js/game.js)
    const e = deathZoom(), z = 1 + (DEATH_ZOOM - 1) * e, wx = deathCam.x, wy = deathCam.y - camY;
    ctx.translate(W / 2, H / 2); ctx.scale(z, z);
    ctx.translate(-(W / 2 + (wx - W / 2) * e), -(H / 2 + (wy - H / 2) * e));
  } else if (finaleOn()) {   // the race is won: zoom in on the winner (js/hud.js)
    const wp = players.find(p => p.i === winner);
    if (wp) {
      const e = finaleZoom(), z = 1 + (FINALE_ZOOM - 1) * e;
      const wx = wp.x + wp.w / 2, wy = wp.y + wp.h / 2 - camY;
      ctx.translate(W / 2, H / 2); ctx.scale(z, z);
      ctx.translate(-(W / 2 + (wx - W / 2) * e), -(H / 2 + (wy - H / 2) * e));
    }
  }
  ctx.translate(0, -camY);
  for (const b of bubbles) drawBubbles(b);
  for (const p of platforms) drawPlatform(p);
  if (state === 'lobby' || state === 'room' || state === 'hub') drawLobbyDoor();   // the wardrobe door on the floor (js/wardrobe.js)
  // a game started from the start scene: its portals stay as they are and scroll away with the floor (no fade)
  else if (inStartTowerGame() && camY + H + OY > GROUND_Y - DOOR_H - 60) drawLobbyDoor();
  for (const z of zaps) drawZapper(z);
  for (const dv of dividers) drawDivider(dv);
  for (const g of gems) drawGem(g);
  for (const b of blades) drawBlade(b);
  // Other computers' cubes first, so yours are always drawn in front
  for (const p of players) if (p.remote) drawPlayer(p);
  for (const p of players) if (!p.remote) drawPlayer(p);
  drawFireballs();   // (js/obstacles/fireball.js)
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

  drawFireballWarnings();   // fireball warnings at the top edge (js/obstacles/fireball.js)

  // Tall windows show a bit below the tower's bottom edge: that's out, so shade it
  if (OY > 0) {
    ctx.fillStyle = 'rgba(91,75,107,0.14)'; ctx.fillRect(-OX, H, VW, OY);
  }
  if (state === 'play') drawDanger();
  ctx.restore();
  if (deathCam && deathCam.t < 0.16) {   // a quick white flash on contact
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - deathCam.t / 0.16)})`; ctx.fillRect(-OX, -OY, VW, VH);
  }
  drawHUD();
  drawNotices();      // "Pink went to the room" (js/chat.js)
  drawScreenWipe();   // leaving an end screen (js/menu.js)
  drawDoorIris();     // going through the wardrobe door (js/wardrobe.js)
  drawIris();         // online: connecting -> room, room -> race (js/net.js)
}

// When someone is about to fall off the bottom: the danger line of shapes (drawDangerLine)
function drawDanger() {
  if (camY >= -40) return;
  let danger = 0;
  for (const p of alive()) danger = Math.max(danger, (p.y - (camY + H * 0.72)) / (H * 0.28));
  danger = clamp(danger, 0, 1);
  if (danger <= 0) return;
  drawDangerLine(danger);   // (only the shapes: no red glow or line)
}
// The deadly edge made visible: a line of the style's little shapes all along the bottom of the tower,
// shown only while someone is near it and stronger the closer they are. They bob and turn and drift along
// the line; close to the edge some break away and rise as sparks. (Tension for whoever has fallen behind.)
const DANGER_SHAPES = ['dot', 'tri', 'ring', 'plus', 'sq'], DANGER_COLS = ['rose', 'apricot', 'rose', 'butter', 'rose', 'lilac'];
function drawDangerLine(danger) {
  const span = W - 2 * WALL, n = Math.round(span / 9), base = H - 10;   // (dense: about one shape every 7 px)
  ctx.save();
  for (let k = 0; k < n; k++) {
    const h = m => ((Math.sin(k * 91.7 + m * 47.3) * 43758.5453) % 1 + 1) % 1;
    const row = k % 2;                                               // two staggered rows
    const x = WALL + (((k + 0.5) / n * span + time * (h(1) < 0.5 ? -18 : 18) * (0.5 + h(2))) % span + span) % span;
    const y = base - row * 14 + Math.sin(time * (2 + h(3) * 3) + h(4) * 6.3) * 3.5;
    const r = (5 + h(5) * 4) * (0.6 + 0.6 * danger);   // (big enough to read at a glance)
    ctx.globalAlpha = danger * (0.5 + 0.45 * Math.sin(time * 6 + h(6) * 6.3)) * (row ? 0.75 : 1);
    drawShape(ctx, DANGER_SHAPES[k % 5], x, y, r, SOFT[DANGER_COLS[k % 6]][1], time * (h(7) < 0.5 ? -1.5 : 1.5) + k);
    // sparks: as it gets close, more and more rise off the line and fade
    const sparkFrom = 0.25;
    if (danger > sparkFrom && h(8) < 0.25 + 0.6 * danger) {
      const life = ((time * (0.6 + h(9) * 0.7) + h(10)) % 1);
      ctx.globalAlpha = (danger - sparkFrom) / (1 - sparkFrom) * (1 - life) * 0.9;
      drawShape(ctx, DANGER_SHAPES[(k + 2) % 5], x + Math.sin(life * 6 + k) * 8, base - life * (60 + 70 * danger) * (0.6 + h(11) * 0.8), r * (1 - life * 0.5), SOFT[DANGER_COLS[(k + 1) % 6]][1], time * 2 + k);
    }
  }
  ctx.restore();
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
