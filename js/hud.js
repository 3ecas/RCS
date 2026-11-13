// RCS — Drawing the score, menus, buttons and other on-screen text.
'use strict';

// Draw a centred row of coloured text pieces (e.g. one score per player)
function textRow(items, y, size, weight = 900, gap = 18) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const widths = items.map(it => ctx.measureText(it.t).width);
  let x = W / 2 - (widths.reduce((u, v) => u + v, 0) + gap * (items.length - 1)) / 2;
  items.forEach((it, k) => {
    ctx.globalAlpha = it.a ?? 1;
    text(it.t, x, y, size, it.c, 'left', weight);
    x += widths[k] + gap;
  });
  ctx.globalAlpha = 1;
}
// Same, but wrapping to a new row every 5 items (online matches can have up to 10 players)
function textRows(items, y, size, gap = 18, rowGap = size + 8) {
  for (let k = 0; k < items.length; k += 5) textRow(items.slice(k, k + 5), y + (k / 5) * rowGap, size, 900, gap);
}
const tag = p => p.name.toUpperCase();
const localCube = k => COLORS[localColor(k)];
// Online: who plays with which keys on this computer
function onlineKeysText() {
  const mine = players.filter(p => !p.remote);
  if (mine.length <= 1) return `You are ${COLORS[localColor(0)].name.toUpperCase()} — use WASD or the arrow keys`;
  return mine.map(p => `${p.name.toUpperCase()}: ${p.slot ? 'arrow keys' : 'WASD'}`).join('   ·   ');
}

// ---- Small visual building blocks (instead of written instructions) ----

// A keyboard key: a small rounded cap with its label. a = how see-through (0…1), fill = 0…1 lights it up
function keycap(label, x, y, s = 26, color = PAL.ink, a = 1, fill = 0) {
  ctx.globalAlpha = a;
  const w = Math.max(s, label.length > 1 ? s * 0.4 * label.length + 14 : s), r = 5;
  const box = (yy, h) => { ctx.beginPath(); ctx.roundRect(x - w / 2, yy, w, h, r); };
  ctx.fillStyle = color; box(y + 3, s); ctx.fill();                       // its edge
  ctx.fillStyle = '#ffffff'; box(y, s); ctx.fill();
  if (fill > 0) { ctx.save(); box(y, s); ctx.clip(); ctx.fillStyle = color; ctx.globalAlpha = a * 0.3; ctx.fillRect(x - w / 2, y + s * (1 - fill), w, s * fill); ctx.restore(); ctx.globalAlpha = a; }
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; box(y + 0.75, s - 1.5); ctx.stroke();
  text(label, x, y + s * (label.length > 1 ? 0.66 : 0.72), Math.round(s * (label.length > 1 ? 0.46 : 0.62)), color, 'center', 900);
  ctx.globalAlpha = 1;
  return w;
}
// Four keys laid out like a keyboard's: up on top, left / down / right below. Centred on cx, top at y.
function keyCluster(keys4, cx, y, s, color, a = 1, fill = 0) {
  const [u, l, d, r] = keys4, g = s + 4;
  keycap(u, cx, y, s, color, a, fill);
  keycap(l, cx - g, y + g, s, color, a, fill); keycap(d, cx, y + g, s, color, a, fill); keycap(r, cx + g, y + g, s, color, a, fill);
}
const WASD = ['W', 'A', 'S', 'D'], ARROWS = ['↑', '←', '↓', '→'];

