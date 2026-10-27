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
const tag = p => p.bot ? 'BOT' : net.status === 'playing' ? p.name.toUpperCase() : 'P' + (p.i + 1);
const localCube = k => COLORS[localColor(k)];
// Online: who plays with which keys on this computer
function onlineKeysText() {
  const mine = players.filter(p => !p.remote);
  if (mine.length <= 1) return `You are ${COLORS[localColor(0)].name.toUpperCase()} — use WASD or the arrow keys`;
  return mine.map(p => `${p.name}: ${p.slot ? 'arrow keys' : 'WASD'}`).join('   ·   ');
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
    text(b.label, b.x + b.w / 2, mid - 2, b.h > 88 ? 30 : 24, tc, 'center', 900);
    text(b.sub, b.x + b.w / 2, mid + 24, 14, b.selected ? 'rgba(255,255,255,0.92)' : PAL.inkSoft, 'center', 700);
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
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(cx - 12, cy - 5, 7, 10);                       // speaker box
  ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 3, cy - 11); ctx.lineTo(cx + 3, cy + 11); ctx.lineTo(cx - 5, cy + 5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = muted ? PAL.spike : PAL.ink; ctx.lineWidth = 2.5; ctx.beginPath();
  if (muted) { ctx.moveTo(cx + 7, cy - 6); ctx.lineTo(cx + 15, cy + 6); ctx.moveTo(cx + 15, cy - 6); ctx.lineTo(cx + 7, cy + 6); }
  else { ctx.arc(cx + 4, cy, 6, -0.9, 0.9); ctx.moveTo(cx + 9.5, cy - 9.5); ctx.arc(cx + 4, cy, 11, -0.9, 0.9); }
  ctx.stroke();
}

