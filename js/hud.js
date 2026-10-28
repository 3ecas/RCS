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
  return mine.map(p => p.name).join(', ');
}

function drawButton(b, focused) {
  if (b.icon || b.label === '?' || b.id === 'layout') return drawIcon(b, focused);
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
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = hover ? PAL.ink : PAL.wallLine; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (b.label === '?') { text('?', cx, cy + 9, 26, PAL.ink, 'center', 900); return; }
  if (b.id === 'layout') { text(b.label, cx, cy + 8, 24, PAL.ink, 'center', 900); return; }   // switch version
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(cx - 12, cy - 5, 7, 10);                       // speaker box
  ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 3, cy - 11); ctx.lineTo(cx + 3, cy + 11); ctx.lineTo(cx - 5, cy + 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = muted ? PAL.spike : PAL.ink; ctx.lineWidth = 2.5; ctx.beginPath();
  if (muted) { ctx.moveTo(cx + 7, cy - 6); ctx.lineTo(cx + 15, cy + 6); ctx.moveTo(cx + 15, cy - 6); ctx.lineTo(cx + 7, cy + 6); }
  else { ctx.arc(cx + 4, cy, 6, -0.9, 0.9); ctx.moveTo(cx + 9.5, cy - 9.5); ctx.arc(cx + 4, cy, 11, -0.9, 0.9); }
  ctx.stroke();
}

// One player's panel on the setup screen: name box (HTML, placed by js/name.js), cube with ◀ ▶,
// colour name, a dot per colour, and that player's keys
function drawPlayerPanel(pcx, who) {
  const two = ui.setup === 'split';
  const C = COLORS[localColor(who)], other = two ? localColor(1 - who) : -1;
  const bob = Math.sin(time * 4 + who * 1.6) * 4;
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(pcx - 150, 196, 300, 410);
  ctx.strokeStyle = C.c; ctx.lineWidth = 3; ctx.strokeRect(pcx - 148.5, 197.5, 297, 407);
  text(two ? 'PLAYER ' + (who + 1) : 'YOU', pcx, 226, 16, C.d, 'center', 900);
  cube(pcx - 48, 296 + bob, 96, C);
  text(C.name.toUpperCase(), pcx, 432, 20, C.d, 'center', 900);
  COLORS.forEach((k, i) => {
    ctx.globalAlpha = i === other ? 0.2 : 1;        // the other player's colour is taken
    const s = i === localColor(who) ? 11 : 7;
    ctx.fillStyle = s > 7 ? k.d : k.c;
    ctx.fillRect(pcx - 90 + i * 20 - s / 2, 452 - s / 2, s, s);
  });
  ctx.globalAlpha = 1;
  const change = two ? (who ? '← →  change colour' : 'A  D  change colour') : '← →  change colour';
  const keysTxt = two ? (who ? '↑ jump  ·  ← → move  ·  ↓ drop' : 'W jump  ·  A D move  ·  S drop') : 'WASD or the arrow keys to play';
  text(change, pcx, 500, 15, PAL.ink, 'center', 800);
  text(keysTxt, pcx, 530, 13, PAL.inkSoft, 'center', 700);
}

// End of an online race: the winner, then everyone ranked by how long they lasted
function drawResults() {
  const wp = players.find(p => p.i === winner);
  if (wp) {
    cube(W / 2 - 30, 92, 60, { c: wp.color, d: wp.dark });
    const mine = net.status === 'playing' && !wp.remote;   // online: you won
    text(mine ? 'YOU WIN!' : wp.name.toUpperCase() + ' WINS!', W / 2, 218, 54, wp.dark, 'center', 900);
  } else text('DRAW!', W / 2, 218, 60, PAL.ink, 'center', 900);
  // Ranking: the winner, then whoever was knocked out last, and so on
  const ranked = [...players].sort((a, b) => (b.i === winner) - (a.i === winner) || (b.outAt || 1e9) - (a.outAt || 1e9) || b.best - a.best);
  const x = W / 2 - 250, w = 500, top = 262, rh = Math.min(38, 360 / ranked.length);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, top, w, 40 + ranked.length * rh);
  text('LEADERBOARD', x + 20, top + 27, 14, PAL.inkSoft, 'left', 900);
  text(SCORE_LABEL, x + w - 110, top + 27, 12, PAL.inkSoft, 'right', 800);
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

