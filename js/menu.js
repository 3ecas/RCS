// RCS — Menus and buttons: Solo, Split screen, Multiplayer, pause and end screens.
'use strict';

function startGame() { reset(); state = 'count'; countdown = 3; sfx.beep(440); }
function toMenu() { reset(); state = 'title'; ui.focus = 0; }

// The buttons on the current screen
function layoutButtons() {
  const B = (id, label, sub, x, y, w, h, extra = {}) => ({ id, label, sub, x, y, w, h, ...extra });
  const cx = W / 2;
  if (state === 'title') {
    if (ui.page === 'main') return [
      // colour picker arrows (mouse, or ← → keys); not part of the up/down button focus
      B('col-prev', '◀', '', cx - 132, 84, 56, 56, { nofocus: true, color: COLORS[myColor].d }),
      B('col-next', '▶', '', cx + 76, 84, 56, 56, { nofocus: true, color: COLORS[myColor].d }),
      B('local', 'LOCAL', 'Play on this computer', cx - 210, 350, 420, 96, { color: PAL.good }),
      B('multi', 'MULTIPLAYER', 'Play online with friends', cx - 210, 466, 420, 96, { color: PAL.spike }),
    ];
    if (ui.page === 'local') return [
      B('solo', 'SOLO', 'Climb alone or race a bot', cx - 210, 300, 420, 96, { color: PAL.good }),
      B('coop', 'CO-OP', 'Two players, one keyboard', cx - 210, 416, 420, 96, { color: COLORS[7].d }),
      B('back', 'BACK', '', cx - 100, 560, 200, 56),
    ];
    if (ui.page === 'solo') return [
      B('solo-climb', 'CLIMB', 'How high can you go?', cx - 210, 300, 420, 96, { color: PAL.good }),
      B('solo-bot', 'RACE THE BOT', 'Fall behind and you lose', cx - 210, 416, 420, 96, { color: PAL.spike }),
      B('back', 'BACK', '', cx - 100, 560, 200, 56),
    ];
    if (ui.page === 'coop') return [
      B('same-team', 'SAME TEAM', 'Climb together — if one falls, both lose', cx - 210, 300, 420, 96, { color: PAL.good }),
      B('local-versus', 'VERSUS', 'Race each other — last one standing wins', cx - 210, 416, 420, 96, { color: PAL.spike }),
      B('back', 'BACK', '', cx - 100, 560, 200, 56),
    ];
    if (ui.page === 'colors') {
      // Each player's ◀ ▶ sit beside their cube (mouse, or A D / ← → keys); not part of button focus
      const c1 = cx - 165, c2 = cx + 165;
      return [
        B('c1-prev', '◀', '', c1 - 122, 314, 50, 50, { nofocus: true, color: COLORS[myColor].d }),
        B('c1-next', '▶', '', c1 + 72, 314, 50, 50, { nofocus: true, color: COLORS[myColor].d }),
        B('c2-prev', '◀', '', c2 - 122, 314, 50, 50, { nofocus: true, color: COLORS[p2Color].d }),
        B('c2-next', '▶', '', c2 + 72, 314, 50, 50, { nofocus: true, color: COLORS[p2Color].d }),
        B('colors-play', 'PLAY', '', cx - 150, 612, 300, 70, { color: PAL.good }),
        B('back', 'BACK', '', cx - 100, 704, 200, 52),
      ];
    }
    if (ui.page === 'multi') return [
      B('ol1', '1 PLAYER', '', cx - 210, 296, 200, 56, { color: PAL.ink, selected: onlineLocal === 1 }),
      B('ol2', '2 PLAYERS', '', cx + 10, 296, 200, 56, { color: PAL.ink, selected: onlineLocal === 2 }),
      B('on-coop', 'CO-OP', 'Climb together online', cx - 210, 384, 420, 96, { color: PAL.good }),
      B('on-versus', 'VERSUS', 'Race the others online', cx - 210, 500, 420, 96, { color: PAL.spike }),
      B('back', 'BACK', '', cx - 100, 628, 200, 56),
    ];
  }
  if (state === 'search') return [B('cancel', 'CANCEL', '', cx - 100, 600, 200, 56)];
  if (state === 'paused') return [
    B('resume', 'RESUME', '', cx - 310, H * 0.5, 200, 60, { color: PAL.good }),
    B('restart', 'START OVER', '', cx - 100, H * 0.5, 200, 60, { color: PAL.spike }),
    B('menu', 'MENU', '', cx + 110, H * 0.5, 200, 60),
  ];
  if (state === 'over' && overT > 0.8) {
    const on = net.status === 'playing';
    return [
      B('again', on ? (net.waitingAgain ? 'WAITING…' : 'PLAY AGAIN') : (mode === 'versus' ? 'REMATCH' : 'PLAY AGAIN'), '',
        cx - 260, H * 0.3 + 250, 250, 64, { color: PAL.good, disabled: on && net.waitingAgain }),
      B('menu', on ? 'LEAVE' : 'MENU', '', cx + 10, H * 0.3 + 250, 250, 64),
    ];
  }
  return [];
}
const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

