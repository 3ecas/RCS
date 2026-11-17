// RCS — Water columns (water region): helpers, not hazards — a column of rising bubbles from a row up to three
// rows higher that pushes you up. Placed from the platforms: rising through the path (at a platform, a little
// to one side), never close to another column that overlaps it, never through a pillar.
'use strict';

function addBubbles(p) {
  const x = clamp(center(p) + wrand(-40, 40), WALL + BUBBLE_W, W - WALL - BUBBLE_W), y = p.y, top = y - 3 * ROW_GAP - 40;
  const clear = !bubbles.some(b => b.top < y + 10 + ROW_GAP && b.bot > top - ROW_GAP && Math.abs(b.x + b.w / 2 - x) < 300) &&
                !dividers.some(dv => dv.top < y + 10 && dv.bot > top && dv.x < x + BUBBLE_W / 2 + 20 && dv.x + dv.w > x - BUBBLE_W / 2 - 20);
  if (clear) bubbles.push({ x: x - BUBBLE_W / 2, w: BUBBLE_W, top, bot: y + 10, seed: (R() * 1000) | 0 });
}
function updateBubbles() { bubbles = bubbles.filter(b => !offScreen(0, b.top, 0)); }
// Bubble column: a pale blue stream with bubbles rising through it
function drawBubbles(b) {
  if (b.bot < camY - OY - 20 || b.top > camY + H + OY + 20) return;
  const [soft, deep] = SOFT.sky, h = b.bot - b.top, cx = b.x + b.w / 2;
  // the column: a soft rounded sky shape with a light edge (round at the top, open into the vent below)
  ctx.globalAlpha = 0.4; ctx.fillStyle = soft;
  ctx.beginPath(); ctx.roundRect(b.x, b.top, b.w, h, [b.w / 2, b.w / 2, 6, 6]); ctx.fill();
  ctx.globalAlpha = 0.45; ctx.strokeStyle = soft; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(b.x + 1, b.top + 1, b.w - 2, h - 2, [b.w / 2, b.w / 2, 6, 6]); ctx.stroke();
  // chevrons drifting up the middle: this way!
  ctx.globalAlpha = 0.5; ctx.strokeStyle = deep; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let k = 0; k < 4; k++) {
    const y = b.bot - 20 - ((time * 70 + k * h / 4) % (h - 40));
    ctx.beginPath(); ctx.moveTo(cx - 7, y + 4); ctx.lineTo(cx, y - 3); ctx.lineTo(cx + 7, y + 4); ctx.stroke();
  }
  // bubbles: rings and dots rising and swaying, bigger as they go up
  for (let k = 0; k < 9; k++) {
    const sp = 80 + hash(b.seed, k) * 70, f = ((time * sp + hash(b.seed + k, 7) * h) % h) / h;
    const y = b.bot - f * h, x = cx + Math.sin(time * 3 + k) * (b.w / 2 - 12) * hash(k, 3);
    const r = (2.5 + hash(k, b.seed) * 3.5) * (0.7 + f * 0.6);
    ctx.globalAlpha = 0.85 * Math.min(1, (1 - f) * 4);
    drawShape(ctx, k % 3 ? 'ring' : 'dot', x, y, r, k % 3 ? '#ffffff' : deep);
  }
  ctx.globalAlpha = 1;
  // the vent it rises from
  slab(b.x + 4, b.bot - 4, b.w - 8, 8, soft, deep);
}