// Instructions overlay (the ? icon)
function drawHelp() {
  const x = W / 2 - 300, y = 70, w = 600, h = 690;
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAL.wallLine; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  text('HOW TO PLAY', W / 2, y + 56, 36, PAL.ink, 'center', 900);
  const L = x + 40;
  let yy = y + 104;
  const head = t => { text(t, L, yy, 16, PAL.ink, 'left', 900); yy += 24; };
  const line = (t, c = PAL.inkSoft) => { text(t, L, yy, 15, c, 'left', 600); yy += 22; };
  head('The goal');
  line(LAYOUT === 'h' ? 'Run and jump to the right and stay ahead of the screen as it scrolls.'
    : 'Jump up the tower and stay ahead of the screen as it scrolls up.');
  line('Falling off the bottom or touching a danger ends your run.'); yy += 10;
  head('Controls');
  line('Solo & online:  W or ↑ jump  ·  A D or ← → move  ·  S or ↓ drop through');
  line('Split screen:  player 1 uses W A S D, player 2 the arrow keys'); yy += 10;
  head('Platforms');
  const items = [['solid', PAL.normal, PAL.normalD], ['moves', PAL.move, PAL.moveD], ['crumbles', PAL.crumble, PAL.crumbleD], ['spring', PAL.spring, PAL.springD]];
  items.forEach(([label, c, cd], k) => {
    const px = L + k * 130;
    ctx.fillStyle = c; ctx.fillRect(px, yy - 13, 40, 12); ctx.fillStyle = cd; ctx.fillRect(px, yy - 4, 40, 3);
    text(label, px + 48, yy - 2, 14, PAL.inkSoft, 'left', 700);
  });
  yy += 26;
  line('Springs: press jump just as you land for a huge boost.'); yy += 10;
  head('Dangers (they appear as you climb)');
  line('Spikes, spinning shurikens, flames from the walls, falling fireballs.'); yy += 10;
  head('Modes');
  line('Local — Solo, or Split screen: two players on one keyboard, co-op or race.');
  line('Multiplayer — a random online race with up to 10 players.');
  line('Last one standing wins; if you’re out, you keep watching.'); yy += 10;
  head('Keys');
  line('R  stop (R again to start over)   ·   M  sound   ·   F  full screen');
}

// One line about the room: who we're waiting for
function roomLine() {
  const R = net.room;
  if (!R) return 'Joining the room…';
  if (R.phase === 'playing') return 'A race is on — get ready for the next one';
  const n = R.players.length, waiting = R.players.map((p, i) => ({ p, i })).filter(x => !x.p.ready);
  if (n < 2) return 'Waiting for more players to join…';
  if (!waiting.length) return 'Everyone’s ready — starting!';
  if (waiting.length <= 3) return 'Waiting for ' + waiting.map(x => x.i === R.me ? 'you' : roomName(x.p)).join(', ') + ' to get ready';
  return `${n - waiting.length}/${n} ready — the race starts when everyone is ready`;
}

