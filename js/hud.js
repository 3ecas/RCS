// RCS — Drawing the score, menus, buttons and other on-screen text.
'use strict';

// Draw a centred row of coloured text pieces (e.g. one score per player)
function textRow(items, y, size, weight = 900, gap = 18) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const widths = items.map(it => ctx.measureText(it.t).width);
  let x = W / 2 - (widths.reduce((u, v) => u + v, 0) + gap * (items.length - 1)) / 2;
  items.forEach((it, k) => {
    ctx.globalAlpha = it.a ?? 1;
    text(it.t, x, y, size, it.c, 'left', weight);
    x += widths[k] + gap;
  });
  ctx.globalAlpha = 1;
}
// Same, but wrapping to a new row every 5 items (online matches can have up to 10 players)
function textRows(items, y, size, gap = 18, rowGap = size + 8) {
  for (let k = 0; k < items.length; k += 5) textRow(items.slice(k, k + 5), y + (k / 5) * rowGap, size, 900, gap);
}
const tag = p => p.name.toUpperCase();
const localCube = k => COLORS[localColor(k)];
// Online: who plays with which keys on this computer
function onlineKeysText() {
  const mine = players.filter(p => !p.remote);
  if (mine.length <= 1) return `You are ${COLORS[localColor(0)].name.toUpperCase()} — use WASD or the arrow keys`;
  return mine.map(p => `${p.name.toUpperCase()}: ${p.slot ? 'arrow keys' : 'WASD'}`).join('   ·   ');
}

// ---- Small visual building blocks (instead of written instructions) ----

// A keyboard key: a small rounded cap with its label. a = how see-through (0…1), fill = 0…1 lights it up
function keycap(label, x, y, s = 26, color = PAL.ink, a = 1, fill = 0) {
  const base = ctx.globalAlpha; a *= base;          // (respects a fade already in progress)
  ctx.globalAlpha = a;
  const w = Math.max(s, label.length > 1 ? s * 0.4 * label.length + 14 : s), r = 5;
  const box = (yy, h) => { ctx.beginPath(); ctx.roundRect(x - w / 2, yy, w, h, r); };
  ctx.fillStyle = color; box(y + 3, s); ctx.fill();                       // its edge
  ctx.fillStyle = '#ffffff'; box(y, s); ctx.fill();
  if (fill > 0) { ctx.save(); box(y, s); ctx.clip(); ctx.fillStyle = color; ctx.globalAlpha = a * 0.3; ctx.fillRect(x - w / 2, y + s * (1 - fill), w, s * fill); ctx.restore(); ctx.globalAlpha = a; }
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; box(y + 0.75, s - 1.5); ctx.stroke();
  if (label in ARROW_DIR) drawArrow(x, y + s * 0.47, s * 0.5, ARROW_DIR[label], color);
  else text(label, x, y + s * (label.length > 1 ? 0.66 : 0.72), Math.round(s * (label.length > 1 ? 0.46 : 0.62)), color, 'center', 900);
  ctx.globalAlpha = base;
  return w;
}
// The arrow keys' arrows, drawn as rounded strokes in the weight of the game's font (Fredoka has no ← →)
const ARROW_DIR = { '↑': -Math.PI / 2, '→': 0, '↓': Math.PI / 2, '←': Math.PI };
function drawArrow(cx, cy, size, angle, color) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, size * 0.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const h = size / 2;
  ctx.beginPath(); ctx.moveTo(-h, 0); ctx.lineTo(h, 0);                              // shaft
  ctx.moveTo(h * 0.15, -h * 0.75); ctx.lineTo(h, 0); ctx.lineTo(h * 0.15, h * 0.75);   // head
  ctx.stroke(); ctx.restore();
}
// Four keys laid out like a keyboard's: up on top, left / down / right below. Centred on cx, top at y.
function keyCluster(keys4, cx, y, s, color, a = 1, fill = 0) {
  const [u, l, d, r] = keys4, g = s + 4;
  keycap(u, cx, y, s, color, a, fill);
  keycap(l, cx - g, y + g, s, color, a, fill); keycap(d, cx, y + g, s, color, a, fill); keycap(r, cx + g, y + g, s, color, a, fill);
}
const WASD = ['W', 'A', 'S', 'D'], ARROWS = ['↑', '←', '↓', '→'];

