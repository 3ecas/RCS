// RCS — The start scene (lobby). It's the bottom of the tower and you can already play in it:
// - mode platforms (SOLO / MULTIPLAYER, or CO-OP / RACE / MULTIPLAYER with two players): everyone stands
//   on one for 3 seconds to start — the screen then starts scrolling up this same tower
// - a SOUND platform: land on it to turn the sound on or off
// - a WARDROBE door a jump higher: press down at it to go inside and change your cube (js/wardrobe.js)
// Player 1 plays with W A S D. Holding an arrow key for 3 seconds adds player 2 (Esc removes them).
'use strict';

const HOLD_TIME = 3;          // seconds to stand on a mode platform / hold an arrow key
const lobby = { join: 0, on: null, holdT: 0 };

// The modes on offer: one player can play solo or online; two players co-op or race (online is one per PC)
const lobbyModes = () => playerCount === 2 ? ['coop', 'race', 'multi'] : ['solo', 'multi'];
const MENU_LABEL = { solo: 'SOLO', coop: 'CO-OP', race: 'RACE', multi: 'ONLINE' };
const isMode = p => p.menu && MENU_LABEL[p.menu];
// Until a game has been started once on this computer, little arrows point at the mode platforms
let tutDone = false;
try { tutDone = localStorage.getItem('rcs.tut') === '1'; } catch (e) {}

const LOBBY_LEFT = WALL;
const WEAR = ['colour', 'face', 'hat', 'pattern'];
const WEAR_LABEL = { colour: 'COLOUR', face: 'FACE', hat: 'HAT', pattern: 'PATTERN' };

// Build the lobby: the mode + sound platforms one jump above the floor, and the wardrobe door one jump
// higher. Returns where the tower's own platforms may start on the door's row.
function buildLobby() {
  buildLobbyRow1();
  return addWardrobeDoor();
}
// Row 1 changes when player 2 joins or leaves, so it can be rebuilt on its own
function buildLobbyRow1() {
  platforms = platforms.filter(p => !(p.menu && p.menu !== 'wear' && p.menu !== 'door'));
  const items = [...lobbyModes(), 'sound'];
  const y = GROUND_Y - ROW_GAP, slot = (W - WALL - LOBBY_LEFT) / items.length, w = Math.min(230, slot - 40);
  items.forEach((menu, k) => {
    const cx = LOBBY_LEFT + slot * (k + 0.5);
    platforms.push({ id: nextPid++, x: cx - w / 2, y, w, h: 30, type: 'normal', menu, dx: 0, dy: 0, t: 0, falling: false,
 });
  });
  lobby.on = null; lobby.holdT = 0;
}

// What a player is standing on (through another player's head, if they're stacked)
const standingOn = p => !p.onGround || !p.ground ? null : p.ground.isPlayer ? standingOn(p.ground.ref) : p.ground;

function updateLobby(dt) {
  time += dt;
  if (net.bannerT > 0) net.bannerT -= dt;
  // Instructions overlay (? key or icon)
  const click = ui.click; ui.click = null;
  if (pressed.Slash) { ui.help = !ui.help; return; }
  if (ui.help) {
    if (pressed.Escape || pressed.Enter || pressed.Space || click) ui.help = false;
    return;
  }
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) { ui.help = true; return; }
  if (pressed.Escape && playerCount === 2) removePlayer2();

  // Player 2 joins by holding any arrow key
  if (playerCount === 1) {
    const c = CONTROLS[1];
    const held = keys[c.left] || keys[c.right] || keys[c.jump] || keys[c.down];
    const before = Math.ceil(lobby.join);
    lobby.join = held ? lobby.join + dt : 0;
    if (held && Math.ceil(lobby.join) !== before && lobby.join < HOLD_TIME) sfx.beep(520);
    if (lobby.join >= HOLD_TIME) addPlayer2();
  }

  updateWorld(dt);
  for (const p of players) updatePlayer(p, dt);
  updateParticles(dt);
  checkWardrobeDoor();                 // down at the WARDROBE door: go inside (js/wardrobe.js)
  if (state !== 'lobby') return;

  // Everyone on the same mode platform for 3 seconds starts that mode
  const pl = standingOn(players[0]);
  const ok = pl && pl.menu && pl.menu !== 'sound' && pl.menu !== 'wear' && pl.menu !== 'door' && players.every(p => standingOn(p) === pl);
  if ((ok ? pl : null) !== lobby.on) { lobby.on = ok ? pl : null; lobby.holdT = 0; }
  if (lobby.on) {
    const before = Math.ceil(HOLD_TIME - lobby.holdT);
    lobby.holdT += dt;
    const after = Math.ceil(HOLD_TIME - lobby.holdT);
    if (after !== before && after > 0) sfx.beep(440);
    if (lobby.holdT >= HOLD_TIME) chooseMode(lobby.on.menu);
  }
}

