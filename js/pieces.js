// RCS — Set pieces: the tower's path is built from short patterns, a few rows each, picked at random
// (from the tower's seed, so online everyone gets the same):
//   scatter  — loose platforms, each within jumping reach of the last (the old way)
//   stairs   — a zigzag staircase of short steps
//   chimney  — a narrow shaft between two pillars with nothing inside: wall-jump up it
//   wall     — ledges hugging a side wall, alternating with platforms further out: wall-jump up the side
//   plaza    — a wide platform, then two routes (one with a gem), then they meet again
// Each piece places the path's platform(s) for one row; js/level.js adds the extras, hazards and gems.
'use strict';

const PIECES = {
  scatter: { rows: [3, 6], weight: 4 },
  stairs:  { rows: [5, 8], weight: 2 },
  chimney: { rows: [3, 10], weight: 1.5, minM: 20 },
  wall:    { rows: [4, 6], weight: 1.4 },
  plaza:   { rows: [3, 3], weight: 1.1, minM: 8 },
};
const SHAFT_W = 130, PILLAR_W = 22;

const plain = (x, y, w, extra = {}) => ({ id: nextPid++, x, y, w, h: 16, type: 'normal', dx: 0, t: 0, falling: false, vy: 0, bounceT: 0, ...extra });

// Pick the next piece (never the same special piece twice in a row)
function startPiece(m, L) {
  const prev = gen.piece && gen.piece.kind;
  const pc = center(gen.prev || { x: W / 2, w: 0 });
  const nearWall = pc - L < 330 || W - WALL - pc < 330;
  const opts = Object.entries(PIECES).filter(([k, p]) =>
    m >= (p.minM || 0) && (k === 'scatter' || k !== prev) && (k !== 'wall' || nearWall));
  let r = R() * opts.reduce((s, [, p]) => s + p.weight, 0), kind = 'scatter';
  for (const [k, p] of opts) { r -= p.weight; if (r <= 0) { kind = k; break; } }
  const [a, b] = PIECES[kind].rows;
  const rows = a + Math.floor(R() * (b - a + 1));
  gen.piece = { kind, rows, left: rows, k: 0 };
}

// The path's platform(s) for this row: { main, row, rowHaz, block, noFly, prev }
//   main: the path's platform; row: every platform the piece placed; block: [x0, x1] kept clear of extras;
//   noFly: no flying hazards this row; prev: what the next row must be within reach of (default main)
function pieceRow(y, m, d, L, G, allowHaz) {
  if (!gen.piece || gen.piece.left <= 0) startPiece(m, L);
  const pc = gen.piece;
  const res = PIECE_ROW[pc.kind](pc, y, m, d, L, G, allowHaz);
  pc.left--; pc.k++;
  res.row.forEach(p => platforms.push(p));
  return res;
}

