// RCS — How a cube looks: its colour, face, hat and body pattern (picked on the wardrobe platforms in
// the start scene). drawCubeArt draws any cube: players in the world and the small cubes on menus.
'use strict';

const FACES = ['Dots', 'Wide eyes', 'Sleepy', 'Angry', 'Happy', 'Shades', 'Wink'];
const HATS = ['No hat', 'Cap', 'Crown', 'Top hat', 'Bow', 'Headband', 'Horns', 'Antenna'];
const PATTERNS = ['Plain', 'Stripes', 'Spots', 'Checks'];
// Gems you need in total (ever picked up on this computer) to unlock each one; 0 = free from the start
const NEED = {
  f: [0, 0, 0, 5, 10, 20, 35],          // faces
  h: [0, 0, 8, 15, 25, 40, 60, 80],     // hats
  p: [0, 0, 12, 30],                    // patterns
};
const unlocked = (key, i) => !GEMS_ON || totalGems >= NEED[key][i];   // without gems, everything is open
// The next thing gems will unlock, or null
function nextUnlock() {
  const names = { f: FACES, h: HATS, p: PATTERNS };
  let best = null;
  for (const key in NEED) NEED[key].forEach((n, i) => { if (n > totalGems && (!best || n < best.need)) best = { need: n, name: names[key][i] }; });
  return best;
}
// Other players on your screen: a faded, neutral "ghost" (their face, hat and pattern still show)
const GHOST = { c: '#ddd5ea', d: '#aa9ec4' };

// A cube at (x, y), w × h (it squashes when landing). P = { c: body, d: outline }, look = { f, h, p },
// dir = which way it faces (-1, 0, 1), blink < 0 = eyes closed.
// Rounded, to match the art style (design/soft-ascent.md).
function drawCubeArt(x, y, w, h, P, look = {}, dir = 0, blink = 1) {
  const k = w / PS, b = 3 * k, r = Math.min(w, h) * 0.24;
  ctx.fillStyle = P.d; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.fillStyle = P.c; ctx.beginPath(); ctx.roundRect(x + b, y + b, w - 2 * b, h - 2 * b, Math.max(0, r - b)); ctx.fill();
  drawPattern(x + b, y + b, w - 2 * b, h - 2 * b, look.p | 0, k, Math.max(0, r - b));
  drawFace(x, y, w, h, look.f | 0, k, dir, blink < 0);
  drawHat(x, y, w, look.h | 0, k, dir, P);
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
  }
  ctx.restore();
}

function drawFace(x, y, w, h, kind, k, dir, closed) {
  const ex = x + w / 2 + dir * 5 * k, ey = y + h * 0.36, L = ex - 6 * k, R = ex + 6 * k;
  ctx.fillStyle = PAL.ink; ctx.strokeStyle = PAL.ink; ctx.lineCap = 'round';
  const dot = cx => ctx.fillRect(cx - 2 * k, closed ? ey + 3 * k : ey, 4 * k, closed ? 2 * k : 7 * k);
  const line = (x1, y1, x2, y2, lw = 2) => { ctx.lineWidth = lw * k; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  if (kind === 1 && !closed) {            // wide eyes
    for (const cx of [L, R]) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, ey + 3 * k, 4.6 * k, 0, 7); ctx.fill();
      ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.arc(cx + dir * 1.6 * k, ey + 3.5 * k, 2.2 * k, 0, 7); ctx.fill();
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
  } else { dot(L); dot(R); }              // dots (and wide eyes while blinking)
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
  } else if (kind === 7) {                // antenna
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + 3 * k, y - 12 * k); ctx.stroke();
    ctx.fillStyle = P.c; ctx.beginPath(); ctx.arc(cx + 3 * k, y - 14 * k, 3.4 * k, 0, 7); ctx.fill();
    ctx.strokeStyle = P.d; ctx.lineWidth = 1.5 * k; ctx.stroke();
  }
  ctx.restore();
}
