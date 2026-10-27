// RCS — Menus and buttons: main menu (Solo / Multiplayer), help, the online room, stop and end screens.
'use strict';

function startGame() { reset(); state = 'count'; countdown = 3; sfx.beep(440); }
function toMenu() { reset(); state = 'title'; ui.focus = 0; ui.help = false; }

// Top-right corner icons: instructions (?) on the menus, and sound on/off everywhere
const ICON = 44;
function cornerIcons() {
  const y = 14, x = W - WALL - 14 - ICON;
  const icons = [{ id: 'mute', label: '', icon: 'sound', x, y, w: ICON, h: ICON, nofocus: true }];
  if (state === 'title') icons.unshift({ id: 'help', label: '?', x: x - ICON - 10, y, w: ICON, h: ICON, nofocus: true });
  return icons;
}

// The buttons on the current screen
function layoutButtons() {
  const B = (id, label, sub, x, y, w, h, extra = {}) => ({ id, label, sub, x, y, w, h, ...extra });
  const cx = W / 2;
  if (state === 'title' && ui.help) return [B('help-close', 'GOT IT', '', cx - 100, 776, 200, 56, { color: PAL.good })];
  const icons = cornerIcons();
  if (state === 'title') {
    return [...icons,   // main menu
      // colour picker arrows (mouse, or ← → keys); not part of the up/down button focus
      B('col-prev', '◀', '', cx - 132, 84, 56, 56, { nofocus: true, color: COLORS[myColor].d }),
      B('col-next', '▶', '', cx + 76, 84, 56, 56, { nofocus: true, color: COLORS[myColor].d }),
      B('solo', 'SOLO', 'Climb alone — how high can you go?', cx - 210, 350, 420, 96, { color: PAL.good }),
      B('multi', 'MULTIPLAYER', 'Race up to 10 players online', cx - 210, 466, 420, 96, { color: PAL.spike }),
    ];
  }
  if (state === 'search') {
    // The room: get ready (or not), or leave
    if (!net.room) return [...icons, B('cancel', 'CANCEL', '', cx - 100, 600, 200, 56)];
    const ready = iAmReady();
    return [...icons,
      B('ready', ready ? 'READY ✓' : 'READY', '', cx - 260, 650, 250, 64, { color: PAL.good, selected: ready }),
      B('cancel', 'LEAVE', '', cx + 10, 650, 250, 64),
    ];
  }
  if (state === 'paused') return [...icons,
    B('resume', 'RESUME', '', cx - 310, H * 0.5, 200, 60, { color: PAL.good }),
    B('restart', 'START OVER', '', cx - 100, H * 0.5, 200, 60, { color: PAL.spike }),
    B('menu', 'MENU', '', cx + 110, H * 0.5, 200, 60),
  ];
  if (state === 'over' && overT > 0.8) {
    // Online: get ready for the next race, or leave the room
    if (net.status === 'playing') {
      const ready = iAmReady();
      return [...icons,
        B('ready', ready ? 'READY ✓' : 'READY', '', cx - 260, 712, 250, 60, { color: PAL.good, selected: ready }),
        B('menu', 'LEAVE', '', cx + 10, 712, 250, 60),
      ];
    }
    return [...icons,
      B('again', 'PLAY AGAIN', '', cx - 260, H * 0.3 + 250, 250, 64, { color: PAL.good }),
      B('menu', 'MENU', '', cx + 10, H * 0.3 + 250, 250, 64),
    ];
  }
  return icons;    // in game: just the sound icon
}
const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
// Buttons that keyboard focus moves between (icons and colour arrows are mouse / shortcut keys only)
const focusable = bs => bs.filter(b => !b.nofocus);

function menuInput() {
  const bs = layoutButtons();
  const click = ui.click; ui.click = null;
  if (state === 'title' && pressed.Slash) { ui.help = !ui.help; ui.focus = 0; return; }   // ? key
  const fb = focusable(bs), n = fb.length, prev = ui.focus;
  if (ui.focus >= n) ui.focus = 0;
  // On the main menu ← → (or A D) change your colour; elsewhere they move between buttons like ↑ ↓
  const colorKeys = state === 'title' && !ui.help && ui.page === 'main';
  if (colorKeys && (pressed.ArrowLeft || pressed.KeyA)) changeColor(-1);
  if (colorKeys && (pressed.ArrowRight || pressed.KeyD)) changeColor(1);
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
  if (click) act = bs.find(b => inside(b, click.x, click.y)) || (ui.help ? { id: 'help-close' } : null);
  if (act && !act.disabled) { sfx.beep(760); activate(act.id); }
}

// During play only the sound icon can be clicked
function gameClicks() {
  const click = ui.click; ui.click = null;
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) toggleMute();
}

function changeColor(step) {
  myColor = (myColor + step + COLORS.length) % COLORS.length;
  saveColor();
  reset();            // refresh the cubes standing behind the menu
  sfx.beep(700);
}

function goPage(page, focus = 0) { ui.page = page; ui.focus = focus; }

function activate(id) {
  switch (id) {
    case 'multi': mode = 'versus'; startSearch(); break;       // online is always a race: last one standing wins
    case 'solo': mode = 'solo'; startGame(); break;
    case 'col-prev': changeColor(-1); break;
    case 'col-next': changeColor(1); break;
    case 'help': ui.help = true; ui.focus = 0; break;
    case 'help-close': ui.help = false; ui.focus = 0; break;
    case 'mute': toggleMute(); break;
    case 'cancel': leaveOnline(); break;
    case 'ready': toggleReady(); break;
    case 'resume': state = pausedFrom; break;
    case 'restart': startGame(); break;
    case 'menu': if (net.status === 'playing') leaveOnline(); else toMenu(); break;
    case 'again': startGame(); break;
  }
}

// ESC: go back one step
function escAction() {
  if (state === 'title') { if (ui.help) ui.help = false; }
  else if (state === 'search') activate('cancel');
  else if (state === 'over' && overT > 0.8) activate('menu');
}