const PIECE_ROW = {
  scatter(pc, y, m, d, L, G, allowHaz) {
    const w = wrand(lerp(150, 95, d), lerp(210, 135, d));
    const cx = pickCx(w, L, W - WALL, gen.prev ? [gen.prev] : [], G);
    const main = makePlatform(cx, y, w, d, L, W - WALL, allowHaz);
    return { main, row: [main], rowHaz: !!main.spikes };
  },

  stairs(pc, y, m, d, L, G, allowHaz) {
    if (pc.k === 0) {
      pc.w = wrand(100, 130); pc.step = wrand(130, 165); pc.dir = R() < 0.5 ? -1 : 1;
      pc.cx = pickCx(pc.w, L, W - WALL, gen.prev ? [gen.prev] : [], G);
    } else {
      const lo = L + pc.w / 2 + 8, hi = W - WALL - pc.w / 2 - 8;
      let cx = pc.cx + pc.dir * pc.step;
      if (cx < lo || cx > hi) { pc.dir = -pc.dir; cx = pc.cx + pc.dir * pc.step; }
      pc.cx = clamp(cx, lo, hi);
    }
    // A narrow lane: steps don't slide around, but can be springs, seesaws or have spikes
    const main = makePlatform(pc.cx, y, pc.w, d, pc.cx - pc.w / 2 - 20, pc.cx + pc.w / 2 + 20, allowHaz);
    if (pc.left === 1 && R() < 0.6) addGem(clamp(pc.cx + pc.dir * (pc.w / 2 + 70), L + 20, W - WALL - 20), y - 50);
    return { main, row: [main], rowHaz: !!main.spikes };
  },

  chimney(pc, y, m, d, L, G, allowHaz) {
    const capW = SHAFT_W + 2 * PILLAR_W + 80, whole = [L, W - WALL];   // (block: no stray extras beside it)
    if (pc.k === 0) {
      // A floor under the shaft. The pillars start a cube's height above it, so you can walk in underneath.
      const keep = capW / 2 + 40;   // keep it away from the side walls
      pc.cx = clamp(center(gen.prev || { x: W / 2, w: 0 }), L + keep, W - WALL - keep);
      const top = y - (pc.rows - 1) * ROW_GAP, bot = y - PS - 34;
      pc.pillars = [{ x: pc.cx - SHAFT_W / 2 - PILLAR_W, w: PILLAR_W, top, bot, pillar: true },
                    { x: pc.cx + SHAFT_W / 2, w: PILLAR_W, top, bot, pillar: true }];
      dividers.push(...pc.pillars);
      // a bubble column from lower down that would reach into the pillars stops just below them
      for (const b of bubbles) if (b.top < bot && b.bot > top && b.x < pc.cx + SHAFT_W / 2 + PILLAR_W + 20 && b.x + b.w > pc.cx - SHAFT_W / 2 - PILLAR_W - 20) b.top = Math.max(b.top, bot + 12);
      bubbles = bubbles.filter(b => b.bot - b.top >= 80);
      // Mostly the chimney is the only way up. Sometimes (if there's room) a second route climbs the outside:
      // a column of platforms on the roomier side, each within reach of the last, ending beside the cap.
      const roomL = pc.cx - capW / 2 - 30 - L, roomR = W - WALL - (pc.cx + capW / 2 + 30);
      const wantAlt = R() < 0.3, wantSide = R() < 0.45;
      pc.alt = wantAlt && Math.max(roomL, roomR) >= 120
        ? (roomL >= roomR ? { lo: L + 6, hi: pc.cx - capW / 2 - 30, side: -1 } : { lo: pc.cx + capW / 2 + 30, hi: W - WALL - 6, side: 1 }) : null;
      // The way out at the top: a cap over the shaft, or (sometimes) a ledge beside it — you wall-jump out of
      // the top and step across. With an outside route, the ledge is on that route's side so it leads there too.
      const [pl, pr] = pc.pillars, LEDGE = 110;
      const ledgeL = pl.x - LEDGE - L >= 10, ledgeR = W - WALL - (pr.x + pr.w + LEDGE) >= 10;
      pc.exit = 'cap';
      if (wantSide) {
        const side = pc.alt ? pc.alt.side : (ledgeL && ledgeR ? (R() < 0.5 ? -1 : 1) : ledgeL ? -1 : ledgeR ? 1 : 0);
        if (side && (side < 0 ? ledgeL : ledgeR)) pc.exit = { side, x: side < 0 ? pl.x - LEDGE : pr.x + pr.w, w: LEDGE };
      }
      const main = plain(pc.cx - capW / 2, y, capW);
      pc.altPrev = main;
      return { main, row: [main], rowHaz: false, block: whole, noFly: true };
    }
    const row = [], ex = pc.exit !== 'cap' ? pc.exit : null;
    if (pc.alt && !(ex && pc.left === 1)) {   // the outside route's step on this row (the ledge is its last step)
      const a = pc.alt, w = Math.min(wrand(90, 120), a.hi - a.lo - 4);
      const topRef = ex ? { type: 'normal', x: ex.x, w: ex.w } : { type: 'normal', x: pc.cx - capW / 2, w: capW };
      const refs = pc.left === 1 || (ex && pc.left === 2) ? [pc.altPrev, topRef] : [pc.altPrev];
      const q = makePlatform(pickCx(w, a.lo, a.hi, refs, G - 10), y, w, d, a.lo, a.hi, false);
      q.alt = true; row.push(q); pc.altPrev = q;
    }
    if (pc.left === 1 && ex) {
      // A ledge beside the top of the shaft, level with the pillars' tops
      const main = plain(ex.x, y, ex.w);
      for (const dv of pc.pillars) dv.top = y;
      return { main, row: [main], rowHaz: false, block: whole, noFly: true };
    }
    if (pc.left === 1) {
      // The cap on top of the shaft: you jump up through it (it's one-way) and climb out onto it
      const main = plain(pc.cx - capW / 2, y, capW);
      for (const dv of pc.pillars) dv.top = y + main.h;   // the pillars hold the cap up
      addGem(pc.cx, y - 50);
      return { main, row: [main, ...row], rowHaz: false, block: whole, noFly: true };
    }
    // Inside the shaft there's nothing to stand on: wall-jump between the pillars
    const main = { type: 'shaft', x: pc.cx - SHAFT_W / 2, w: SHAFT_W };
    return { main, row, rowHaz: false, block: whole, noFly: true };
  },

  wall(pc, y, m, d, L, G, allowHaz) {
    if (pc.k === 0) pc.side = center(gen.prev || { x: W / 2, w: 0 }) - L < W - WALL - center(gen.prev || { x: W / 2, w: 0 }) ? -1 : 1;
    const atWall = pc.k % 2 === 0;
    let main;
    // How far the last step reaches out from this wall (so the next one stays within jumping reach)
    const [a, b] = extent(gen.prev || { x: W / 2, w: 0 });
    const reach = pc.side < 0 ? a - L : W - WALL - b;
    if (atWall) {   // a ledge hugging the wall, long enough to reach from the last step
      const w = clamp(Math.max(wrand(80, 110), reach - G + 12), 80, 420);
      main = plain(pc.side < 0 ? L : W - WALL - w, y, w, { ledge: pc.side });
      pc.ledgeW = w;
      if (R() < 0.35) addGem(pc.side < 0 ? L + 14 : W - WALL - 14, y - 95);   // high up against the wall: wall-jump for it
    } else {        // a platform further out, within reach of the ledge
      const w = wrand(100, 130), off = Math.min(wrand(150, 200), pc.ledgeW + G - 12);
      const cx = pc.side < 0 ? L + off + w / 2 : W - WALL - off - w / 2;
      main = makePlatform(cx, y, w, d, cx - w / 2 - 20, cx + w / 2 + 20, allowHaz);
    }
    return { main, row: [main], rowHaz: !!main.spikes };
  },

  plaza(pc, y, m, d, L, G, allowHaz) {
    if (pc.k === 0) {            // the wide platform
      const w = Math.min(W - WALL - L - 40, wrand(420, 560));
      pc.cx = pickCx(w, L, W - WALL, gen.prev ? [gen.prev] : [], G);
      let main = makePlatform(pc.cx, y, w, d, pc.cx - w / 2, pc.cx + w / 2, allowHaz);
      if (main.type !== 'normal') main = plain(pc.cx - w / 2, y, w);   // always the full wide platform (spikes allowed)
      return { main, row: [main], rowHaz: !!main.spikes };
    }
    if (pc.k === 1) {            // two routes; one has a gem
      const a = plain(pc.cx - 160 - 55, y, 110), b = plain(pc.cx + 160 - 55, y, 110);
      const g = R() < 0.5 ? a : b;
      addGem(g.x + g.w / 2, y - 60);
      return { main: a, row: [a, b], rowHaz: false, noFly: true, block: [a.x - 40, b.x + b.w + 40],
               prev: { type: 'normal', x: a.x, w: b.x + b.w - a.x } };
    }
    const main = plain(pc.cx - 70, y, 140); // they meet again
    return { main, row: [main], rowHaz: false };
  },
};

