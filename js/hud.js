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
const tag = p => p.bot ? 'BOT' : net.status === 'playing' ? (p.remote ? 'FRIEND' : 'YOU') : 'P' + (p.i + 1);

function drawButton(b, focused) {
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
    if (VS) textRow(players.map(p => ({ t: `${tag(p)} ${p.best}m`, c: p.dark, a: p.dead ? 0.3 : 1 })), 100, 17);
    ctx.restore();
    if (VS) {
      text('WINS', WALL + 14, 32, 13, PAL.inkSoft, 'left', 800);
      players.forEach((p, k) => text(String(wins[p.i]), WALL + 62 + k * 24, 32, 16, p.dark, 'left', 900));
    } else {
      text('BEST ' + best + ' m', WALL + 14, 32, 15, PAL.good, 'left');
    }
    text((muted ? 'SOUND OFF' : 'SOUND ON') + ' (M)' + (net.status === 'playing' ? '  ·  ONLINE' : '  ·  PAUSE (P)'), W - WALL - 14, 32, 12, PAL.inkSoft, 'right', 700);
  }

  if (state === 'count') {
    const n = Math.ceil(countdown), f = countdown - Math.floor(countdown);
    ctx.globalAlpha = 0.35 + 0.65 * f;
    text(String(n), W / 2, H * 0.42, 110 + 40 * f, PAL.ink, 'center', 900);
    ctx.globalAlpha = 1;
    text(VS ? 'Race to the top!' : 'Get ready…', W / 2, H * 0.42 + 54, 22, PAL.inkSoft, 'center', 700);
    if (net.status === 'playing') {
      text(`You are ${net.me ? 'BLUE' : 'PINK'} — use WASD or the arrow keys`, W / 2, H * 0.42 + 92, 18, PAL.players[net.me].d, 'center', 900);
    }
  }

  if (state === 'title' || state === 'paused' || state === 'search' || state === 'found' || (state === 'over' && overT > 0.4)) {
    ctx.fillStyle = state === 'search' || state === 'found' ? 'rgba(255,250,248,0.92)' : 'rgba(255,250,248,0.84)';
    ctx.fillRect(0, 0, W, H);
  }

  if (state === 'title') {
    const bob = Math.sin(time * 4) * 4;
    if (ui.page === 'main') {
      cube(W / 2 - 60, 84 + bob, 44, PAL.players[0]);
      cube(W / 2 + 16, 84 - bob, 44, PAL.players[1]);
      text('RCS', W / 2, 200, 76, PAL.ink, 'center', 900);
      text('Climb the tower. Don’t fall behind.', W / 2, 246, 19, PAL.inkSoft, 'center', 600);
      if (best > 0) text('Best co-op height: ' + best + ' m', W / 2, 700, 17, PAL.good, 'center', 800);
      drawBanner(730);
      text('Mouse or arrow keys + ENTER  ·  M sound  ·  F full screen', W / 2, 838, 13, PAL.inkSoft, 'center', 600);
    } else if (ui.page === 'solo') {
      cube(W / 2 - 23, 150 + bob, 46, PAL.players[0]);
      text('SOLO', W / 2, 250, 58, PAL.ink, 'center', 900);
      text('Move: A D or ← →    Jump: W or ↑    Drop: S or ↓', W / 2, 680, 15, PAL.inkSoft, 'center', 700);
      if (best > 0) text('Best co-op height: ' + best + ' m', W / 2, 715, 16, PAL.good, 'center', 800);
    } else if (ui.page === 'split') {
      text('SPLIT SCREEN', W / 2, 160, 50, PAL.ink, 'center', 900);
      text(splitMode === 'coop' ? 'Everyone shares the screen. If anyone falls, everyone loses.' : 'The screen follows the leader. Last one standing wins.',
        W / 2, 400, 14, PAL.inkSoft, 'center', 700);
      const cw = 165, gap = 12, total = splitCount * cw + (splitCount - 1) * gap;
      for (let i = 0; i < splitCount; i++) drawControlCard(W / 2 - total / 2 + i * (cw + gap), 420, i, false);
      text('ESC back', W / 2, 800, 13, PAL.inkSoft, 'center', 600);
    } else if (ui.page === 'multi') {
      cube(W / 2 - 60, 140 + bob, 44, PAL.players[0]);
      cube(W / 2 + 16, 140 - bob, 44, PAL.players[1]);
      text('MULTIPLAYER', W / 2, 250, 54, PAL.ink, 'center', 900);
      text('Pick a mode — you’ll be matched with the next player who searches.', W / 2, 280, 15, PAL.inkSoft, 'center', 700);
      text('One player on each computer. Use WASD or the arrow keys.', W / 2, 670, 15, PAL.inkSoft, 'center', 700);
      drawBanner(700);
    }
  }

  if (state === 'search') {
    for (let k = 0; k < 2; k++) cube(W / 2 - 60 + k * 76, 250 - Math.abs(Math.sin(time * 5 + k * 1.6)) * 30, 44, PAL.players[k]);
    text('SEARCHING', W / 2, 370, 54, PAL.ink, 'center', 900);
    const dots = '.'.repeat(1 + Math.floor(time * 2) % 3);
    if (net.status === 'connecting') {
      text('Connecting to the server' + dots, W / 2, 425, 22, PAL.ink, 'center', 800);
      text('The first connection can take up to a minute while the server wakes up.', W / 2, 458, 15, PAL.inkSoft, 'center', 600);
    } else {
      text('Looking for another player' + dots, W / 2, 425, 22, PAL.ink, 'center', 800);
      text(`You picked ${mode === 'versus' ? 'Versus' : 'Co-op'}. Waiting for someone to search too.`, W / 2, 458, 15, PAL.inkSoft, 'center', 600);
    }
  }

  if (state === 'found') {
    const pop = 1 + Math.max(0, foundT - 1.2) * 1.2;
    cube(W / 2 - 100, 260, 56, PAL.players[0]);
    cube(W / 2 + 44, 260, 56, PAL.players[1]);
    text(net.rematch ? 'NEW ROUND!' : 'MATCH FOUND!', W / 2, 400, 64 * pop, PAL.good, 'center', 900);
    text(mode === 'versus' ? 'Versus — race your friend to the top' : 'Co-op — climb together', W / 2, 450, 20, PAL.ink, 'center', 800);
    text(`You are ${net.me ? 'BLUE' : 'PINK'}`, W / 2, 490, 20, PAL.players[net.me].d, 'center', 900);
    text('Loading level' + '.'.repeat(1 + Math.floor(time * 3) % 3), W / 2, 540, 16, PAL.inkSoft, 'center', 700);
  }

  if (state === 'paused') {
    text('PAUSED', W / 2, H * 0.42, 70, PAL.ink, 'center', 900);
  }

  if (state === 'over' && overT > 0.4) {
    const y0 = H * 0.3;
    if (VS) {
      const wp = players.find(p => p.i === winner);
      if (wp) {
        cube(W / 2 - 23, y0 - 120, 46, { c: wp.color, d: wp.dark });
        const title = net.status === 'playing' ? (wp.remote ? 'YOUR FRIEND WINS!' : 'YOU WIN!') : wp.name.toUpperCase() + ' WINS!';
        text(title, W / 2, y0, 64, wp.dark, 'center', 900);
      } else text('DRAW!', W / 2, y0, 70, PAL.ink, 'center', 900);
      text(deathMsg, W / 2, y0 + 46, 22, PAL.ink, 'center', 700);
      textRow(players.map(p => ({ t: `${tag(p)} ${p.best} m`, c: p.dark })), y0 + 104, 26);
      textRow(players.map(p => ({ t: String(wins[p.i]), c: p.dark })), y0 + 186, 56, 900, 46);
    } else {
      text('GAME OVER', W / 2, y0, 76, PAL.spike, 'center', 900);
      text(deathMsg, W / 2, y0 + 48, 22, PAL.ink, 'center', 700);
      text(height + ' m', W / 2, y0 + 140, 74, PAL.ink, 'center', 900);
      if (newBest) text('NEW BEST!', W / 2, y0 + 184, 26, PAL.good, 'center', 900);
      else text('Best: ' + best + ' m', W / 2, y0 + 184, 21, PAL.good, 'center', 800);
    }
    if (net.status === 'playing' && net.peerReady && !net.waitingAgain) text('Your friend wants to play again!', W / 2, y0 + 232, 17, PAL.good, 'center', 900);
  }

  // Buttons for whatever screen we're on
  const bs = layoutButtons();
  bs.forEach((b, i) => drawButton(b, i === ui.focus));
  canvas.style.cursor = bs.some(b => !b.disabled && inside(b, ui.mx, ui.my)) ? 'pointer' : 'default';
}