// A speaker (sound on), or a speaker with a cross (sound off), centred on cx, cy
function drawSpeaker(cx, cy, k = 1, color = PAL.ink) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  ctx.fillStyle = color;
  ctx.fillRect(-12, -5, 7, 10);
  ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(3, -11); ctx.lineTo(3, 11); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = muted ? PAL.spike : color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
  if (muted) { ctx.moveTo(7, -6); ctx.lineTo(15, 6); ctx.moveTo(15, -6); ctx.lineTo(7, 6); }
  else { ctx.arc(4, 0, 6, -0.9, 0.9); ctx.moveTo(4 + 11 * Math.cos(-0.9), 11 * Math.sin(-0.9)); ctx.arc(4, 0, 11, -0.9, 0.9); }
  ctx.stroke();
  ctx.restore();
}
// A clothes hanger (the wardrobe's sign)
function drawHanger(cx, cy, color = PAL.ink) {
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - 7, 3.5, Math.PI, Math.PI * 2.4);                 // the hook
  ctx.moveTo(cx, cy - 3); ctx.lineTo(cx + 14, cy + 7); ctx.lineTo(cx - 14, cy + 7); ctx.closePath();
  ctx.stroke();
}
// A pause sign (two bars)
function drawPauseIcon(cx, cy, s = 12, color = PAL.ink) {
  ctx.fillStyle = color; ctx.fillRect(cx - s * 0.45, cy - s / 2, s * 0.3, s); ctx.fillRect(cx + s * 0.15, cy - s / 2, s * 0.3, s);
}

function drawButton(b, focused) {
  if (b.icon || b.label === '?') return drawIcon(b, focused);
  const c = b.color || PAL.ink;
  const lift = focused && !b.disabled ? -3 : 0;
  ctx.globalAlpha = b.disabled ? 0.55 : 1;
  const rr = Math.min(16, b.h / 2.6), rect = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  ctx.fillStyle = PAL.wallLine; rect(b.x, b.y + 5, b.w, b.h, rr); ctx.fill();              // shadow
  ctx.fillStyle = b.selected ? c : '#ffffff'; rect(b.x, b.y + lift, b.w, b.h, rr); ctx.fill();
  const lw = focused ? 4 : 2;
  ctx.strokeStyle = focused || b.selected ? c : PAL.wallLine; ctx.lineWidth = lw;
  rect(b.x + lw / 2, b.y + lift + lw / 2, b.w - lw, b.h - lw, rr - lw / 2); ctx.stroke();
  const tc = b.selected ? '#ffffff' : focused ? c : PAL.ink;
  const mid = b.y + lift + b.h / 2;
  if (b.sub) {
    const small = b.h < 70;   // compact two-line button
    text(b.label, b.x + b.w / 2, mid + (small ? 0 : -2), b.h > 88 ? 30 : small ? 19 : 24, tc, 'center', 900);
    text(b.sub, b.x + b.w / 2, mid + (small ? 18 : 24), small ? 12 : 14, b.selected ? 'rgba(255,255,255,0.92)' : PAL.inkSoft, 'center', 700);
  } else {
    text(b.label, b.x + b.w / 2, mid + 8, b.h > 60 ? 24 : 19, tc, 'center', 900);
  }
  ctx.globalAlpha = 1;
}

// Small square corner icon: "?" (instructions) or a speaker (sound on / off)
function drawIcon(b, focused) {
  const hover = focused || inside(b, ui.mx, ui.my);
  ctx.fillStyle = PAL.wallLine; ctx.beginPath(); ctx.roundRect(b.x, b.y + 4, b.w, b.h, 12); ctx.fill();     // solid shadow, like the buttons
  const lift = hover ? -2 : 0;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(b.x, b.y + lift, b.w, b.h, 12); ctx.fill();
  ctx.strokeStyle = hover ? PAL.ink : PAL.wallLine; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(b.x + 1, b.y + 1 + lift, b.w - 2, b.h - 2, 11); ctx.stroke();
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + lift;
  if (b.label === '?') { text('?', cx, cy + 9, 26, PAL.ink, 'center', 900); return; }
  drawSpeaker(cx, cy);
}