function chooseMode(menu) {
  lobby.on = null; lobby.holdT = 0;
  if (!tutDone) { tutDone = true; try { localStorage.setItem('rcs.tut', '1'); } catch (e) {} }
  if (menu === 'multi') { mode = 'versus'; startSearch(); return; }   // online: one cube per computer
  mode = menu === 'solo' ? 'solo' : menu === 'coop' ? 'split' : 'versus';
  beginPlay();
}
// The screen starts scrolling up the tower, from right where everyone is standing
function beginPlay() {
  state = 'play';
  sfx.beep(880);
  floatText('GO!', W / 2, camY + H * 0.4, PAL.good);
}

function addPlayer2() {
  lobby.join = 0;
  playerCount = 2;
  if (p2Color === myColor) { p2Color = (myColor + 3) % COLORS.length; saveColor(); }
  const s = spawnPos(1, 2);
  const p = mkPlayer(1, s.x);
  p.y = p.prevY = s.y; p.sq = 1.5;
  players.push(p);
  burst(p.x + p.w / 2, p.y + p.h / 2, 16, p.color, 260, 0.6, 7);
  sfx.milestone();
  floatText('Player 2 joined!', W / 2, GROUND_Y - 300, p.dark, 30);
  buildLobbyRow1();
}
function removePlayer2() {
  const p = players.pop();
  playerCount = 1;
  burst(p.x + p.w / 2, p.y + p.h / 2, 12, p.color, 200, 0.5, 6);
  buildLobbyRow1();
}

// Landing on a lobby platform: the sound one switches sound, a wardrobe one changes that part of your cube
function touchLobby(p, pl) {
  if (state !== 'lobby' && state !== 'wardrobe') return;
  if (pl.menu === 'sound') {
    toggleMute(); audioInit();
    sfx.beep(muted ? 300 : 700);
    floatText(muted ? 'SOUND OFF' : 'SOUND ON', pl.x + pl.w / 2, pl.y - 30, PAL.ink, 22);
  } else if (pl.menu === 'wear') {
    let what;
    if (pl.wear === 'colour') {
      // Next colour (two players can't share one)
      const other = players.find(q => q !== p);
      let c = localColor(p.i);
      do { c = (c + 1) % COLORS.length; } while (other && c === localColor(other.i));
      if (p.i === 0) myColor = c; else p2Color = c;
      saveColor();
      const C = COLORS[c];
      p.color = C.c; p.dark = C.d; p.name = C.name; what = C.name;
    } else {
      const look = localLook(p.i), key = { face: 'f', hat: 'h', pattern: 'p' }[pl.wear];
      const list = { face: FACES, hat: HATS, pattern: PATTERNS }[pl.wear];
      do { look[key] = (look[key] + 1) % list.length; } while (!unlocked(key, look[key]));   // skip locked ones
      saveLook();
      p.look = { ...look }; what = list[look[key]];
    }
    p.sq = 1.35;
    burst(p.x + p.w / 2, p.y + p.h, 10, p.color, 200, 0.5, 6);
    floatText(what, p.x + p.w / 2, p.y - 24, p.dark, 18);
    sfx.beep(700);
  }
}