// A gem to pick up (in the world, between rows)
function addGem(x, y) {
  const t = R() * 6;   // drawn first, so the tower is the same on every computer whether or not the gem is kept
  if (!GEMS_ON) return;
  if (dividers.some(dv => y > dv.top - GEM_R && y < dv.bot + GEM_R && x > dv.x - GEM_R - 6 && x < dv.x + dv.w + GEM_R + 6)) return;
  gems.push({ x, y, t });
}
// Gems that ended up tucked under (or inside) a platform of a newer row are taken away (they're still
// above the screen, so nobody sees it happen)
function clearGems(row) {
  for (const p of row) {
    const [a, b] = extent(p), y0 = p.type === 'tilt' ? p.py - p.w / 2 * Math.sin(TILT.max) : p.y;
    const y1 = p.type === 'tilt' ? p.py + 40 : p.y + p.h + 14;
    gems = gems.filter(g => !(g.x > a - GEM_R - 6 && g.x < b + GEM_R + 6 && g.y > y0 - GEM_R - 6 && g.y < y1 + GEM_R));
  }
}

// Gems away from the path: above the far end of an extra platform, out in the gap beside the path,
// or on a shuriken's track (risky)
function placeGems(y, row, main, blade) {
  if (blade && R() < 0.35) { addGem(wrand(blade.lo + 10, blade.hi - 10), blade.y); return; }
  if (R() >= 0.13) return;
  const extra = row.find(p => p !== main && p.type === 'normal');
  if (extra) { addGem(extra.x + (R() < 0.5 ? 14 : extra.w - 14), y - 40); return; }
  const side = R() < 0.5 ? -1 : 1, mc = center(main);
  addGem(clamp(mc + side * (main.w / 2 + 85), WALL + 20, W - WALL - 20), y - 80);
}
