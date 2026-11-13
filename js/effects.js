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