// Mode / sound / wardrobe platforms: a normal platform, thicker, with its name (or an icon) on it
function drawMenuPlatform(p) {
  const x = p.x, y = p.y, cx = x + p.w / 2;
  // In the game they're plain platforms: the names go away
  if (state !== 'lobby' && state !== 'wardrobe') { slab(x, y, p.w, p.h, PAL.normal, PAL.normalD); return; }
  // A white button; it lights up (green for a mode) while someone stands on it
  const on = players.some(q => standingOn(q) === p);
  const col = isMode(p) ? PAL.good : PAL.ink;
  buttonSlab(p, on, col);
  // Filling up while everyone stands on it, with the seconds left above
  if (lobby.on === p) {
    ctx.fillStyle = PAL.good; ctx.globalAlpha = 0.25;
    ctx.fillRect(x + 4, y + 4, (p.w - 8) * Math.min(1, lobby.holdT / HOLD_TIME), p.h - 8);
    ctx.globalAlpha = 1;
    text(String(Math.max(1, Math.ceil(HOLD_TIME - lobby.holdT))), cx, y - 26, 40, PAL.good, 'center', 900);
  } else if (state === 'lobby' && isMode(p)) {
    // Two players: one is on it, the other isn't yet: the missing cube blinks above it
    const on = players.filter(q => standingOn(q) === p);
    if (on.length && on.length < players.length) {
      const miss = players.find(q => standingOn(q) !== p);
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(time * 6);
      cube(cx - 11, y - 46, 22, { c: miss.color, d: miss.dark }, miss.look);
      ctx.globalAlpha = 1;
    } else if (!tutDone) {       // first visit: bouncing arrows point at the modes
      const b = Math.abs(Math.sin(time * 4)) * 8;
      ctx.fillStyle = PAL.good;
      ctx.beginPath(); ctx.moveTo(cx - 9, y - 30 - b); ctx.lineTo(cx + 9, y - 30 - b); ctx.lineTo(cx, y - 18 - b); ctx.closePath(); ctx.fill();
    }
  }
  if (p.menu === 'sound') { drawSpeaker(cx + 2, y + 15, 0.85); return; }
  if (p.menu === 'wear' && p.wear === 'colour') {   // a thin rainbow along the colour platform
    const sw = (p.w - 8) / COLORS.length;
    COLORS.forEach((C, k) => { ctx.fillStyle = C.c; ctx.fillRect(x + 4 + k * sw, y + p.h - 8, sw, 4); });
  }
  const label = p.menu === 'wear' ? WEAR_LABEL[p.wear] : MENU_LABEL[p.menu];
  let size = 17;
  ctx.font = `900 ${size}px ${FONT}`;
  while (size > 10 && ctx.measureText(label).width > p.w - 14) { size--; ctx.font = `900 ${size}px ${FONT}`; }
  text(label, cx, y + 20, size, on && isMode(p) ? PAL.good : PAL.ink, 'center', 900);
}

// The logo, and on the floor who plays with which keys — drawn as keys, not words
function drawLobbyHUD() {
  ctx.save(); ctx.translate(0, -OY);
  const bob = Math.sin(time * 3) * 3;
  // Soft glow behind the logo so the tower's platforms don't clash with it
  const g = ctx.createRadialGradient(W / 2, 110, 20, W / 2, 110, 260);
  g.addColorStop(0, 'rgba(255,250,248,0.95)'); g.addColorStop(0.55, 'rgba(255,250,248,0.75)'); g.addColorStop(1, 'rgba(255,250,248,0)');
  ctx.fillStyle = g; ctx.fillRect(W / 2 - 260, -OY, 520, 260 + OY);
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 16;
  text('RCS', W / 2, 118 + bob, 92, PAL.ink, 'center', 900);
  if (best > 0) text('BEST ' + best + ' m', W / 2, 152, 15, PAL.good, 'center', 900);
  ctx.restore();
  ctx.restore();

  // The floor: player 1's cube and keys on the left; player 2 (or how to add them) on the right
  const y = GROUND_Y + 9, s = 23, p1 = COLORS[myColor], p2 = COLORS[p2Color];
  cube(WALL + 22, y + 14, 28, { c: p1.c, d: p1.d }, myLook);
  keyCluster(WASD, WALL + 104, y, s, p1.d);
  const rx = W - WALL - 104;
  if (playerCount === 1) {
    // A dashed "empty" cube with a plus, and the arrow keys faded: hold one to add player 2
    const f = lobby.join / HOLD_TIME;
    const bx = W - WALL - 50, by = y + 14;
    ctx.setLineDash([4, 3]); ctx.strokeStyle = f > 0 ? p2.d : PAL.inkSoft; ctx.lineWidth = 2;
    ctx.strokeRect(bx + 1, by + 1, 26, 26); ctx.setLineDash([]);
    if (f > 0) { ctx.fillStyle = p2.c; ctx.fillRect(bx + 3, by + 27 - 24 * f, 22, 24 * f); }
    text('+', bx + 14, by + 21, 20, f > 0 ? p2.d : PAL.inkSoft, 'center', 900);
    keyCluster(ARROWS, rx, y, s, f > 0 ? p2.d : PAL.inkSoft, f > 0 ? 1 : 0.75, f);
  } else {
    cube(W - WALL - 50, y + 14, 28, { c: p2.c, d: p2.d }, p2Look);
    keyCluster(ARROWS, rx, y, s, p2.d);
    keycap('Esc', rx - 96, y + 27, s, PAL.inkSoft, 0.8);    // removes player 2
    text('✕', rx - 128, y + 45, 16, PAL.inkSoft, 'center', 900);
  }
  drawBanner(190);
}