// End of a race: the winner revealed big, 80s style — a slowly turning pastel sunburst, a striped sunset
// disc, the winner's cube springing up in the middle and fat chrome-striped letters with a deep 3D shadow
function retroText(str, x, y, size, faces, edge = PAL.ink) {
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  const depth = Math.round(size * 0.09);
  ctx.fillStyle = edge;                                           // the 3D extrusion, down-right
  for (let k = depth; k > 0; k--) ctx.fillText(str, x + k, y + k);
  ctx.lineWidth = size * 0.12; ctx.strokeStyle = edge; ctx.strokeText(str, x, y);
  const g = ctx.createLinearGradient(0, y - size * 0.8, 0, y);    // chrome: hard bands of colour
  faces.forEach((c, k) => { g.addColorStop(k / faces.length, c); g.addColorStop((k + 1) / faces.length - 0.001, c); });
  ctx.fillStyle = g; ctx.fillText(str, x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';                       // a little shine across the top band
  ctx.save(); ctx.beginPath(); ctx.rect(x - 2000, y - size * 0.8, 4000, size * 0.12); ctx.clip(); ctx.fillText(str, x, y); ctx.restore();
}
// The race-over transition: the game stays in view for a moment (WIPE_START s, so you see the knock-out),
// then the sunset stripes sweep in one after another from alternate sides until they cover the screen;
// the winner's entrance starts at REVEAL. Leaving, they sweep away again (screenWipe, drawn in render()).
const WIPE_START = 0.5, REVEAL = 1.15;
const BANDS = ['#ffe7a0', '#ffd59e', '#ffc7a1', '#ffb3b0', '#f7a8c4', '#e8a3c8', '#d4b2ee', '#c8b6f2'];
const wipeIn = k => clamp((overT - WIPE_START - k * 0.05) / 0.45, 0, 1);   // how far band k has swept in
function drawResults() {
  const wp = players.find(p => p.i === winner), t = overT - REVEAL;
  const cx = W / 2, cy = 300;
  // retro sunset stripes filling the whole window, all the same height, sweeping in...
  const bh = VH / BANDS.length;
  BANDS.forEach((c, k) => {
    const e = 1 - Math.pow(1 - wipeIn(k), 3), off = (1 - e) * VW * (k % 2 ? 1 : -1);
    if (e > 0) { ctx.fillStyle = c; ctx.fillRect(-OX + off, -OY + k * bh, VW, bh + 1); }
  });
  if (wipeIn(BANDS.length - 1) < 1 && t < 0) return;
  // ...and soft light rays turning slowly from behind the winner
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 0.15);
  const rays = 18;
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.28 * clamp((overT - 1.0) / 0.5, 0, 1);   // the rays fade in
  ctx.beginPath();
  for (let k = 0; k < rays; k++) { ctx.moveTo(0, 0); ctx.arc(0, 0, 2000, (k / rays) * Math.PI * 2, ((k + 0.5) / rays) * Math.PI * 2); ctx.closePath(); }
  ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
  const R = 150;   // (where the text sits below the winner)
  // the words pop in (an overshooting scale) just after the winner appears
  const popIn = (u, draw) => {
    if (u <= 0) return;
    const sc = u >= 1 ? 1 : 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
    ctx.save(); ctx.translate(cx, 0); ctx.scale(sc, sc); ctx.translate(-cx, 0); draw(); ctx.restore();
  };
  const title = ['#a8d4f5', '#c8b6f2', '#f7a8c4', '#ffc7a1'];
  if (wp) {
    drawPodium(cx, cy, t);             // 2nd and 3rd behind, and the winner's block (js below)
    if (t > 0) drawWinnerCube(wp, cx, cy, t, (towerSeed >>> 0) % WIN_STYLES);
    const mine = net.status === 'playing' && !wp.remote;
    ctx.save(); ctx.translate(0, cy + R + 96); popIn((t - 0.25) / 0.35, () => retroText(mine ? 'YOU WIN!' : 'WINNER!', cx, 0, 84, title)); ctx.restore();
    ctx.save(); ctx.translate(0, cy + R + 160); popIn((t - 0.42) / 0.35, () => retroText(wp.name.toUpperCase(), cx, 0, 44, [wp.color, wp.color, wp.dark], PAL.ink)); ctx.restore();
  } else { ctx.save(); ctx.translate(0, cy + R + 96); popIn((t - 0.1) / 0.35, () => retroText('DRAW!', cx, 0, 84, title)); ctx.restore(); }
  drawPlaces();
  drawConfetti(t);
}

