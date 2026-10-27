// RCS — Small maths and colour helpers.
'use strict';

const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const heightM = y => (GROUND_Y - y) / PX_PER_M;
const diff = y => clamp(heightM(y) / 400, 0, 1);
const ramp = (m, start, len) => clamp((m - start) / len, 0, 1);
const hash = (i, j) => (((i * 73856093) ^ (j * 19349663)) >>> 0) % 1000 / 1000;
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mixHex = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };

// A softer, greyer version of a colour. Other players' cubes are drawn like this,
// so your own cube always stands out — even if someone online picked the same colour.
function soften(hexColor, amt = 0.6) {
  const [r, g, b] = hex(hexColor);
  const grey = 0.3 * r + 0.59 * g + 0.11 * b;
  const f = v => Math.round(lerp(lerp(v, grey, amt), 235, 0.25));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
