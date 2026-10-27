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
const tag = p => p.bot ? 'BOT' : net.status === 'playing' ? p.name.toUpperCase() : 'P' + (p.i + 1);
const localCube = k => COLORS[localColor(k)];
// Online: who plays with which keys on this computer
function onlineKeysText() {
  const mine = players.filter(p => !p.remote);
  if (mine.length <= 1) return `You are ${COLORS[localColor(0)].name.toUpperCase()} — use WASD or the arrow keys`;
  return mine.map(p => `${p.name}: ${p.slot ? 'arrow keys' : 'WASD'}`).join('   ·   ');
}

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
    text((muted ? 'SOUND OFF' : 'SOUND ON') + ' (M)' + (net.status === 'playing' ? '  ·  ONLINE' : '  ·  STOP (R)'), W - WALL - 14, 32, 12, PAL.inkSoft, 'right', 700);
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

  if (state === 'title') {
    const bob = Math.sin(time * 4) * 4;
    if (ui.page === 'main') {
      // Colour picker: your cube between ◀ ▶, its name, and a dot for each of the 10 colours
      const C = COLORS[myColor];
      text('YOUR CUBE', W / 2, 62, 13, PAL.inkSoft, 'center', 800);
      cube(W / 2 - 32, 80 + bob, 64, C);
      text(C.name.toUpperCase(), W / 2, 176, 17, C.d, 'center', 900);
      COLORS.forEach((k, i) => {
        ctx.fillStyle = i === myColor ? k.d : k.c;
        const s = i === myColor ? 10 : 7;
        ctx.fillRect(W / 2 - 99 + i * 22 - s / 2, 192 - s / 2, s, s);
      });
      text('RCS', W / 2, 268, 64, PAL.ink, 'center', 900);
      text('Climb the tower. Don’t fall behind.', W / 2, 300, 17, PAL.inkSoft, 'center', 600);
      drawBanner(650);
      text('← → colour  ·  ↑ ↓ + ENTER choose  ·  M sound  ·  F full screen', W / 2, 838, 13, PAL.inkSoft, 'center', 600);
      if (best > 0) text('Best co-op height: ' + best + ' m', W / 2, 610, 16, PAL.good, 'center', 800);
    } else if (ui.page === 'solo') {
      cube(W / 2 - 23, 150 + bob, 46, localCube(0));
      text('SOLO', W / 2, 250, 58, PAL.ink, 'center', 900);
      text('Move: A D or ← →    Jump: W or ↑    Drop: S or ↓', W / 2, 680, 15, PAL.inkSoft, 'center', 700);
      if (best > 0) text('Best co-op height: ' + best + ' m', W / 2, 715, 16, PAL.good, 'center', 800);
    } else if (ui.page === 'local' || ui.page === 'coop') {
      cube(W / 2 - 60, 110 + bob, 44, localCube(0));
      cube(W / 2 + 16, 110 - bob, 44, localCube(1));
      text(ui.page === 'local' ? 'LOCAL' : 'CO-OP', W / 2, 228, 58, PAL.ink, 'center', 900);
      text(ui.page === 'local' ? 'Play on this computer' : 'Two players, one keyboard', W / 2, 262, 16, PAL.inkSoft, 'center', 700);
    } else if (ui.page === 'colors') {
      text('PICK YOUR COLOURS', W / 2, 140, 42, PAL.ink, 'center', 900);
      text(localMode === 'coop' ? 'Same team — climb together' : 'Versus — race each other', W / 2, 176, 17, PAL.inkSoft, 'center', 700);
      drawColorPanel(W / 2 - 165, 0);
      drawColorPanel(W / 2 + 165, 1);
    } else if (ui.page === 'multi') {
      for (let k = 0; k < onlineLocal; k++) cube(W / 2 - 22 - (onlineLocal - 1) * 38 + k * 76, 92 + (k ? -bob : bob), 44, localCube(k));
      text('MULTIPLAYER', W / 2, 208, 54, PAL.ink, 'center', 900);
      text('Pick a mode — you’ll be matched with the next computer that searches.', W / 2, 240, 15, PAL.inkSoft, 'center', 700);
      text('PLAYERS ON THIS COMPUTER', W / 2, 284, 13, PAL.inkSoft, 'center', 800);
      text(onlineLocal === 1 ? 'Use WASD or the arrow keys.'
        : `${localCube(0).name}: WASD   ·   ${localCube(1).name}: arrow keys`, W / 2, 716, 15, PAL.inkSoft, 'center', 700);
      text('Your cubes are full colour; other computers’ cubes look softer.', W / 2, 740, 13, PAL.inkSoft, 'center', 600);
      drawBanner(760);
    }
  }

  if (state === 'search') {
    const nl = net.local || 1;
    for (let k = 0; k < nl; k++) cube(W / 2 - 22 - (nl - 1) * 38 + k * 76, 250 - Math.abs(Math.sin(time * 5 + k * 1.6)) * 30, 44, localCube(k));
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
    // Everyone in the match: your cubes full colour, the other computer's softer
    const n = players.length;
    players.forEach((p, k) => {
      const x = W / 2 - 28 + (k - (n - 1) / 2) * 96;
      cube(x, 250, 56, { c: p.color, d: p.dark });
      text(p.remote ? p.name : (net.local === 1 ? 'YOU' : p.name + ' (you)'), x + 28, 336, 15, p.remote ? PAL.inkSoft : p.dark, 'center', 900);
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
      const wp = players.find(p => p.i === winner);
      if (wp) {
        cube(W / 2 - 23, y0 - 120, 46, { c: wp.color, d: wp.dark });
        const title = wp.name === 'You' ? 'YOU WIN!' : wp.name.toUpperCase() + ' WINS!';
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
    if (net.status === 'playing' && net.peerReady && !net.waitingAgain) text('The other computer wants to play again!', W / 2, y0 + 232, 17, PAL.good, 'center', 900);
  }

  // Buttons for whatever screen we're on
  const bs = layoutButtons(), fb = focusable(bs);
  bs.forEach(b => drawButton(b, b === fb[ui.focus]));
  canvas.style.cursor = bs.some(b => !b.disabled && inside(b, ui.mx, ui.my)) ? 'pointer' : 'default';
}

// One player's colour panel on the co-op colour screen (the ◀ ▶ buttons are drawn with the other buttons)
function drawColorPanel(cx, who) {
  const C = COLORS[who ? p2Color : myColor], other = who ? myColor : p2Color;
  const bob = Math.sin(time * 4 + who * 1.6) * 4;
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(cx - 150, 206, 300, 378);
  ctx.strokeStyle = C.c; ctx.lineWidth = 3; ctx.strokeRect(cx - 148.5, 207.5, 297, 375);
  text('PLAYER ' + (who + 1), cx, 248, 22, C.d, 'center', 900);
  cube(cx - 48, 292 + bob, 96, C);
  text(C.name.toUpperCase(), cx, 428, 20, C.d, 'center', 900);
  COLORS.forEach((k, i) => {
    ctx.globalAlpha = i === other ? 0.2 : 1;      // the other player's colour is taken
    const s = i === (who ? p2Color : myColor) ? 11 : 7;
    ctx.fillStyle = s > 7 ? k.d : k.c;
    ctx.fillRect(cx - 90 + i * 20 - s / 2, 448 - s / 2, s, s);
  });
  ctx.globalAlpha = 1;
  text(who ? '← →  change colour' : 'A  D  change colour', cx, 496, 15, PAL.ink, 'center', 800);
  text(who ? '↑ jump  ·  ← → move  ·  ↓ drop' : 'W jump  ·  A D move  ·  S drop', cx, 528, 13, PAL.inkSoft, 'center', 700);
}
