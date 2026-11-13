// RCS — The logo ("Soft Ascent" style, see design/soft-ascent.md): the letters R, C and S built from thick
// rounded strokes, each over a deeper offset layer like a stacked block, standing on a little platform with a
// cube perched on top and a few shapes rising around it. Plain canvas drawing, so it scales to any size.
'use strict';

// The pastel pairs [soft, deep] the art style is built from
const SOFT = {
  rose:    ['#f7a8c4', '#d97a9f'],
  apricot: ['#ffc7a1', '#e39a6c'],
  butter:  ['#ffe7a0', '#d9b85c'],
  mint:    ['#a8e6cf', '#6cbf9f'],
  sky:     ['#a8d4f5', '#6fa5d6'],
  lilac:   ['#c8b6f2', '#9a84d6'],
};

// Letter paths, drawn on a grid of unit u: x = left edge of the letter's strokes, top / bot = stroke centres.
// Each returns its width (to the next letter).
const LOGO_LETTERS = {
  R(c, x, top, bot, u) {
    const mid = top + (bot - top) * 0.52, r = (mid - top) / 2;
    c.moveTo(x, bot); c.lineTo(x, top);                                   // stem
    c.lineTo(x + 1.15 * u, top); c.arc(x + 1.15 * u, top + r, r, -Math.PI / 2, Math.PI / 2); c.lineTo(x, mid);   // bowl
    c.moveTo(x + 1.0 * u, mid); c.lineTo(x + 2.3 * u, bot);               // leg
    return 2.3 * u;
  },
  C(c, x, top, bot, u) {
    const R = (bot - top) / 2, cx = x + R;
    c.moveTo(cx + R * Math.cos(0.3 * Math.PI), top + R + R * Math.sin(0.3 * Math.PI));
    c.arc(cx, top + R, R, 0.3 * Math.PI, 1.7 * Math.PI);
    return 2 * R * 0.93;
  },
  S(c, x, top, bot, u) {
    const r = (bot - top) / 4, cx = x + r * 1.05;
    c.moveTo(cx + r * Math.cos(-0.18 * Math.PI), top + r + r * Math.sin(-0.18 * Math.PI));
    c.arc(cx, top + r, r, -0.18 * Math.PI, 0.5 * Math.PI, true);          // upper bowl, round the left
    c.arc(cx, top + 3 * r, r, -0.5 * Math.PI, 0.82 * Math.PI);            // lower bowl, round the right
    return 2 * r * 1.05;
  },
};

// Draw the logo centred on cx with its platform's top at baseY. u = size unit (the strokes are u thick).
// t = time in seconds (the shapes around it drift; pass 0 for a still image). opts.cube = the cube's colours.
function drawLogoArt(c, cx, baseY, u, t = 0, opts = {}) {
  const letters = [['R', SOFT.rose], ['C', SOFT.sky], ['S', SOFT.mint]];
  const gap = 1.25 * u, H = 4.6 * u, off = 0.32 * u;
  const bot = baseY - u / 2 - off, top = bot - H + u;                      // stroke centres (the deep layer rests on the platform)
  // Measure, then centre
  const widths = letters.map(([L]) => { c.beginPath(); return LOGO_LETTERS[L](c, 0, top, bot, u); });
  const total = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  let x = cx - total / 2;
  const base = c.globalAlpha;   // (respects a fade already in progress)
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = u;
  // The platform they stand on (a rounded bar with its deeper layer)
  const pw = total + 2.4 * u, ph = 0.62 * u, px = cx - pw / 2;
  const bar = (yy, col) => { c.fillStyle = col; c.beginPath(); c.roundRect(px, yy, pw, ph, ph / 2); c.fill(); };
  bar(baseY + off, SOFT.lilac[1]); bar(baseY, SOFT.lilac[0]);
  // Letters: the deep layer offset down-right, then the soft face
  const xs = [];
  letters.forEach(([L, [soft, deep]], k) => {
    xs.push(x);
    for (const [dx, col] of [[off, deep], [0, soft]]) {
      c.strokeStyle = col; c.beginPath();
      LOGO_LETTERS[L](c, x + dx, top + dx, bot + dx, u);
      c.stroke();
    }
    x += widths[k] + gap;
  });
  // The cube, perched on the top of the C, gently bobbing
  const cs = 1.15 * u, cubeX = xs[1] + widths[1] / 2 / 0.93 - cs / 2, bob = Math.sin(t * 2.2) * 0.06 * u;
  const cubeY = top - u / 2 - cs + bob - 0.02 * u;
  const cc = opts.cube || SOFT.apricot;
  c.fillStyle = cc[1]; c.beginPath(); c.roundRect(cubeX + off * 0.7, cubeY + off * 0.7, cs, cs, cs * 0.18); c.fill();
  c.fillStyle = cc[0]; c.beginPath(); c.roundRect(cubeX, cubeY, cs, cs, cs * 0.18); c.fill();
  c.fillStyle = '#4a3b63';
  const blink = (t % 4.2) > 4.05;
  for (const ex of [0.36, 0.64]) c.fillRect(cubeX + cs * ex - cs * 0.05, cubeY + cs * (blink ? 0.4 : 0.32), cs * 0.1, cs * (blink ? 0.04 : 0.2));
  // A few shapes rising around it
  const SH = ['dot', 'tri', 'ring', 'plus', 'sq'], cols = Object.values(SOFT);
  // (evenly spread: four lanes each side, each shape a quarter of the way up from the one below it)
  for (let k = 0; k < 16; k++) {
    const h = n => ((Math.sin(k * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
    const side = k % 2 ? 1 : -1, lane = (k >> 1) % 4;
    const ry = ((k >> 3) * 0.5 + lane * 0.27 + h(2) * 0.1 + t * 0.05) % 1;
    const yy = baseY - ry * 6.2 * u;
    const xx = cx + side * (total / 2 + 1.0 * u + lane * 0.95 * u + h(1) * 0.3 * u);
    c.globalAlpha = base * 0.8 * Math.sin(ry * Math.PI);
    drawShape(c, SH[(k + lane) % SH.length], xx, yy, (0.15 + h(4) * 0.1) * u, cols[(k + lane) % cols.length][1], t * (0.4 + h(6) * 0.6) + k);
  }
  c.globalAlpha = base;
  c.restore();
}

// One of the style's small shapes (particles, scenery): 'dot', 'tri', 'ring', 'plus', 'sq', centred on x, y
function drawShape(c, kind, x, y, r, col, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = col; c.strokeStyle = col;
  c.beginPath();
  if (kind === 'dot') { c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); }
  else if (kind === 'tri') { c.moveTo(0, -r * 1.15); c.lineTo(r, r * 0.6); c.lineTo(-r, r * 0.6); c.closePath(); c.fill(); }
  else if (kind === 'ring') { c.lineWidth = r * 0.45; c.arc(0, 0, r * 0.8, 0, Math.PI * 2); c.stroke(); }
  else if (kind === 'plus') { const a = r * 0.34; c.fillRect(-r, -a, 2 * r, 2 * a); c.fillRect(-a, -r, 2 * a, 2 * r); }
  else if (kind === 'bar') { c.roundRect(-r * 1.4, -r * 0.42, r * 2.8, r * 0.84, r * 0.42); c.fill(); }
  else { c.roundRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6, r * 0.3); c.fill(); }
  c.restore();
}