// A speaker (sound on), or a speaker with a cross (sound off), centred on cx, cy
function drawSpeaker(cx, cy, k = 1, color = PAL.ink) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  ctx.fillStyle = color;
  ctx.fillRect(-12, -5, 7, 10);
  ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(3, -11); ctx.lineTo(3, 11); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = muted ? PAL.spike : color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
  if (muted) { ctx.moveTo(7, -6); ctx.lineTo(15, 6); ctx.moveTo(15, -6); ctx.lineTo(7, 6); }
  else { ctx.arc(4, 0, 6, -0.9, 0.9); ctx.moveTo(4 + 11 * Math.cos(-0.9), 11 * Math.sin(-0.9)); ctx.arc(4, 0, 11, -0.9, 0.9); }
  ctx.stroke();
  ctx.restore();
}
// A clothes hanger (the wardrobe's sign)
function drawHanger(cx, cy, color = PAL.ink) {
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - 7, 3.5, Math.PI, Math.PI * 2.4);                 // the hook
  ctx.moveTo(cx, cy - 3); ctx.lineTo(cx + 14, cy + 7); ctx.lineTo(cx - 14, cy + 7); ctx.closePath();
  ctx.stroke();
}
// A pause sign (two bars)
function drawPauseIcon(cx, cy, s = 12, color = PAL.ink) {
  ctx.fillStyle = color; ctx.fillRect(cx - s * 0.45, cy - s / 2, s * 0.3, s); ctx.fillRect(cx + s * 0.15, cy - s / 2, s * 0.3, s);
}

function drawButton(b, focused) {
  if (b.icon || b.label === '?') return drawIcon(b, focused);
  const c = b.color || PAL.ink;
  const lift = focused && !b.disabled ? -3 : 0;
  ctx.globalAlpha = b.disabled ? 0.55 : 1;
  ctx.fillStyle = PAL.wallLine; ctx.fillRect(b.x, b.y + 5, b.w, b.h);              // shadow
  ctx.fillStyle = b.selected ? c : '#ffffff'; ctx.fillRect(b.x, b.y + lift, b.w, b.h);
  const lw = focused ? 4 : 2;
  ctx.strokeStyle = focused || b.selected ? c : PAL.wallLine; ctx.lineWidth = lw;
  ctx.strokeRect(b.x + lw / 2, b.y + lift + lw / 2, b.w - lw, b.h - lw);
  const tc = b.selected ? '#ffffff' : focused ? c : PAL.ink;
  const mid = b.y + lift + b.h / 2;
  if (b.sub) {
    const small = b.h < 70;   // compact two-line button
    text(b.label, b.x + b.w / 2, mid + (small ? 0 : -2), b.h > 88 ? 30 : small ? 19 : 24, tc, 'center', 900);
    text(b.sub, b.x + b.w / 2, mid + (small ? 18 : 24), small ? 12 : 14, b.selected ? 'rgba(255,255,255,0.92)' : PAL.inkSoft, 'center', 700);
  } else {
    text(b.label, b.x + b.w / 2, mid + 8, b.h > 60 ? 24 : 19, tc, 'center', 900);
  }
  ctx.globalAlpha = 1;
}

// Small square corner icon: "?" (instructions) or a speaker (sound on / off)
function drawIcon(b, focused) {
  const hover = focused || inside(b, ui.mx, ui.my);
  ctx.fillStyle = PAL.wallLine; ctx.fillRect(b.x, b.y + 4, b.w, b.h);     // solid shadow, like the buttons
  const lift = hover ? -2 : 0;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x, b.y + lift, b.w, b.h);
  ctx.strokeStyle = hover ? PAL.ink : PAL.wallLine; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1 + lift, b.w - 2, b.h - 2);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + lift;
  if (b.label === '?') { text('?', cx, cy + 9, 26, PAL.ink, 'center', 900); return; }
  drawSpeaker(cx, cy);
}

