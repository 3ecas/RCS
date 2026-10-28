// RCS — Menus and buttons: main menu (Local / Multiplayer), Local (Solo / Split screen), the setup screen
// (names + colours), help, the online room, stop and end screens.
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
    if (ui.page === 'local') return [...icons,
      B('solo', 'SOLO', 'Climb alone — how high can you go?', cx - 210, 320, 420, 96, { color: PAL.good }),
      B('split', 'SPLIT SCREEN', 'Two players, one keyboard, same team', cx - 210, 436, 420, 96, { color: COLORS[7].d }),
      B('back', 'BACK', '', cx - 100, 580, 200, 56),
    ];
    if (ui.page === 'setup') {
      // One panel per player: ◀ ▶ beside the cube (mouse, or keys); not part of the button focus
      const arrows = (who, pcx) => [
        B(`c${who}-prev`, '◀', '', pcx - 122, 318, 50, 50, { nofocus: true, color: COLORS[localColor(who)].d }),
        B(`c${who}-next`, '▶', '', pcx + 72, 318, 50, 50, { nofocus: true, color: COLORS[localColor(who)].d }),
      ];
      const pcs = setupPanels();
      return [...icons, ...pcs.flatMap((pcx, who) => arrows(who, pcx)),
        B('play', ui.setup === 'multi' ? 'JOIN' : 'PLAY', '', cx - 150, 630, 300, 70, { color: PAL.good }),
        B('back', 'BACK', '', cx - 100, 720, 200, 52),
      ];
    }
    return [...icons,   // main menu
      B('local', 'LOCAL', 'Solo or split screen on this computer', cx - 210, 340, 420, 96, { color: PAL.good }),
      B('multi', 'MULTIPLAYER', 'Race up to 10 players online', cx - 210, 456, 420, 96, { color: PAL.spike }),
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

// Centre x of each player panel on the setup screen (two side by side for split screen)
const setupPanels = () => ui.setup === 'split' ? [W / 2 - 165, W / 2 + 165] : [W / 2];

function menuInput() {
  const bs = layoutButtons();
  const click = ui.click; ui.click = null;
  if (state === 'title' && pressed.Slash) { ui.help = !ui.help; ui.focus = 0; return; }   // ? key
  const fb = focusable(bs), n = fb.length, prev = ui.focus;
  if (ui.focus >= n) ui.focus = 0;
  // Setup screen: ← → / A D change colours (split screen: A D for player 1, ← → for player 2).
  // Elsewhere ← → move between buttons like ↑ ↓.
  const colorKeys = state === 'title' && !ui.help && ui.page === 'setup';
  if (colorKeys) {
    const two = ui.setup === 'split';
    if (pressed.KeyA || (!two && pressed.ArrowLeft)) changeColor(0, -1);
    if (pressed.KeyD || (!two && pressed.ArrowRight)) changeColor(0, 1);
    if (two && pressed.ArrowLeft) changeColor(1, -1);
    if (two && pressed.ArrowRight) changeColor(1, 1);
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
  if (click) act = bs.find(b => inside(b, click.x, click.y)) || (ui.help ? { id: 'help-close' } : null);
  if (act && !act.disabled) { sfx.beep(760); activate(act.id); }
}

// During play only the sound icon can be clicked
function gameClicks() {
  const click = ui.click; ui.click = null;
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) toggleMute();
}

// Change player 1's (who = 0) or player 2's (who = 1) colour. In split screen the two can't match.
function changeColor(who, step) {
  const other = who === 0 ? p2Color : myColor;
  let c = who === 0 ? myColor : p2Color;
  do { c = (c + step + COLORS.length) % COLORS.length; } while (ui.setup === 'split' && c === other);
  if (who === 0) myColor = c; else p2Color = c;
  saveColor();
  reset();            // refresh the cubes standing behind the menu
  sfx.beep(700);
}

function goPage(page, focus = 0) { ui.page = page; ui.focus = focus; }

// Open the setup screen (names + colours) for a mode
function openSetup(kind) {
  ui.setup = kind;
  if (kind === 'split' && p2Color === myColor) { p2Color = (myColor + 3) % COLORS.length; saveColor(); }
  playerCount = kind === 'split' ? 2 : 1;
  reset();
  goPage('setup', 0);    // focus starts on PLAY / JOIN
}

// Where BACK / Esc goes from each menu page
const parentPage = () => ui.page === 'setup' ? (ui.setup === 'multi' ? 'main' : 'local') : 'main';

function activate(id) {
  switch (id) {
    case 'local': goPage('local'); break;
    case 'multi': openSetup('multi'); break;
    case 'solo': openSetup('solo'); break;
    case 'split': openSetup('split'); break;
    case 'back': goPage(parentPage()); break;
    case 'play':
      if (ui.setup === 'multi') { mode = 'versus'; playerCount = 1; startSearch(); }   // online: last one standing wins
      else { mode = ui.setup; playerCount = ui.setup === 'split' ? 2 : 1; startGame(); }
      break;
    case 'c0-prev': changeColor(0, -1); break;
    case 'c0-next': changeColor(0, 1); break;
    case 'c1-prev': changeColor(1, -1); break;
    case 'c1-next': changeColor(1, 1); break;
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
  if (state === 'title') { if (ui.help) ui.help = false; else if (ui.page !== 'main') goPage(parentPage()); }
  else if (state === 'search') activate('cancel');
  else if (state === 'over' && overT > 0.8) activate('menu');
}