// The winner's entrance, one of four (picked from the tower's seed, so every computer shows the same one):
//   0 dance    — pops up, then hops to a beat, leaning side to side, spinning every fourth beat
//   1 spin-up  — rises from below spinning like a coin, settles facing you with a burst of sparkles, floats
//   2 bounce   — drops in and keeps bouncing, squashing as it lands, a ring rippling out from its feet
//   3 crowning — pops up, a golden crown floats down onto its head with sparkles, then a happy wiggle
const WIN_STYLES = 4;
function drawWinnerCube(wp, cx, cy, t, style) {
  const P = { c: wp.color, d: wp.dark }, S = 130, blink = Math.sin(time * 1.3) > 0.97 ? -1 : 1;
  const easeBack = u => u >= 1 ? 1 : 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
  const sparkles = (x, y, r, age, n = 10) => {        // a ring of twinkling plus-shapes flying outward
    if (age < 0 || age > 0.9) return;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + 0.3, d = r + age * 120;
      ctx.globalAlpha = 1 - age / 0.9;
      drawShape(ctx, k % 2 ? 'plus' : 'dot', x + Math.cos(a) * d, y + Math.sin(a) * d, k % 2 ? 9 : 5, Object.values(SOFT)[k % 6][1], age * 4);
    }
    ctx.globalAlpha = 1;
  };
  let s = S, hop = 0, sq = 1, rot = 0, flip = 1, dy = 0, crownY = null;
  if (style === 0) {                    // dance
    s = S * Math.max(0, easeBack(t / 0.6));
    const beat = Math.max(0, t - 0.6) * 2.2, b = beat % 1, up = Math.sin(Math.PI * b), on = t > 0.6;
    hop = on ? up * 30 : 0;
    sq = on ? (up < 0.25 ? 1 - (0.25 - up) * 0.7 : 1 + (up - 0.25) * 0.12) : 1;
    rot = on ? (Math.floor(beat) % 2 ? 1 : -1) * up * 0.2 + (Math.floor(beat) % 4 === 3 ? (1 - Math.cos(Math.PI * b)) * Math.PI : 0) : 0;
  } else if (style === 1) {             // spin-up
    const u = Math.min(1, t / 1.4), e = 1 - Math.pow(1 - u, 3);
    dy = (1 - e) * 360;                                         // rises from below
    flip = Math.cos(e * Math.PI * 8);                           // spins like a coin, slowing to a stop facing you
    if (Math.abs(flip) < 0.08) flip = 0.08 * Math.sign(flip || 1);
    hop = u >= 1 ? Math.sin((t - 1.4) * 2) * 10 : 0;            // then floats
    sparkles(cx, cy, S * 0.6, t - 1.4, 12);
  } else if (style === 2) {             // bounce
    const drop = Math.min(1, t / 0.5);
    if (t < 0.5) hop = (1 - drop * drop) * 520;                 // falls in from above
    else {
      const ph = ((t - 0.5) * 1.25) % 1, up = Math.sin(Math.PI * ph);
      hop = up * 140;
      sq = ph < 0.08 || ph > 0.92 ? 0.72 : 1 + up * 0.08;      // squash on landing, stretch in the air
      const ring = ((t - 0.5) * 1.25) % 1;                      // a ring rippling out from each landing
      ctx.strokeStyle = wp.dark; ctx.lineWidth = 4 * (1 - ring); ctx.globalAlpha = 0.6 * (1 - ring);
      ctx.beginPath(); ctx.ellipse(cx, cy + S / 2 + 6, 40 + ring * 160, 10 + ring * 30, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else {                              // crowning
    s = S * Math.max(0, easeBack(t / 0.6));
    const u = clamp((t - 0.7) / 0.9, 0, 1);
    const bounceEase = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
    crownY = -420 * (1 - bounceEase(u));                        // floats down, bounces onto the head
    if (t > 1.6) rot = Math.sin((t - 1.6) * 9) * 0.1 * Math.max(0.3, Math.cos((t - 1.6) * 0.8) ** 2);   // happy wiggle
    sparkles(cx, cy - S / 2 - 20, 30, t - 1.15, 10);
  }
  const w = s / Math.sqrt(sq) * Math.abs(flip), h = s * sq;
  ctx.save();
  ctx.translate(cx, cy + s / 2 - hop + dy);                     // pivot at the cube's feet
  ctx.rotate(rot);
  if (w > 1 && h > 1) drawCubeArt(-w / 2, -h, w, h, P, flip < 0 ? { ...wp.look, f: 2 } : wp.look, 0, blink);
  if (crownY !== null) {             // the crown (above any hat it already wears)
    const k = s / PS, top = -h - (wp.look.h ? 16 * k : 0) + crownY;
    drawHat(-s / 2, top, s, 2, k, 0, P);
  }
  ctx.restore();
}

// Sounds for the reveal, on the exact moments of the animation above (called each update with the reveal
// clock before and after the step: anything that happens in between plays once)
function revealSfx(o0, o1) {
  if (mode !== 'versus') return;
  const crossed = at => o0 < at && o1 >= at;
  const ticks = (start, rate) => { const a = Math.floor((o0 - start) * rate), b = Math.floor((o1 - start) * rate); return o1 >= start && b > a ? b : -1; };
  if (crossed(WIPE_START)) sfx.swoosh();                  // the stripes sweep in
  if (crossed(REVEAL)) { sfx.fanfare(); sfx.popper(); }
  const wp = players && players.find(p => p.i === winner);
  if (wp) {
    const st = (towerSeed >>> 0) % WIN_STYLES, T = REVEAL;   // (the cube's entrance starts at REVEAL)
    if (st === 0) {
      const n = ticks(T + 0.6, 2.2);
      if (n >= 0 && n < 8) { if (n % 4 === 3) sfx.swoosh(); else sfx.bloop(n); }   // (then it dances on quietly)
    } else if (st === 1) {
      if (crossed(T)) sfx.whoosh();
      if (crossed(T + 1.4)) sfx.chime();
    } else if (st === 2) {
      if (crossed(T + 0.5)) sfx.boing();
      const n = ticks(T + 0.5, 1.25);
      if (n > 0 && n <= 6) sfx.boing();
    } else {
      if (crossed(T + 0.7)) sfx.whistle();
      if (crossed(T + 0.7 + 0.9 / 2.75)) sfx.chime();
    }
  }
  const rest = players ? players.filter(p => p.i !== winner).length : 0;
  if (crossed(REVEAL + 0.35) && rest >= 1) sfx.blip(2);                  // 2nd pops onto the podium
  if (crossed(REVEAL + 0.5) && rest >= 2) sfx.blip(0);                   // 3rd
  for (let k = 0; k < rest - 2; k++) if (crossed(REVEAL + 0.5 + k * 0.12)) sfx.blip(k);   // 4th, 5th… along the bottom
}

// The other places along the bottom, right to left: 2nd, 3rd, 4th... each cube on a pedestal (lower for
// lower places) with its place on the front and its name below. Ranked by how long each one lasted.
// Everyone but the winner, best first (whoever lasted longest)
const runnersUp = () => players.filter(p => p.i !== winner).sort((a, b) => (b.outAt || 1e9) - (a.outAt || 1e9) || b.best - a.best);

// The podium, with depth: the winner in front on the tallest block; 2nd on the left, a little back;
// 3rd on the right, further back (smaller, higher up the scene). Back ones are drawn first. Each block has a
// lighter top face, a deeper edge and a soft shadow; blocks rise up as the reveal starts, their cubes pop on.
const PODIUM = [   // place: x offset, how far back (0 front … 1 far), block height, colours
  { place: 1, dx: 0,    back: 0,    h: 92, col: SOFT.butter },
  { place: 2, dx: -185, back: 0.3,  h: 70, col: SOFT.sky },
  { place: 3, dx: 200,  back: 0.55, h: 56, col: SOFT.apricot },
];
function drawPodium(cx, cy, t) {
  const ranked = runnersUp(), feet0 = cy + 65;
  const order = [2, 1, 0];   // far to near: 3rd, 2nd, then the winner's block
  for (const i of order) {
    const P = PODIUM[i], who = i === 0 ? null : ranked[i - 1];
    if (i > 0 && !who) continue;
    const sc = 1 - P.back * 0.42, x = cx + P.dx, top = feet0 - P.back * 70;      // further back: smaller and higher
    const rise = clamp((t + 0.25 - P.back * 0.15) / 0.45, 0, 1), e = 1 - Math.pow(1 - rise, 3);
    if (e <= 0) continue;
    const bw = 170 * sc, bh = P.h * sc * e, tf = 14 * sc;                     // block width / height / top face depth
    ctx.save(); ctx.globalAlpha = Math.min(1, e * 1.5);
    // soft shadow on the ground behind it
    ctx.fillStyle = 'rgba(74,59,99,0.14)'; ctx.beginPath(); ctx.ellipse(x, top + bh + 4, bw * 0.62, 10 * sc, 0, 0, Math.PI * 2); ctx.fill();
    // the block's front, then its top face (a lighter strip, narrower at the back)
    slab(x - bw / 2, top, bw, bh, P.col[0], P.col[1], 2.5);
    ctx.fillStyle = mixHex(P.col[0], '#ffffff', 0.45); ctx.strokeStyle = P.col[1]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - bw / 2, top); ctx.lineTo(x - bw / 2 + tf, top - tf); ctx.lineTo(x + bw / 2 - tf, top - tf); ctx.lineTo(x + bw / 2, top); ctx.closePath(); ctx.fill(); ctx.stroke();
    // the place number on its front
    if (bh > 30 * sc) { OUTLINE = false; text(String(P.place), x, top + Math.min(bh * 0.62, 52 * sc), Math.round(40 * sc), P.col[1], 'center', 900); }
    ctx.restore();
    if (!who) continue;
    // 2nd / 3rd: the cube pops on once its block is up, then breathes a little
    const u = clamp((t - 0.35 - (i === 1 ? 0 : 0.15)) / 0.35, 0, 1);
    if (u <= 0) continue;
    const pop = u >= 1 ? 1 : 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
    const s = 96 * sc * pop, br = 1 + Math.sin(time * 2 + i) * 0.03;
    ctx.save(); ctx.translate(x, top - tf * 0.5); ctx.scale(1 / Math.sqrt(br), br);
    drawCubeArt(-s / 2, -s, s, s, { c: who.color, d: who.dark }, who.look, 0, Math.sin(time * 1.1 + i) > 0.97 ? -1 : 1);
    ctx.restore();
    if (u >= 1) { OUTLINE = true; text(who.name, x, top - tf * 0.5 - s - 10, Math.round(16 * sc + 4), who.dark, 'center', 900); OUTLINE = false; }
  }
}

// Everyone below the podium (4th, 5th…) along the bottom, right to left
function drawPlaces() {
  const rest = runnersUp().slice(2);
  if (!rest.length) return;
  const base = H + Math.min(OY, 40) - 8, gap = Math.min(96, (W - 2 * WALL - 80) / rest.length);
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH');
  rest.forEach((p, k) => {
    const place = k + 4, x = W - WALL - 50 - k * gap, ph = Math.max(26, 60 - k * 8), cs = 36;
    const tIn = Math.max(0, overT - REVEAL - 0.5 - k * 0.12), pop = tIn >= 0.35 ? 1 : 1 + 2.70158 * Math.pow(tIn / 0.35 - 1, 3) + 1.70158 * Math.pow(tIn / 0.35 - 1, 2);
    if (tIn <= 0) return;
    ctx.save(); ctx.translate(x, base); ctx.scale(pop, pop);
    slab(-cs * 0.8, -ph, cs * 1.6, ph, '#ffffff', PAL.normalD, 2.5);                 // pedestal
    OUTLINE = false; text(ord(place), 0, -ph + 20, 15, PAL.ink, 'center', 900);
    const P = { c: p.color, d: p.dark };
    drawCubeArt(-cs / 2, -ph - cs, cs, cs, P, p.look, 0, 1);
    ctx.restore();
    if (pop >= 1) { OUTLINE = true; text(p.name, x, base - ph - cs - 10, 12, p.dark, 'center', 900); OUTLINE = false; }
  });
}

// Confetti over the reveal: pastel strips, dots and triangles fluttering down the whole window, flipping
// as they fall and swaying side to side. Starts above the screen and keeps raining while it's shown.
function drawConfetti(t) {
  const cols = Object.values(SOFT), span = VH + 80;
  for (let k = 0; k < 90; k++) {
    const sp = 120 + hash(k, 21) * 140, raw = t * sp - hash(k, 22) * VH * 0.9;
    if (raw < 0) continue;                                         // not fallen into view yet
    const y = -OY - 40 + (raw % span);
    const x = -OX + hash(k, 23) * VW + Math.sin(t * (1.5 + hash(k, 24) * 2) + k) * 26;
    const flip = Math.cos(t * (4 + hash(k, 25) * 6) + k), col = cols[k % cols.length][k % 3 ? 0 : 1];
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (1 + hash(k, 26) * 3) + k);
    ctx.globalAlpha = 0.95;
    if (k % 5 === 0) drawShape(ctx, 'dot', 0, 0, 3.5, col);
    else if (k % 5 === 1) { ctx.scale(flip, 1); drawShape(ctx, 'tri', 0, 0, 5, col); }
    else { ctx.scale(flip, 1); ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-3.5, -7, 7, 14, 2); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Instructions overlay (the ? icon): mostly keys and pictures
function drawHelp() {
  const w = 560, h = 470, x = W / 2 - w / 2, y = 80, L = x + 44;
  ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 24); ctx.fill();
  ctx.strokeStyle = PAL.wallLine; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 23); ctx.stroke();
  text('Climb. Stay ahead of the screen.', W / 2, y + 52, 24, PAL.ink, 'center', 900);
  const p1 = COLORS[myColor], p2 = COLORS[p2Color];
  // Keys: player 1 and player 2
  const row = (yy, keys4, C, look, desc) => {
    cube(L, yy + 8, 28, { c: C.c, d: C.d }, look);
    keyCluster(keys4, L + 96, yy, 22, C.d);
    text(desc, L + 160, yy + 34, 15, PAL.inkSoft, 'left', 700);
  };
  row(y + 86, WASD, p1, myLook, 'jump · move · drop through');
  row(y + 160, ARROWS, p2, p2Look, 'player 2 · hold one to join');
  // Platforms
  let yy = y + 262;
  [['solid', PAL.normal, PAL.normalD], ['moves', PAL.move, PAL.moveD], ['tilts', PAL.tilt, PAL.tiltD], ['spring', PAL.spring, PAL.springD]].forEach(([label, c, cd], k) => {
    const px = L + k * 122;
    const sv = ctx.lineWidth; slab(px, yy - 14, 40, 12, c, cd); ctx.lineWidth = sv;
    text(label, px + 48, yy - 2, 14, PAL.inkSoft, 'left', 700);
  });
  // Three tips
  yy += 46;
  const tip = (t, draw) => { draw(L + 14, yy - 6); text(t, L + 44, yy, 15, PAL.ink, 'left', 700); yy += 38; };
  tip('On a wall, press the other way to jump off it', (cx, cy) => {
    ctx.fillStyle = PAL.wallLine; ctx.fillRect(cx - 14, cy - 12, 4, 24); ctx.fillRect(cx + 12, cy - 12, 4, 24);
    ctx.strokeStyle = PAL.good; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 8); ctx.lineTo(cx + 8, cy - 8); ctx.stroke();
  });
  tip('Press jump as you land on a spring: big boost', (cx, cy) => drawSpringI(cx - 14, cy - 14, 28, 0));
  if (GEMS_ON) tip('Gems unlock new looks in the wardrobe', (cx, cy) => drawGemIcon(cx, cy, 10));
  tip('Stand on a mode for 2 s to start', (cx, cy) => { ctx.fillStyle = PAL.good; ctx.fillRect(cx - 14, cy, 28, 8); text('2', cx, cy - 4, 14, PAL.good, 'center', 900); });
  // Other keys
  yy += 10;
  let kx = L + 14;
  for (const [k, what] of [['R', 'pause'], ['M', 'sound'], ['F', 'full screen'], ['?', 'help']]) {
    keycap(k, kx, yy - 18, 24);
    text(what, kx + 20, yy, 14, PAL.inkSoft, 'left', 700);
    ctx.font = `700 14px ${FONT}`; kx += 52 + ctx.measureText(what).width;
  }
}