// End of an online race: the winner, then everyone ranked by how long they lasted
function drawResults() {
  const wp = players.find(p => p.i === winner);
  if (wp) {
    cube(W / 2 - 30, 92, 60, { c: wp.color, d: wp.dark }, wp.look);
    const mine = net.status === 'playing' && !wp.remote;   // online: you won
    text(mine ? 'YOU WIN!' : wp.name.toUpperCase() + ' WINS!', W / 2, 218, 54, wp.dark, 'center', 900);
  } else text('DRAW!', W / 2, 218, 60, PAL.ink, 'center', 900);
  // Ranking: the winner, then whoever was knocked out last, and so on
  const ranked = [...players].sort((a, b) => (b.i === winner) - (a.i === winner) || (b.outAt || 1e9) - (a.outAt || 1e9) || b.best - a.best);
  const x = W / 2 - 250, w = 500, top = 262, rh = Math.min(38, 360 / ranked.length);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, top, w, 40 + ranked.length * rh);
  text('LEADERBOARD', x + 20, top + 27, 14, PAL.inkSoft, 'left', 900);
  text('HEIGHT', x + w - 110, top + 27, 12, PAL.inkSoft, 'right', 800);
  text('WINS', x + w - 20, top + 27, 12, PAL.inkSoft, 'right', 800);
  ranked.forEach((p, k) => {
    const y = top + 40 + k * rh, mid = y + rh / 2 + 6;
    const you = net.status === 'playing' && !p.remote;
    if (you) { ctx.fillStyle = 'rgba(255,214,10,0.18)'; ctx.fillRect(x, y, w, rh); }
    text(String(k + 1), x + 34, mid, 18, k ? PAL.inkSoft : PAL.good, 'right', 900);
    ctx.fillStyle = p.dark; ctx.fillRect(x + 50, y + rh / 2 - 9, 18, 18);
    ctx.fillStyle = p.color; ctx.fillRect(x + 52, y + rh / 2 - 7, 14, 14);
    text(p.name + (you ? '  (you)' : ''), x + 82, mid, 17, PAL.ink, 'left', 800);
    text(p.best + ' m', x + w - 110, mid, 16, PAL.ink, 'right', 800);
    text(String(winsOf(p)), x + w - 20, mid, 16, PAL.ink, 'right', 900);
  });
}

// Instructions overlay (the ? icon): mostly keys and pictures
function drawHelp() {
  const w = 560, h = 500, x = W / 2 - w / 2, y = 80, L = x + 44;
  ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAL.wallLine; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  text('Climb. Stay ahead of the screen.', W / 2, y + 52, 24, PAL.ink, 'center', 900);
  const p1 = COLORS[myColor], p2 = COLORS[p2Color];
  // Keys: player 1 and player 2
  const row = (yy, keys4, C, look, desc) => {
    cube(L, yy + 8, 28, { c: C.c, d: C.d }, look);
    keyCluster(keys4, L + 96, yy, 22, C.d);
    text(desc, L + 160, yy + 34, 15, PAL.inkSoft, 'left', 700);
  };
  row(y + 86, WASD, p1, myLook, 'jump · move · drop through');
  row(y + 160, ARROWS, p2, p2Look, 'player 2 · hold one to join');
  // Platforms
  let yy = y + 262;
  [['solid', PAL.normal, PAL.normalD], ['moves', PAL.move, PAL.moveD], ['tilts', PAL.tilt, PAL.tiltD], ['spring', PAL.spring, PAL.springD]].forEach(([label, c, cd], k) => {
    const px = L + k * 122;
    ctx.fillStyle = c; ctx.fillRect(px, yy - 13, 40, 12); ctx.fillStyle = cd; ctx.fillRect(px, yy - 4, 40, 3);
    text(label, px + 48, yy - 2, 14, PAL.inkSoft, 'left', 700);
  });
  // Three tips
  yy += 46;
  const tip = (t, draw) => { draw(L + 14, yy - 6); text(t, L + 44, yy, 15, PAL.ink, 'left', 700); yy += 38; };
  tip('On a wall, press the other way to jump off it', (cx, cy) => {
    ctx.fillStyle = PAL.wallLine; ctx.fillRect(cx - 14, cy - 12, 4, 24); ctx.fillRect(cx + 12, cy - 12, 4, 24);
    ctx.strokeStyle = PAL.good; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 8); ctx.lineTo(cx + 8, cy - 8); ctx.stroke();
  });
  tip('Press jump as you land on a spring: big boost', (cx, cy) => drawSpringI(cx - 14, cy - 10, 28, 0));
  if (GEMS_ON) tip('Gems unlock new looks in the wardrobe', (cx, cy) => drawGemIcon(cx, cy, 10));
  tip('Stand on a mode for 2 s to start', (cx, cy) => { ctx.fillStyle = PAL.good; ctx.fillRect(cx - 14, cy, 28, 8); text('2', cx, cy - 4, 14, PAL.good, 'center', 900); });
  // Other keys
  yy += 10;
  let kx = L + 14;
  for (const [k, what] of [['R', 'pause'], ['M', 'sound'], ['F', 'full screen'], ['?', 'help']]) {
    keycap(k, kx, yy - 18, 24);
    text(what, kx + 20, yy, 14, PAL.inkSoft, 'left', 700);
    ctx.font = `700 14px ${FONT}`; kx += 52 + ctx.measureText(what).width;
  }
}