function drawControlCard(x, y, i, kind) {
  const isBot = kind === true, friend = kind === 'friend', you = kind === 'you';
  const P = isBot ? PAL.bot : PAL.players[i];
  const w = 165, h = 170;
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = P.c; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  cube(x + 12, y + 12, 22, P);
  text(isBot ? 'BOT' : friend ? 'FRIEND' : you ? 'YOU' : 'PLAYER ' + (i + 1), x + w / 2 + 12, y + 30, 17, P.d, 'center', 900);
  if (isBot || friend) {
    text(isBot ? 'Computer' : 'Plays on', x + w / 2, y + 92, 17, PAL.ink, 'center', 800);
    text(isBot ? 'opponent' : 'their computer', x + w / 2, y + 114, 17, PAL.ink, 'center', 800);
    return;
  }
  const k = KEYCAPS[i];
  const key = (kx, ky, label) => {
    ctx.fillStyle = PAL.wallLine; ctx.fillRect(kx, ky + 3, 36, 36);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(kx, ky, 36, 36);
    ctx.strokeStyle = PAL.wallLine; ctx.lineWidth = 2; ctx.strokeRect(kx + 1, ky + 1, 34, 34);
    text(label, kx + 18, ky + 25, 17, PAL.ink, 'center', 900);
  };
  key(x + w / 2 - 18, y + 46, k[0]);
  key(x + w / 2 - 58, y + 88, k[1]); key(x + w / 2 - 18, y + 88, k[2]); key(x + w / 2 + 22, y + 88, k[3]);
  text(you ? 'or the arrow keys' : `${k[0]} jump · ${k[2]} drop`, x + w / 2, y + 152, 12, PAL.inkSoft, 'center', 700);
}
