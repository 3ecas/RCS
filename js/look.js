// RCS — How a cube looks: its colour, face, hat and body pattern (picked on the wardrobe platforms in
// the start scene). drawCubeArt draws any cube: players in the world and the small cubes on menus.
'use strict';

const FACES = ['Dots', 'Wide eyes', 'Sleepy', 'Angry', 'Happy', 'Shades', 'Wink', 'Hearts', 'Stars', 'Surprised', 'Blush', 'Glasses'];
const HATS = ['No hat', 'Cap', 'Crown', 'Top hat', 'Bow', 'Headband', 'Horns', 'Antenna', 'Beanie', 'Party hat', 'Halo', 'Flower', 'Cat ears', 'Propeller'];
const PATTERNS = ['Plain', 'Stripes', 'Spots', 'Checks', 'Hearts', 'Stars', 'Zigzag', 'Two-tone'];
// Faces that are worn (they fly off when a cube is knocked out, like a hat)
const WORN_FACES = [5, 11];   // shades, glasses
// Gems you need in total (ever picked up on this computer) to unlock each one; 0 = free from the start
const NEED = {
  f: [0, 0, 0, 5, 10, 20, 35, 45, 55, 0, 0, 70],                // faces
  h: [0, 0, 8, 15, 25, 40, 60, 80, 0, 30, 90, 0, 50, 100],      // hats
  p: [0, 0, 12, 30, 0, 20, 0, 40],                              // patterns
};
const unlocked = (key, i) => !GEMS_ON || totalGems >= NEED[key][i];   // without gems, everything is open
// The next thing gems will unlock, or null
function nextUnlock() {
  const names = { f: FACES, h: HATS, p: PATTERNS };
  let best = null;
  for (const key in NEED) NEED[key].forEach((n, i) => { if (n > totalGems && (!best || n < best.need)) best = { need: n, name: names[key][i] }; });
  return best;
}
// (a little heart / star shape, used by faces and patterns)
function heartPath(c, x, y, s) {   // centred on x, y, about 2s wide
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
}
function starPath(c, x, y, r) {
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

// A cube at (x, y), w × h (it squashes when landing). P = { c: body, d: outline }, look = { f, h, p },
// dir = which way it faces (-1, 0, 1), blink < 0 = eyes closed, dead = knocked out: X eyes, and no hat
// (whatever it wore flies off on its own — see knockOut in js/game.js).
// Rounded, to match the art style (design/soft-ascent.md).
function drawCubeArt(x, y, w, h, P, look = {}, dir = 0, blink = 1, dead = false) {
  const k = w / PS, b = 3 * k, r = Math.min(w, h) * 0.24;
  ctx.fillStyle = P.d; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.fillStyle = P.c; ctx.beginPath(); ctx.roundRect(x + b, y + b, w - 2 * b, h - 2 * b, Math.max(0, r - b)); ctx.fill();
  drawPattern(x + b, y + b, w - 2 * b, h - 2 * b, look.p | 0, k, Math.max(0, r - b));
  drawFace(x, y, w, h, dead ? -1 : look.f | 0, k, dir, !dead && blink < 0, faceInk(P.c));
  if (!dead) drawHat(x, y, w, look.h | 0, k, dir, P);
}

function drawPattern(x, y, w, h, kind, k, r = 0) {
  if (!kind) return;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
  if (kind === 1) {                       // stripes
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 3 * k;
    for (let s = -h; s < w; s += 8 * k) { ctx.beginPath(); ctx.moveTo(x + s, y + h); ctx.lineTo(x + s + h, y); ctx.stroke(); }
  } else if (kind === 2) {                // spots
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [u, v, r] of [[0.18, 0.78, 3], [0.82, 0.72, 2.6], [0.55, 0.9, 2], [0.86, 0.18, 2]]) {
      ctx.beginPath(); ctx.arc(x + w * u, y + h * v, r * k, 0, 7); ctx.fill();
    }
  } else if (kind === 3) {                // checks
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    const s = w / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) ctx.fillRect(x + i * s, y + j * (h / 4), s, h / 4);
  } else if (kind === 4) {                // little hearts
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath();
    for (const [u, v] of [[0.2, 0.8], [0.8, 0.75], [0.5, 0.95], [0.85, 0.2]]) heartPath(ctx, x + w * u, y + h * v, 2.6 * k);
    ctx.fill();
  } else if (kind === 5) {                // little stars
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath();
    for (const [u, v, r] of [[0.18, 0.8, 3.2], [0.8, 0.78, 2.6], [0.52, 0.95, 2.2], [0.86, 0.16, 2.4]]) starPath(ctx, x + w * u, y + h * v, r * k);
    ctx.fill();
  } else if (kind === 6) {                // zigzag bands
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.2 * k; ctx.lineJoin = 'round';
    for (const v of [0.68, 0.88]) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const px = x + w * i / 8, py = y + h * v + (i % 2 ? -2.5 : 2.5) * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
  } else if (kind === 7) {                // two-tone: a deeper lower half with a soft wave
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.beginPath(); ctx.moveTo(x, y + h * 0.62);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x + w * i / 8, y + h * 0.62 + Math.sin(i * Math.PI / 2) * 2 * k);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// The face's colour: the usual ink, or a light one on a dark cube (Navy, Charcoal) so the face still shows
function faceInk(c) {
  if (!c || c[0] !== '#') return PAL.ink;
  const n = parseInt(c.slice(1), 16), lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum < 100 ? '#fff6ee' : PAL.ink;
}
function drawFace(x, y, w, h, kind, k, dir, closed, ink = PAL.ink) {
  const ex = x + w / 2 + dir * 5 * k, ey = y + h * 0.36, L = ex - 6 * k, R = ex + 6 * k;
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round';
  const dot = cx => ctx.fillRect(cx - 2 * k, closed ? ey + 3 * k : ey, 4 * k, closed ? 2 * k : 7 * k);
  const line = (x1, y1, x2, y2, lw = 2) => { ctx.lineWidth = lw * k; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  if (kind === -1) {                      // knocked out: X X
    for (const cx of [L, R]) { line(cx - 3 * k, ey, cx + 3 * k, ey + 6 * k, 2.4); line(cx + 3 * k, ey, cx - 3 * k, ey + 6 * k, 2.4); }
  } else if (kind === 1 && !closed) {     // wide eyes
    for (const cx of [L, R]) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, ey + 3 * k, 4.6 * k, 0, 7); ctx.fill();
      ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(cx + dir * 1.6 * k, ey + 3.5 * k, 2.2 * k, 0, 7); ctx.fill();   // (pupils on white)
    }
  } else if (kind === 2) {                // sleepy
    for (const cx of [L, R]) line(cx - 3 * k, ey + 4 * k, cx + 3 * k, ey + 4 * k, 2.4);
  } else if (kind === 3) {                // angry: brows slanting in
    dot(L); dot(R);
    line(L - 3.5 * k, ey - 3.5 * k, L + 2.5 * k, ey - 1 * k);
    line(R + 3.5 * k, ey - 3.5 * k, R - 2.5 * k, ey - 1 * k);
  } else if (kind === 4) {                // happy: ^ ^
    ctx.lineWidth = 2.2 * k;
    for (const cx of [L, R]) { ctx.beginPath(); ctx.arc(cx, ey + 5 * k, 3.2 * k, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  } else if (kind === 5) {                // shades
    ctx.fillRect(L - 4.5 * k, ey, 21 * k, 2 * k);
    ctx.fillRect(L - 4.5 * k, ey, 9 * k, 6 * k); ctx.fillRect(R - 4.5 * k, ey, 9 * k, 6 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(L - 3 * k, ey + 1.2 * k, 2.5 * k, 1.5 * k); ctx.fillRect(R - 3 * k, ey + 1.2 * k, 2.5 * k, 1.5 * k);
  } else if (kind === 6) {                // wink
    dot(L); line(R - 3 * k, ey + 4 * k, R + 3 * k, ey + 3 * k, 2.4);
  } else if (kind === 7) {                // heart eyes
    ctx.fillStyle = '#d6134f'; ctx.beginPath(); heartPath(ctx, L, ey + 3.5 * k, 3.6 * k); heartPath(ctx, R, ey + 3.5 * k, 3.6 * k); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; for (const cx of [L, R]) ctx.fillRect(cx - 2 * k, ey + 1.6 * k, 1.4 * k, 1.4 * k);
  } else if (kind === 8) {                // star eyes
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = ink; ctx.lineWidth = 1.2 * k; ctx.lineJoin = 'round';
    ctx.beginPath(); starPath(ctx, L, ey + 3.5 * k, 4.4 * k); starPath(ctx, R, ey + 3.5 * k, 4.4 * k); ctx.fill(); ctx.stroke();
  } else if (kind === 9 && !closed) {     // surprised: round eyes and a little o
    ctx.lineWidth = 1.8 * k;
    for (const cx of [L, R]) { ctx.beginPath(); ctx.arc(cx, ey + 3 * k, 3.2 * k, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, ey + 3 * k, 1.2 * k, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.arc(ex, ey + 11 * k, 1.8 * k, 0, 7); ctx.stroke();
  } else if (kind === 10) {               // blush: dots and rosy cheeks
    dot(L); dot(R);
    ctx.fillStyle = 'rgba(255,90,140,0.45)';
    for (const cx of [L - 3 * k, R + 3 * k]) { ctx.beginPath(); ctx.ellipse(cx, ey + 9 * k, 3 * k, 1.8 * k, 0, 0, 7); ctx.fill(); }
  } else if (kind === 11) {               // round glasses
    dot(L); dot(R);
    ctx.lineWidth = 1.6 * k;
    for (const cx of [L, R]) { ctx.beginPath(); ctx.arc(cx, ey + 3 * k, 4.6 * k, 0, 7); ctx.stroke(); }
    line(L + 4.6 * k, ey + 2.5 * k, R - 4.6 * k, ey + 2.5 * k, 1.6);
  } else { dot(L); dot(R); }              // dots (and wide/surprised eyes while blinking)
}

function drawHat(x, y, w, kind, k, dir, P) {
  if (!kind) return;
  const cx = x + w / 2;
  ctx.save();
  if (kind === 1) {                       // cap, with the peak the way you're facing
    ctx.fillStyle = PAL.spike;
    ctx.beginPath(); ctx.arc(cx, y + 1 * k, 12 * k, Math.PI, 0); ctx.fill();
    ctx.fillRect(dir < 0 ? cx - 22 * k : cx, y - 1 * k, 22 * k, 3.5 * k);
  } else if (kind === 2) {                // crown
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.moveTo(cx - 11 * k, y + 1 * k);
    [[-11, -9], [-5.5, -3], [0, -11], [5.5, -3], [11, -9], [11, 1]].forEach(([u, v]) => ctx.lineTo(cx + u * k, y + v * k));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.spike; ctx.beginPath(); ctx.arc(cx, y - 2 * k, 1.8 * k, 0, 7); ctx.fill();
  } else if (kind === 3) {                // top hat
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(cx - 15 * k, y - 2 * k, 30 * k, 3.5 * k);
    ctx.fillRect(cx - 9 * k, y - 18 * k, 18 * k, 16 * k);
    ctx.fillStyle = PAL.spike; ctx.fillRect(cx - 9 * k, y - 6 * k, 18 * k, 3 * k);
  } else if (kind === 4) {                // bow, on one corner
    const bx = x + w * 0.78, by = y + 1 * k;
    ctx.fillStyle = '#ff6fb5';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 8 * k, by - 6 * k); ctx.lineTo(bx - 8 * k, by + 5 * k); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 8 * k, by - 6 * k); ctx.lineTo(bx + 8 * k, by + 5 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c21f72'; ctx.beginPath(); ctx.arc(bx, by, 2.4 * k, 0, 7); ctx.fill();
  } else if (kind === 5) {                // headband with tails behind
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 4 * k, w, 4 * k);
    ctx.fillStyle = PAL.spike; ctx.fillRect(x, y + 5 * k, w, 2 * k);
    const tx = dir < 0 ? x + w : x;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dir < 0 ? tx : tx - 9 * k, y + 3 * k, 9 * k, 2.5 * k); ctx.fillRect(dir < 0 ? tx : tx - 7 * k, y + 7 * k, 7 * k, 2.5 * k);
  } else if (kind === 6) {                // horns
    ctx.fillStyle = PAL.ink;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + s * 13 * k, y); ctx.lineTo(cx + s * 16 * k, y - 10 * k); ctx.lineTo(cx + s * 6 * k, y); ctx.closePath(); ctx.fill();
    }
  } else if (kind === 8) {                // beanie with a pompom
    ctx.fillStyle = '#7c9cf5'; ctx.beginPath(); ctx.arc(cx, y + 3 * k, 13 * k, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#5b78d6'; ctx.fillRect(cx - 14 * k, y - 1 * k, 28 * k, 5 * k);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, y - 11 * k, 3.6 * k, 0, 7); ctx.fill();
  } else if (kind === 9) {                // party hat: a striped cone with a pompom, a little tilted
    ctx.translate(cx, y + 1 * k); ctx.rotate(dir * 0.15 || 0.12);
    ctx.fillStyle = '#7fd3f7'; ctx.beginPath(); ctx.moveTo(-8 * k, 0); ctx.lineTo(0, -19 * k); ctx.lineTo(8 * k, 0); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#ff6fb5'; for (const v of [-5, -12]) ctx.fillRect(-9 * k, v * k, 18 * k, 3 * k); ctx.restore();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -19 * k, 2.8 * k, 0, 7); ctx.fill();
  } else if (kind === 10) {               // halo, floating above
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.6 * k;
    ctx.beginPath(); ctx.ellipse(cx, y - 8 * k + Math.sin(time * 3) * 1.2 * k, 10 * k, 3.2 * k, 0, 0, 7); ctx.stroke();
  } else if (kind === 11) {               // a flower on one corner
    const fx = x + w * 0.24, fy = y + 1 * k;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 4 * k, fy + Math.sin(a) * 4 * k, 3 * k, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(fx, fy, 2.6 * k, 0, 7); ctx.fill();
  } else if (kind === 12) {               // cat ears
    for (const s of [-1, 1]) {
      ctx.fillStyle = P.d; ctx.beginPath(); ctx.moveTo(cx + s * 13 * k, y + 2 * k); ctx.lineTo(cx + s * 12 * k, y - 10 * k); ctx.lineTo(cx + s * 3 * k, y + 2 * k); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb3cf'; ctx.beginPath(); ctx.moveTo(cx + s * 11 * k, y + 1 * k); ctx.lineTo(cx + s * 10.5 * k, y - 6 * k); ctx.lineTo(cx + s * 6 * k, y + 1 * k); ctx.closePath(); ctx.fill();
    }
  } else if (kind === 13) {               // propeller cap, the propeller spinning
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, y + 1 * k, 10 * k, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ff5a4e'; ctx.beginPath(); ctx.arc(cx, y + 1 * k, 10 * k, Math.PI * 1.33, Math.PI * 1.66); ctx.lineTo(cx, y + 1 * k); ctx.fill();
    ctx.fillStyle = PAL.ink; ctx.fillRect(cx - 0.8 * k, y - 13 * k, 1.6 * k, 5 * k);
    const sp = Math.cos(time * 18);
    ctx.fillStyle = '#62c4ff'; ctx.beginPath(); ctx.ellipse(cx, y - 13 * k, 11 * k * Math.abs(sp) + 1.5 * k, 2 * k, 0, 0, 7); ctx.fill();
  } else if (kind === 7) {                // antenna
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 3 * k, y - 12 * k); ctx.stroke();
    ctx.fillStyle = P.c; ctx.beginPath(); ctx.arc(cx + 3 * k, y - 14 * k, 3.4 * k, 0, 7); ctx.fill();
    ctx.strokeStyle = P.d; ctx.lineWidth = 1.5 * k; ctx.stroke();
  }
  ctx.restore();
}