// One line about the room: who we're waiting for
function roomLine() {
  const R = net.room;
  if (!R) return 'Joining the room…';
  if (R.phase === 'playing') return 'A race is on — wait here for the next one';
  const n = R.players.length, waiting = R.players.map((p, i) => ({ p, i })).filter(x => !x.p.ready);
  if (n < 2) return 'Waiting for more players to join…';
  if (!waiting.length) return 'Everyone’s ready — starting!';
  if (waiting.length <= 3) return 'Waiting for ' + waiting.map(x => x.i === R.me ? 'you' : roomName(x.p)).join(', ') + ' to get ready';
  return `${n - waiting.length}/${n} ready — the race starts when everyone is ready`;
}

function drawBanner(y) {
  if (net.bannerT <= 0) return;
  ctx.fillStyle = PAL.spike; ctx.fillRect(W / 2 - 230, y, 460, 36);
  text(net.banner, W / 2, y + 24, 16, '#ffffff', 'center', 900);
}

function drawHUD() {
  const VS = mode === 'versus';
  const inGame = state === 'count' || state === 'play' || state === 'paused' || state === 'over';
  if (inGame) {
    ctx.save(); ctx.translate(0, -OY);     // pinned to the top of the window
    ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8;
    text(height + ' m', W / 2, 70, 46, PAL.ink, 'center', 900);
    if (VS) textRows(players.map(p => ({ t: `${tag(p)} ${p.best}m`, c: p.dark, a: p.dead ? 0.3 : 1 })), 100, players.length > 5 ? 14 : 17, 14);
    if (VS) {
      text('WINS', WALL + 14, 32, 13, PAL.inkSoft, 'left', 800);
      players.forEach((p, k) => text(String(winsOf(p)), WALL + 62 + k * 20, 32, 16, p.dark, 'left', 900));
    } else {
      text('BEST ' + best + ' m', WALL + 14, 32, 15, PAL.good, 'left');
      if (GEMS_ON) { drawGemIcon(WALL + 21, 54, 8); text(String(runGems), WALL + 34, 60, 16, '#1f97ab', 'left', 900); }
    }
    if (net.status === 'playing') text('ONLINE', W - WALL - 72, 42, 12, PAL.inkSoft, 'right', 800);
    else { keycap('R', W - WALL - 100, 24, 22, PAL.inkSoft, 0.6); drawPauseIcon(W - WALL - 74, 35, 12, PAL.inkSoft); }
    ctx.restore();   // the glow
    ctx.restore();
  }

  // Online race: you're out but still watching
  if (state === 'play' && VS && net.status === 'playing' && !players.some(p => !p.remote && !p.dead)) {
    ctx.fillStyle = 'rgba(91,75,107,0.8)'; ctx.fillRect(W / 2 - 170, 146 - OY, 340, 34);
    text('You’re out — watching the others', W / 2, 169 - OY, 16, '#ffffff', 'center', 900);
  }

  if (state === 'count') {
    const n = Math.ceil(countdown), f = countdown - Math.floor(countdown);
    ctx.globalAlpha = 0.35 + 0.65 * f;
    text(String(n), W / 2, H * 0.42, 110 + 40 * f, PAL.ink, 'center', 900);
    ctx.globalAlpha = 1;
    if (net.status === 'playing') text(onlineKeysText(), W / 2, H * 0.42 + 60, 18, localCube(0).d, 'center', 900);
  }

  if (state === 'lobby') drawLobbyHUD();    // logo and key hints (js/lobby.js)
  if (state === 'room') drawRoomHUD();      // the online room scene (js/room.js)
  if (state === 'wardrobe') drawWardrobeHUD();

  if ((state === 'lobby' && ui.help) || state === 'paused' || state === 'search' || state === 'found' || (state === 'over' && overT > 0.4)) {
    ctx.fillStyle = state === 'search' || state === 'found' ? 'rgba(255,250,248,0.92)' : 'rgba(255,250,248,0.84)';
    ctx.fillRect(-OX, -OY, VW, VH);
  }

  if (state === 'lobby' && ui.help) drawHelp();

  if (state === 'search') {
    // Still connecting / joining
    cube(W / 2 - 22, 250 - Math.abs(Math.sin(time * 5)) * 30, 44, localCube(0), localLook(0));
    text('CONNECTING' + '.'.repeat(1 + Math.floor(time * 2) % 3), W / 2, 370, 44, PAL.ink, 'center', 900);
    text('The first one can take up to a minute', W / 2, 410, 15, PAL.inkSoft, 'center', 700);
  }

  if (state === 'found') {
    const pop = 1 + Math.max(0, foundT - 1.2) * 1.2;
    // Everyone in the match: your cubes full colour, the other computer's softer
    const n = players.length, sz = n > 6 ? 40 : 56, gap = Math.min(96, 680 / n);
    players.forEach((p, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * gap;
      cube(x - sz / 2, 250 + (56 - sz), sz, { c: p.color, d: p.dark }, p.look);
      text(p.remote ? p.name : 'YOU', x, 336, n > 6 ? 11 : 15, p.remote ? PAL.inkSoft : p.dark, 'center', 900);
    });
    text(net.rematch ? 'NEW ROUND!' : 'MATCH FOUND!', W / 2, 420, 64 * pop, PAL.good, 'center', 900);
    text(onlineKeysText(), W / 2, 470, 17, localCube(0).d, 'center', 900);
  }

  if (state === 'paused') {
    text('PAUSED', W / 2, H * 0.42, 64, PAL.ink, 'center', 900);
  }

  if (state === 'over' && overT > 0.4) {
    const y0 = H * 0.3;
    if (VS) {
      drawResults();
    } else {
      text(deathMsg, W / 2, y0 - 10, 20, PAL.spike, 'center', 900);
      text(height + ' m', W / 2, y0 + 90, 96, PAL.ink, 'center', 900);
      if (newBest) text('NEW BEST!', W / 2, y0 + 140, 24, PAL.good, 'center', 900);
      else text('BEST ' + best + ' m', W / 2, y0 + 140, 18, PAL.good, 'center', 900);
      if (runGems) {
        ctx.font = `900 18px ${FONT}`; const tw = ctx.measureText('+' + runGems).width;
        drawGemIcon(W / 2 - tw / 2 - 12, y0 + 172, 9);
        text('+' + runGems, W / 2 + 6, y0 + 178, 18, '#1f97ab', 'center', 900);
      }
    }
    // Online: the next race starts once everyone in the room is ready
    if (net.status === 'playing') text(roomLine(), W / 2, 694, 17, PAL.good, 'center', 900);
  }

  // Buttons for whatever screen we're on
  const bs = layoutButtons(), fb = focusable(bs);
  bs.forEach(b => drawButton(b, b === fb[ui.focus]));
  canvas.style.cursor = bs.some(b => !b.disabled && inside(b, ui.mx, ui.my)) ? 'pointer' : 'default';
}
