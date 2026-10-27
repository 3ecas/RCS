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