// One line about the room: who we're waiting for
function roomLine() {
  const R = net.room;
  if (!R) return 'Joining the room…';
  if (R.phase === 'playing') return 'A race is on — wait here for the next one';
  const n = R.players.length, waiting = R.players.map((p, i) => ({ p, i })).filter(x => !x.p.ready);
  if (n < 2) return 'Waiting for more players to join…';
  if (!waiting.length) return 'Everyone’s ready — starting!';
  if (waiting.length <= 3) return 'Waiting for ' + waiting.map(x => x.i === R.me ? 'you' : roomName(x.p)).join(', ') + ' to get ready';
  return `${n - waiting.length}/${n} ready — the race starts when everyone is ready`;
}

function drawBanner(y) {
  if (net.bannerT <= 0) return;
  ctx.fillStyle = PAL.spike; ctx.beginPath(); ctx.roundRect(W / 2 - 230, y, 460, 36, 18); ctx.fill();
  text(net.banner, W / 2, y + 24, 16, '#ffffff', 'center', 900);
}

function drawHUD() {
  const VS = mode === 'versus';
  const inGame = state === 'count' || state === 'play' || state === 'paused' || state === 'over';
  if (inGame) {
    ctx.save(); ctx.translate(0, -OY);     // pinned to the top of the window
    if (lobbyFade > 0) ctx.globalAlpha = clamp(lobbyFade / LOBBY_FADE, 0, 1);   // fading in as the lobby fades out
    ctx.save(); OUTLINE = true;     // a soft white edge keeps the text readable over the tower
    text(height + ' m', W / 2, 70, 46, PAL.ink, 'center', 900);
    if (VS) textRows(players.map(p => ({ t: `${tag(p)} ${p.best}m`, c: p.dark, a: p.dead ? 0.3 : 1 })), 100, players.length > 5 ? 14 : 17, 14);
    if (VS) {
      text('WINS', WALL + 14, 32, 13, PAL.inkSoft, 'left', 800);
      players.forEach((p, k) => text(String(winsOf(p)), WALL + 62 + k * 20, 32, 16, p.dark, 'left', 900));
    } else {
      text('BEST ' + best + ' m', WALL + 14, 32, 15, PAL.good, 'left');
      if (GEMS_ON) { drawGemIcon(WALL + 21, 54, 8); text(String(runGems), WALL + 34, 60, 16, '#1f97ab', 'left', 900); }
    }
    if (net.status === 'playing') text('ONLINE', W - WALL - 72, 42, 12, PAL.inkSoft, 'right', 800);
    else { keycap('R', W - WALL - 100, 24, 22, PAL.inkSoft, 0.6); drawPauseIcon(W - WALL - 74, 35, 12, PAL.inkSoft); }
    OUTLINE = false; ctx.restore();   // the glow
    ctx.restore();
  }

  // Online race: you're out but still watching
  if (state === 'play' && VS && net.status === 'playing' && !players.some(p => !p.remote && !p.dead)) {
    ctx.fillStyle = 'rgba(74,59,99,0.8)'; ctx.beginPath(); ctx.roundRect(W / 2 - 170, 146 - OY, 340, 34, 17); ctx.fill();
    text('You’re out — watching the others', W / 2, 169 - OY, 16, '#ffffff', 'center', 900);
  }

  if (state === 'count') {
    const n = Math.ceil(countdown), f = countdown - Math.floor(countdown);
    ctx.globalAlpha = 0.35 + 0.65 * f;
    text(String(n), W / 2, H * 0.42, 110 + 40 * f, PAL.ink, 'center', 900);
    ctx.globalAlpha = 1;
    if (net.status === 'playing') text(onlineKeysText(), W / 2, H * 0.42 + 60, 18, localCube(0).d, 'center', 900);
  }

  if (state === 'lobby') drawLobbyHUD();    // logo and key hints (js/lobby.js)
  else if (lobbyFade > 0) {                 // ...fading away as a game starts
    const k = clamp(lobbyFade / LOBBY_FADE, 0, 1);
    ctx.globalAlpha = 1 - k; drawLobbyHUD(k); ctx.globalAlpha = 1;
  }
  if (state === 'room') drawRoomHUD();      // the online room scene (js/room.js)
  if (state === 'wardrobe') drawWardrobeHUD();

  // a soft veil over the game for menus; the game-over one fades in (a race draws its own stripes instead)
  const overFade = clamp((overT - 0.4) / 0.4, 0, 1);
  if ((state === 'lobby' && ui.help) || state === 'paused' || state === 'search' || state === 'found' || (state === 'over' && !VS && overT > 0.4)) {
    ctx.globalAlpha = state === 'over' ? overFade : 1;
    ctx.fillStyle = state === 'search' || state === 'found' ? 'rgba(255,250,248,0.92)' : 'rgba(255,250,248,0.84)';
    ctx.fillRect(-OX, -OY, VW, VH);
    ctx.globalAlpha = 1;
  }

  if (state === 'lobby' && ui.help) drawHelp();

  if (state === 'search') {
    // Still connecting / joining
    cube(W / 2 - 22, 250 - Math.abs(Math.sin(time * 5)) * 30, 44, localCube(0), localLook(0));
    text('CONNECTING' + '.'.repeat(1 + Math.floor(time * 2) % 3), W / 2, 370, 44, PAL.ink, 'center', 900);
    text('The first one can take up to a minute', W / 2, 410, 15, PAL.inkSoft, 'center', 700);
  }

  if (state === 'found') {
    const pop = 1 + Math.max(0, foundT - 1.2) * 1.2;
    // Everyone in the match: your cubes full colour, the other computer's softer
    const n = players.length, sz = n > 6 ? 40 : 56, gap = Math.min(96, 680 / n);
    players.forEach((p, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * gap;
      cube(x - sz / 2, 250 + (56 - sz), sz, { c: p.color, d: p.dark }, p.look);
      text(p.remote ? p.name : 'YOU', x, 336, n > 6 ? 11 : 15, p.remote ? PAL.inkSoft : p.dark, 'center', 900);
    });
    text(net.rematch ? 'NEW ROUND!' : 'MATCH FOUND!', W / 2, 420, 64 * pop, PAL.good, 'center', 900);
    text(onlineKeysText(), W / 2, 470, 17, localCube(0).d, 'center', 900);
  }

  if (state === 'paused') {
    text('PAUSED', W / 2, H * 0.42, 64, PAL.ink, 'center', 900);
  }

  if (state === 'over' && (VS ? overT > WIPE_START : overT > 0.4)) {
    const y0 = H * 0.3 + (1 - overFade) * 24;   // (solo: the text drifts up as it fades in)
    if (VS) {
      drawResults();
    } else {
      ctx.globalAlpha = overFade;
      text(deathMsg, W / 2, y0 - 10, 20, PAL.spike, 'center', 900);
      text(height + ' m', W / 2, y0 + 90, 96, PAL.ink, 'center', 900);
      if (newBest) text('NEW BEST!', W / 2, y0 + 140, 24, PAL.good, 'center', 900);
      else text('BEST ' + best + ' m', W / 2, y0 + 140, 18, PAL.good, 'center', 900);
      if (GEMS_ON && runGems) {
        ctx.font = `900 18px ${FONT}`; const tw = ctx.measureText('+' + runGems).width;
        drawGemIcon(W / 2 - tw / 2 - 12, y0 + 172, 9);
        text('+' + runGems, W / 2 + 6, y0 + 178, 18, '#1f97ab', 'center', 900);
      }
      ctx.globalAlpha = 1;
    }
    // Online: the next race starts once everyone in the room is ready
    if (net.status === 'playing' && overT > REVEAL + 0.6) text(roomLine(), W / 2, 694, 17, PAL.good, 'center', 900);
  }

  // Buttons for whatever screen we're on
  const bs = layoutButtons(), fb = focusable(bs);
  bs.forEach(b => drawButton(b, b === fb[ui.focus]));
  canvas.style.cursor = bs.some(b => !b.disabled && inside(b, ui.mx, ui.my)) ? 'pointer' : 'default';
}