// The room screen: everyone in it, who's ready, who's racing
function drawRoom() {
  const R = net.room;
  text('ROOM', W / 2, 112, 54, PAL.ink, 'center', 900);
  text(roomLine(), W / 2, 152, 17, PAL.good, 'center', 900);
  if (!R) return;
  const x = W / 2 - 250, w = 500, top = 180, rh = 38;
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, top, w, 40 + R.players.length * rh);
  text(`PLAYERS  ${R.players.length}/${R.max}`, x + 20, top + 27, 14, PAL.inkSoft, 'left', 900);
  R.players.forEach((p, k) => {
    const y = top + 40 + k * rh, mid = y + rh / 2 + 6, C = COLORS[p.colors[0]];
    if (k === R.me) { ctx.fillStyle = 'rgba(255,214,10,0.18)'; ctx.fillRect(x, y, w, rh); }   // you
    ctx.fillStyle = C.d; ctx.fillRect(x + 22, y + rh / 2 - 10, 20, 20);
    ctx.fillStyle = C.c; ctx.fillRect(x + 24, y + rh / 2 - 8, 16, 16);
    text(roomName(p) + (k === R.me ? '  (you)' : ''), x + 58, mid, 17, PAL.ink, 'left', 800);
    if (p.racing) text('racing', x + w - 20, mid, 15, PAL.inkSoft, 'right', 800);
    else if (p.ready) text('✓ READY', x + w - 20, mid, 15, PAL.good, 'right', 900);
    else text('not ready', x + w - 20, mid, 15, PAL.inkSoft, 'right', 700);
  });
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
    ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8;
    text(height + ' m', W / 2, 70, 46, PAL.ink, 'center', 900);
    if (VS) textRows(players.map(p => ({ t: `${tag(p)} ${p.best}m`, c: p.dark, a: p.dead ? 0.3 : 1 })), 100, players.length > 5 ? 14 : 17, 14);
    ctx.restore();
    if (VS) {
      text('WINS', WALL + 14, 32, 13, PAL.inkSoft, 'left', 800);
      players.forEach((p, k) => text(String(winsOf(p)), WALL + 62 + k * 20, 32, 16, p.dark, 'left', 900));
    } else {
      text('BEST ' + best + ' m', WALL + 14, 32, 15, PAL.good, 'left');
    }
    text(net.status === 'playing' ? 'ONLINE' : 'R  STOP', W - WALL - 72, 42, 12, PAL.inkSoft, 'right', 800);
  }

  // Online race: you're out but still watching
  if (state === 'play' && VS && net.status === 'playing' && !players.some(p => !p.remote && !p.dead)) {
    ctx.fillStyle = 'rgba(91,75,107,0.8)'; ctx.fillRect(W / 2 - 170, 146, 340, 34);
    text('You’re out — watching the others', W / 2, 169, 16, '#ffffff', 'center', 900);
  }

  if (state === 'count') {
    const n = Math.ceil(countdown), f = countdown - Math.floor(countdown);
    ctx.globalAlpha = 0.35 + 0.65 * f;
    text(String(n), W / 2, H * 0.42, 110 + 40 * f, PAL.ink, 'center', 900);
    ctx.globalAlpha = 1;
    text(VS ? 'Race to the top!' : 'Get ready…', W / 2, H * 0.42 + 54, 22, PAL.inkSoft, 'center', 700);
    if (net.status === 'playing') {
      text(onlineKeysText(), W / 2, H * 0.42 + 92, 18, localCube(0).d, 'center', 900);
    }
  }

  if (state === 'title' || state === 'paused' || state === 'search' || state === 'found' || (state === 'over' && overT > 0.4)) {
    ctx.fillStyle = state === 'search' || state === 'found' ? 'rgba(255,250,248,0.92)' : 'rgba(255,250,248,0.84)';
    ctx.fillRect(0, 0, W, H);
  }

  if (state === 'title' && !ui.help) {
    const bob = Math.sin(time * 4) * 4;
    if (ui.page === 'main') {
      cube(W / 2 - 60, 150 + bob, 44, localCube(0));
      cube(W / 2 + 16, 150 - bob, 44, localCube(1));
      text('RCS', W / 2, 262, 72, PAL.ink, 'center', 900);
      text(LAYOUT === 'h' ? 'Run right. Don’t fall behind.' : 'Climb the tower. Don’t fall behind.', W / 2, 298, 17, PAL.inkSoft, 'center', 600);
      if (best > 0) text('Best ' + SCORE_LABEL.toLowerCase() + ': ' + best + ' m', W / 2, 600, 16, PAL.good, 'center', 800);
      drawBanner(640);
    } else if (ui.page === 'local' || ui.page === 'split') {
      cube(W / 2 - 60, 110 + bob, 44, localCube(0));
      cube(W / 2 + 16, 110 - bob, 44, localCube(1));
      text(ui.page === 'local' ? 'LOCAL' : 'SPLIT SCREEN', W / 2, 228, ui.page === 'local' ? 58 : 50, PAL.ink, 'center', 900);
      text(ui.page === 'local' ? 'Play on this computer' : 'Two players on one keyboard', W / 2, 262, 16, PAL.inkSoft, 'center', 700);
    } else if (ui.page === 'setup') {
      const title = { solo: 'SOLO', split: 'SPLIT SCREEN', multi: 'MULTIPLAYER' }[ui.setup];
      const sub = {
        solo: 'Pick your name and colour',
        split: ui.splitMode === 'race' ? 'Race — last one standing wins. Pick names and colours.' : 'Co-op — if one falls, both lose. Pick names and colours.',
        multi: 'Pick your name and colour, then join the room',
      }[ui.setup];
      text(ui.setup === 'split' ? (ui.splitMode === 'race' ? 'SPLIT SCREEN RACE' : 'SPLIT SCREEN CO-OP') : title, W / 2, 120, ui.setup === 'split' ? 40 : 48, PAL.ink, 'center', 900);
      text(sub, W / 2, 160, 16, PAL.inkSoft, 'center', 700);
      setupPanels().forEach((pcx, who) => drawPlayerPanel(pcx, who));
      if (ui.setup === 'multi') drawBanner(588);
    }
  }

  if (state === 'title' && ui.help) drawHelp();

  if (state === 'search') {
    if (net.room) drawRoom();
    else {
      // Still connecting / joining
      cube(W / 2 - 22, 250 - Math.abs(Math.sin(time * 5)) * 30, 44, localCube(0));
      text('CONNECTING', W / 2, 370, 50, PAL.ink, 'center', 900);
      const dots = '.'.repeat(1 + Math.floor(time * 2) % 3);
      text(net.status === 'connecting' ? 'Connecting to the server' + dots : 'Joining the room' + dots, W / 2, 425, 22, PAL.ink, 'center', 800);
      text('The first connection can take up to a minute while the server wakes up.', W / 2, 458, 15, PAL.inkSoft, 'center', 600);
    }
  }

  if (state === 'found') {
    const pop = 1 + Math.max(0, foundT - 1.2) * 1.2;
    // Everyone in the match: your cubes full colour, the other computer's softer
    const n = players.length, sz = n > 6 ? 40 : 56, gap = Math.min(96, 680 / n);
    players.forEach((p, k) => {
      const x = W / 2 + (k - (n - 1) / 2) * gap;
      cube(x - sz / 2, 250 + (56 - sz), sz, { c: p.color, d: p.dark });
      text(p.remote ? p.name : 'YOU', x, 336, n > 6 ? 11 : 15, p.remote ? PAL.inkSoft : p.dark, 'center', 900);
    });
    text(net.rematch ? 'NEW ROUND!' : 'MATCH FOUND!', W / 2, 420, 64 * pop, PAL.good, 'center', 900);
    text('Race — last one standing wins', W / 2, 466, 20, PAL.ink, 'center', 800);
    text(onlineKeysText(), W / 2, 500, 17, localCube(0).d, 'center', 900);
    text('Loading level' + '.'.repeat(1 + Math.floor(time * 3) % 3), W / 2, 540, 16, PAL.inkSoft, 'center', 700);
  }

  if (state === 'paused') {
    text('STOPPED', W / 2, H * 0.42, 70, PAL.ink, 'center', 900);
    text('Press R again to start over', W / 2, H * 0.42 + 44, 18, PAL.inkSoft, 'center', 700);
  }

  if (state === 'over' && overT > 0.4) {
    const y0 = H * 0.3;
    if (VS) {
      drawResults();
    } else {
      text('GAME OVER', W / 2, y0, 76, PAL.spike, 'center', 900);
      text(deathMsg, W / 2, y0 + 48, 22, PAL.ink, 'center', 700);
      text(height + ' m', W / 2, y0 + 140, 74, PAL.ink, 'center', 900);
      if (newBest) text('NEW BEST!', W / 2, y0 + 184, 26, PAL.good, 'center', 900);
      else text('Best: ' + best + ' m', W / 2, y0 + 184, 21, PAL.good, 'center', 800);
    }
    // Online: the next race starts once everyone in the room is ready
    if (net.status === 'playing') text(roomLine(), W / 2, 694, 17, PAL.good, 'center', 900);
  }

  // Buttons for whatever screen we're on
  const bs = layoutButtons(), fb = focusable(bs);
  bs.forEach(b => drawButton(b, b === fb[ui.focus]));
  canvas.style.cursor = bs.some(b => !b.disabled && inside(b, ui.mx, ui.my)) ? 'pointer' : 'default';
}