// Buttons that keyboard focus moves between (the colour arrows are mouse / ← → only)
const focusable = bs => bs.filter(b => !b.nofocus);

function menuInput() {
  const bs = layoutButtons();
  const click = ui.click; ui.click = null;
  if (!bs.length) return;
  const fb = focusable(bs), n = fb.length, prev = ui.focus;
  if (ui.focus >= n) ui.focus = 0;
  // Colour keys: on the main menu ← → (or A D) change your colour; on the colour screen
  // player 1 uses A D and player 2 uses ← →. Elsewhere ← → move between buttons like ↑ ↓.
  const page = state === 'title' ? ui.page : '';
  const colorKeys = page === 'main' || page === 'colors';
  if (page === 'main') {
    if (pressed.ArrowLeft || pressed.KeyA) changeColor(0, -1);
    if (pressed.ArrowRight || pressed.KeyD) changeColor(0, 1);
  } else if (page === 'colors') {
    if (pressed.KeyA) changeColor(0, -1);
    if (pressed.KeyD) changeColor(0, 1);
    if (pressed.ArrowLeft) changeColor(1, -1);
    if (pressed.ArrowRight) changeColor(1, 1);
  }
  const fwd = pressed.ArrowDown || pressed.KeyS || pressed.Tab || (!colorKeys && (pressed.ArrowRight || pressed.KeyD));
  const bwd = pressed.ArrowUp || pressed.KeyW || (!colorKeys && (pressed.ArrowLeft || pressed.KeyA));
  if (n && fwd) ui.focus = (ui.focus + 1) % n;
  if (n && bwd) ui.focus = (ui.focus - 1 + n) % n;
  if (ui.mouseMoved) {
    ui.mouseMoved = false;
    const i = fb.findIndex(b => inside(b, ui.mx, ui.my));
    if (i >= 0) ui.focus = i;
  }
  if (ui.focus !== prev) sfx.beep(600);
  let act = null;
  if ((pressed.Enter || pressed.Space) && n) act = fb[ui.focus];
  if (click) act = bs.find(b => inside(b, click.x, click.y)) || null;
  if (act && !act.disabled) { sfx.beep(760); activate(act.id); }
}

// Change player 1's (who = 0) or player 2's (who = 1) colour, skipping the colour the other one has
function changeColor(who, step) {
  const other = who === 0 ? p2Color : myColor;
  let c = who === 0 ? myColor : p2Color;
  do { c = (c + step + COLORS.length) % COLORS.length; } while (c === other);
  if (who === 0) myColor = c; else p2Color = c;
  saveColor();
  reset();            // refresh the cubes standing behind the menu
  sfx.beep(700);
}

// Where BACK / Esc goes from each menu page
const PARENT = { local: 'main', solo: 'local', coop: 'local', colors: 'coop', multi: 'main' };

function goPage(page, focus = 0) { ui.page = page; ui.focus = focus; }

function activate(id) {
  switch (id) {
    case 'local': goPage('local'); break;
    case 'solo': goPage('solo'); break;
    case 'coop': goPage('coop'); break;
    case 'multi': goPage('multi', 2); break;          // focus starts on CO-OP
    case 'col-prev': changeColor(0, -1); break;
    case 'col-next': changeColor(0, 1); break;
    case 'same-team': localMode = 'coop'; goPage('colors'); break;
    case 'local-versus': localMode = 'versus'; goPage('colors'); break;
    case 'c1-prev': changeColor(0, -1); break;
    case 'c1-next': changeColor(0, 1); break;
    case 'c2-prev': changeColor(1, -1); break;
    case 'c2-next': changeColor(1, 1); break;
    case 'colors-play': mode = localMode; playerCount = 2; startGame(); break;
    case 'ol1': onlineLocal = 1; break;
    case 'ol2': onlineLocal = 2; break;
    case 'back': goPage(PARENT[ui.page] || 'main'); break;
    case 'solo-climb': mode = 'coop'; playerCount = 1; startGame(); break;
    case 'solo-bot': mode = 'versus'; playerCount = 1; startGame(); break;
    case 'on-coop': mode = 'coop'; startSearch(); break;
    case 'on-versus': mode = 'versus'; startSearch(); break;
    case 'cancel': netSend({ t: 'cancel' }); netClose(); toMenu(); break;
    case 'resume': state = pausedFrom; break;
    case 'restart': startGame(); break;
    case 'menu': if (net.status === 'playing') leaveOnline(); else toMenu(); break;
    case 'again':
      if (net.status !== 'playing') startGame();
      else if (!net.waitingAgain) { net.waitingAgain = true; netSend({ t: 'again' }); }
      break;
  }
}

// ESC: go back one step
function escAction() {
  if (state === 'title') { if (ui.page !== 'main') goPage(PARENT[ui.page] || 'main'); }
  else if (state === 'search') activate('cancel');
  else if (state === 'over' && overT > 0.8) activate('menu');
}
