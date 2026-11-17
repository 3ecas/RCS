// RCS — Particles and floating text. Particles are the style's little shapes (dots, triangles, rings,
// plus marks, squares), each spinning a little as it flies and fades.
'use strict';

const SHAPES = ['dot', 'tri', 'ring', 'plus', 'sq'];
const pick = a => a[Math.floor(Math.random() * a.length)];
function burst(x, y, n, color, spd = 200, life = 0.5, size = 5, grav = 700) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * spd;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life, max: life, color, size: rand(size * 0.8, size * 1.3), grav,
                     kind: pick(SHAPES), rot: rand(0, 6), vr: rand(-8, 8) });
  }
}
// The colour of the air here: the deeper tone of the region's platforms
const airColor = y => REGIONS[regionAt(heightM(y))].plat[1];
// A puff on jumping / landing: a few small dots and rings in the region's colour
function dust(x, y) {
  const col = airColor(y);
  for (let k = 0; k < 4; k++)
    particles.push({ x: x + rand(-12, 12), y, vx: rand(-60, 60), vy: rand(-50, -15), life: 0.38, max: 0.38, color: col, size: rand(3, 5.5), grav: 150,
                     kind: k % 2 ? 'ring' : 'dot', rot: 0, vr: 0 });
}
function floatText(text, x, y, color = PAL.ink, size = 42) { texts.push({ text, x, y, t: 1.4, color, size }); }

// Jumping: a puff of little shapes pushed down and out from under the cube (side: wall jump off a wall)
function jumpPuff(p, side = 0) {
  const col = airColor(p.y + p.h), x = side ? (side < 0 ? p.x : p.x + p.w) : p.x + p.w / 2, y = side ? p.y + p.h / 2 : p.y + p.h;
  for (let k = 0; k < 7; k++) {
    const a = side ? (side < 0 ? Math.PI : 0) + rand(-0.9, 0.9) : Math.PI / 2 + rand(-1.2, 1.2);
    const s = rand(60, 170);
    particles.push({ x: x + rand(-6, 6), y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * (side ? 1 : 0.5) + (side ? 40 : 30), life: 0.35, max: 0.35,
                     color: col, size: rand(3, 6), grav: 120, kind: pick(SHAPES), rot: rand(0, 6), vr: rand(-10, 10) });
  }
}
// Landing: shapes spraying out sideways along the floor, more and faster the harder you landed (k 0 … 1)
function landPuff(p, floorY, k) {
  const col = airColor(floorY), n = 4 + Math.round(8 * k);
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, s = rand(70, 140) + 180 * k;
    particles.push({ x: p.x + p.w / 2 + dir * rand(4, p.w / 2), y: floorY - 2, vx: dir * s, vy: -rand(30, 90) * (0.5 + k), life: 0.4, max: 0.4,
                     color: col, size: rand(3, 5.5) + 2 * k, grav: 380, kind: pick(SHAPES), rot: rand(0, 6), vr: rand(-10, 10) });
  }
}
