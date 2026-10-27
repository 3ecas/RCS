// RCS — Particles and floating text.
'use strict';

function burst(x, y, n, color, spd = 200, life = 0.5, size = 5, grav = 700) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, s = rand(0.3, 1) * spd;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life, max: life, color, size: rand(size * 0.6, size), grav });
  }
}
function dust(x, y) {
  for (let k = 0; k < 4; k++)
    particles.push({ x: x + rand(-12, 12), y, vx: rand(-60, 60), vy: rand(-40, -10), life: 0.3, max: 0.3, color: 'rgba(255,255,255,0.9)', size: rand(3, 5), grav: 150 });
}
function floatText(text, x, y, color = PAL.ink, size = 42) { texts.push({ text, x, y, t: 1.4, color, size }); }