// End of an online race: the winner, then everyone ranked by how long they lasted
function drawResults() {
  const wp = players.find(p => p.i === winner);
  if (wp) {
    cube(W / 2 - 30, 92, 60, { c: wp.color, d: wp.dark });
    text(wp.remote ? wp.name.toUpperCase() + ' WINS!' : 'YOU WIN!', W / 2, 218, 54, wp.dark, 'center', 900);
  } else text('DRAW!', W / 2, 218, 60, PAL.ink, 'center', 900);
  // Ranking: the winner, then whoever was knocked out last, and so on
  const ranked = [...players].sort((a, b) => (b.i === winner) - (a.i === winner) || (b.outAt || 1e9) - (a.outAt || 1e9) || b.best - a.best);
  const x = W / 2 - 250, w = 500, top = 262, rh = Math.min(38, 400 / ranked.length);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, top, w, 40 + ranked.length * rh);
  text('LEADERBOARD', x + 20, top + 27, 14, PAL.inkSoft, 'left', 900);
  text('HEIGHT', x + w - 110, top + 27, 12, PAL.inkSoft, 'right', 800);
  text('WINS', x + w - 20, top + 27, 12, PAL.inkSoft, 'right', 800);
  ranked.forEach((p, k) => {
    const y = top + 40 + k * rh, mid = y + rh / 2 + 6;
    if (!p.remote) { ctx.fillStyle = 'rgba(255,214,10,0.18)'; ctx.fillRect(x, y, w, rh); }   // you
    text(String(k + 1), x + 34, mid, 18, k ? PAL.inkSoft : PAL.good, 'right', 900);
    ctx.fillStyle = p.dark; ctx.fillRect(x + 50, y + rh / 2 - 9, 18, 18);
    ctx.fillStyle = p.color; ctx.fillRect(x + 52, y + rh / 2 - 7, 14, 14);
    text(p.name + (p.remote ? '' : '  (you)'), x + 82, mid, 17, PAL.ink, 'left', 800);
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
  line('Jump up the tower and stay ahead of the screen as it scrolls up.');
  line('Falling off the bottom or touching a danger ends your run.'); yy += 10;
  head('Controls');
  line('Player 1:  W jump  ·  A D move  ·  S drop through a platform');
  line('Player 2 (co-op):  ↑ jump  ·  ← → move  ·  ↓ drop');
  line('Solo and online: WASD or the arrow keys'); yy += 10;
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
  line('Solo — climb alone.   Co-op — two players, one keyboard, same team.');
  line('Multiplayer — a random online race with up to 10 players.');
  line('Last one standing wins; if you’re out, you keep watching.'); yy += 10;
  head('Keys');
  line('R  stop (R again to start over)   ·   M  sound   ·   F  full screen');
}

// Seconds until the room's next race starts (or null)
function roomSecs() {
  const L = net.lobby;
  return L && L.startsIn != null ? Math.max(0, Math.ceil((L.startsIn - (performance.now() - L.at)) / 1000)) : null;
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
      // Name box (an HTML input placed here) and colour picker: your cube between ◀ ▶, its name, a dot per colour
      const C = COLORS[myColor];
      cube(W / 2 - 32, 80 + bob, 64, C);
      text(C.name.toUpperCase(), W / 2, 176, 17, C.d, 'center', 900);
      COLORS.forEach((k, i) => {
        ctx.fillStyle = i === myColor ? k.d : k.c;
        const s = i === myColor ? 10 : 7;
        ctx.fillRect(W / 2 - 99 + i * 22 - s / 2, 192 - s / 2, s, s);
      });
      text('RCS', W / 2, 268, 64, PAL.ink, 'center', 900);
      text('Climb the tower. Don’t fall behind.', W / 2, 300, 17, PAL.inkSoft, 'center', 600);
      if (best > 0) text('Best height: ' + best + ' m', W / 2, 610, 16, PAL.good, 'center', 800);
      drawBanner(650);
    } else if (ui.page === 'local') {
      cube(W / 2 - 60, 110 + bob, 44, localCube(0));
      cube(W / 2 + 16, 110 - bob, 44, localCube(1));
      text('LOCAL', W / 2, 228, 58, PAL.ink, 'center', 900);
      text('Play on this computer', W / 2, 262, 16, PAL.inkSoft, 'center', 700);
    }
  }

  if (state === 'title' && ui.help) drawHelp();

  if (state === 'search') {
    const nl = net.local || 1;
    for (let k = 0; k < nl; k++) cube(W / 2 - 22 - (nl - 1) * 38 + k * 76, 250 - Math.abs(Math.sin(time * 5 + k * 1.6)) * 30, 44, localCube(k));
    text('SEARCHING', W / 2, 370, 54, PAL.ink, 'center', 900);
    const dots = '.'.repeat(1 + Math.floor(time * 2) % 3);
    if (net.status === 'connecting') {
      text('Connecting to the server' + dots, W / 2, 425, 22, PAL.ink, 'center', 800);
      text('The first connection can take up to a minute while the server wakes up.', W / 2, 458, 15, PAL.inkSoft, 'center', 600);
    } else {
      const L = net.lobby, secs = roomSecs();
      if (L && L.phase === 'playing') {
        // A race is already on in the room: you're in, and play from the next round
        text(`You’re in the room — ${L.players} players`, W / 2, 425, 24, PAL.good, 'center', 900);
        text('A race is on right now. You’ll join the next round.', W / 2, 458, 15, PAL.inkSoft, 'center', 700);
      } else if (L && L.computers >= 2 && secs != null) {
        // Others are here: count down while more can still hop in
        text(`${L.players} players in the room`, W / 2, 425, 26, PAL.good, 'center', 900);
        text(`Starting in ${secs}s — more can still join (up to ${L.max})`, W / 2, 458, 15, PAL.inkSoft, 'center', 700);
      } else {
        text('Waiting for players' + dots, W / 2, 425, 22, PAL.ink, 'center', 800);
        text('The race starts as soon as someone else joins.', W / 2, 458, 15, PAL.inkSoft, 'center', 600);
      }
      // One box per player slot, filled as players join
      const filled = L ? L.players : (net.local || 1), max = L ? L.max : 10;
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < filled ? PAL.good : PAL.wallLine;
        ctx.fillRect(W / 2 - max * 13 + i * 26 + 4, 486, 18, 18);
      }
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
    text(mode === 'versus' ? 'Versus — race to the top' : 'Co-op — climb together', W / 2, 466, 20, PAL.ink, 'center', 800);
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
    // Online: the room goes again by itself
    if (net.status === 'playing') {
      const L = net.lobby, secs = roomSecs();
      const msg = L && L.phase === 'break' && secs != null ? `Next round in ${secs}s` + (L.players > players.length ? ` — ${L.players - players.length} more joining` : '')
        : L && L.phase === 'lobby' ? 'Waiting for more players to join…' : 'Next round coming up…';
      text(msg, W / 2, 694, 18, PAL.good, 'center', 900);
    }
  }

  // Buttons for whatever screen we're on
  const bs = layoutButtons(), fb = focusable(bs);
  bs.forEach(b => drawButton(b, b === fb[ui.focus]));
  canvas.style.cursor = bs.some(b => !b.disabled && inside(b, ui.mx, ui.my)) ? 'pointer' : 'default';
}
