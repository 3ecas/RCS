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
      B('solo', 'SOLO', 'Climb alone or race a bot', cx - 210, 320, 420, 96, { color: PAL.good }),
      B('split', 'SPLIT SCREEN', '2–4 players on one keyboard', cx - 210, 436, 420, 96, { color: PAL.players[1].d }),
      B('multi', 'MULTIPLAYER', 'Play online with a friend', cx - 210, 552, 420, 96, { color: PAL.spike }),
    ];
    if (ui.page === 'solo') return [
      B('solo-climb', 'CLIMB', 'How high can you go?', cx - 210, 300, 420, 96, { color: PAL.good }),
      B('solo-bot', 'RACE THE BOT', 'Fall behind and you lose', cx - 210, 416, 420, 96, { color: PAL.spike }),
      B('back', 'BACK', '', cx - 100, 560, 200, 56),
    ];
    if (ui.page === 'split') return [
      B('split-coop', 'CO-OP', 'Climb together', cx - 250, 200, 240, 84, { color: PAL.good, selected: splitMode === 'coop' }),
      B('split-versus', 'VERSUS', 'Race each other', cx + 10, 200, 240, 84, { color: PAL.spike, selected: splitMode === 'versus' }),
      ...[2, 3, 4].map((n, k) => B('n' + n, n + ' PLAYERS', '', cx - 235 + k * 160, 312, 150, 56, { color: PAL.ink, selected: splitCount === n })),
      B('split-play', 'PLAY', '', cx - 150, 616, 300, 70, { color: PAL.good }),
      B('back', 'BACK', '', cx - 100, 706, 200, 52),
    ];
    if (ui.page === 'multi') return [
      B('on-coop', 'CO-OP', 'Climb together online', cx - 210, 300, 420, 96, { color: PAL.good }),
      B('on-versus', 'VERSUS', 'Race your friend online', cx - 210, 416, 420, 96, { color: PAL.spike }),
      B('back', 'BACK', '', cx - 100, 560, 200, 56),
    ];
  }
  if (state === 'search') return [B('cancel', 'CANCEL', '', cx - 100, 600, 200, 56)];
  if (state === 'paused') return [
    B('resume', 'RESUME', '', cx - 210, H * 0.5, 200, 60, { color: PAL.good }),
    B('menu', 'MENU', '', cx + 10, H * 0.5, 200, 60),
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

function menuInput() {
  const bs = layoutButtons();
  const click = ui.click; ui.click = null;
  if (!bs.length) return;
  const n = bs.length, prev = ui.focus;
  if (ui.focus >= n) ui.focus = 0;
  if (pressed.ArrowDown || pressed.ArrowRight || pressed.KeyS || pressed.KeyD || pressed.Tab) ui.focus = (ui.focus + 1) % n;
  if (pressed.ArrowUp || pressed.ArrowLeft || pressed.KeyW || pressed.KeyA) ui.focus = (ui.focus - 1 + n) % n;
  if (ui.mouseMoved) {
    ui.mouseMoved = false;
    const i = bs.findIndex(b => inside(b, ui.mx, ui.my));
    if (i >= 0) ui.focus = i;
  }
  if (ui.focus !== prev) sfx.beep(600);
  let act = null;
  if (pressed.Enter || pressed.Space) act = bs[ui.focus];
  if (click) act = bs.find(b => inside(b, click.x, click.y)) || null;
  if (act && !act.disabled) { sfx.beep(760); activate(act.id); }
}

function goPage(page, focus = 0) { ui.page = page; ui.focus = focus; }

function activate(id) {
  switch (id) {
    case 'solo': goPage('solo'); break;
    case 'split': goPage('split', 5); break;          // focus starts on PLAY
    case 'multi': goPage('multi'); break;
    case 'back': goPage('main'); break;
    case 'solo-climb': mode = 'coop'; playerCount = 1; startGame(); break;
    case 'solo-bot': mode = 'versus'; playerCount = 1; startGame(); break;
    case 'split-coop': splitMode = 'coop'; break;
    case 'split-versus': splitMode = 'versus'; break;
    case 'n2': case 'n3': case 'n4': splitCount = Number(id[1]); break;
    case 'split-play': mode = splitMode; playerCount = splitCount; startGame(); break;
    case 'on-coop': mode = 'coop'; startSearch(); break;
    case 'on-versus': mode = 'versus'; startSearch(); break;
    case 'cancel': netSend({ t: 'cancel' }); netClose(); toMenu(); break;
    case 'resume': state = pausedFrom; break;
    case 'menu': if (net.status === 'playing') leaveOnline(); else toMenu(); break;
    case 'again':
      if (net.status !== 'playing') startGame();
      else if (!net.waitingAgain) { net.waitingAgain = true; netSend({ t: 'again' }); }
      break;
  }
}

// ESC: go back one step
function escAction() {
  if (state === 'title') { if (ui.page !== 'main') goPage('main'); }
  else if (state === 'search') activate('cancel');
  else if (state === 'paused') state = pausedFrom;
  else if (state === 'over' && overT > 0.8) activate('menu');
}
