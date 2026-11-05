// RCS — Buttons: the stop (pause) menu, the online room and the end screens, plus the corner icons.
// The start menu itself is a playable scene (js/lobby.js).
'use strict';

// Start a new run of the current mode straight away (stop menu → START OVER, PLAY AGAIN)
function startGame() { reset(); beginPlay(); }
// Back to the lobby (the start scene); player 2 stays if they joined
function toMenu() { reset(); state = 'lobby'; ui.focus = 0; ui.help = false; }

// Top-right corner icon: instructions (?) in the lobby (its sound switch is a platform there),
// sound on/off everywhere else
const ICON = 44;
function cornerIcons() {
  const y = 14 - OY, x = W + OX - 14 - ICON;   // the window's top-right corner
  if (state === 'lobby') return [{ id: 'help', label: '?', x, y, w: ICON, h: ICON, nofocus: true }];
  return [{ id: 'mute', label: '', icon: 'sound', x, y, w: ICON, h: ICON, nofocus: true }];
}

// The buttons on the current screen
function layoutButtons() {
  const B = (id, label, sub, x, y, w, h, extra = {}) => ({ id, label, sub, x, y, w, h, ...extra });
  const cx = W / 2;
  const icons = cornerIcons();
  if (state === 'lobby') return ui.help ? [B('help-close', 'GOT IT', '', cx - 100, 776, 200, 56, { color: PAL.good })] : icons;
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
// Buttons that keyboard focus moves between (corner icons are mouse / shortcut keys only)
const focusable = bs => bs.filter(b => !b.nofocus);

// Pause, room and end screens: arrows / WASD move between buttons, Enter or Space presses, or click
function menuInput() {
  const bs = layoutButtons();
  const click = ui.click; ui.click = null;
  const fb = focusable(bs), n = fb.length, prev = ui.focus;
  if (ui.focus >= n) ui.focus = 0;
  const fwd = pressed.ArrowDown || pressed.KeyS || pressed.Tab || pressed.ArrowRight || pressed.KeyD;
  const bwd = pressed.ArrowUp || pressed.KeyW || pressed.ArrowLeft || pressed.KeyA;
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
  if (click) act = bs.find(b => inside(b, click.x, click.y));
  if (act && !act.disabled) { sfx.beep(760); activate(act.id); }
}

// During play only the sound icon can be clicked
function gameClicks() {
  const click = ui.click; ui.click = null;
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) toggleMute();
}

function activate(id) {
  switch (id) {
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
  if (state === 'search') activate('cancel');
  else if (state === 'over' && overT > 0.8) activate('menu');
}
