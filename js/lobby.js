// RCS — The start scene (lobby). It's the bottom of the tower and you can already play in it:
// - mode platforms (SOLO / MULTIPLAYER, or CO-OP / RACE / MULTIPLAYER with two players): everyone stands
//   on one for 2 seconds to start — the screen then starts scrolling up this same tower
// - a small SOUND pad (a jump above, on the left): land on it to turn the sound on or off
// - the WARDROBE door on the floor, on the left: press down at it to go inside and change your cube (js/wardrobe.js)
// Player 1 plays with W A S D. Holding an arrow key for 2 seconds adds player 2 (Esc removes them).
'use strict';

const HOLD_TIME = 2;          // seconds to stand on a mode platform / hold an arrow key
const lobby = { join: 0, on: null, holdT: 0 };

// The modes on offer: one player can play solo or online; two players co-op or race (online is one per PC)
const lobbyModes = () => playerCount === 2 ? ['coop', 'race', 'multi'] : ['solo', 'multi'];
const MENU_LABEL = { solo: 'SOLO', coop: 'CO-OP', race: 'RACE', multi: 'ONLINE' };
const isMode = p => p.menu && MENU_LABEL[p.menu];
// Until a game has been started once on this computer, little arrows point at the mode platforms
let tutDone = false;
try { tutDone = localStorage.getItem('rcs.tut') === '1'; } catch (e) {}

const LOBBY_LEFT = WALL + 100;   // the mode row starts right of the wardrobe door
const WEAR = ['colour', 'face', 'hat', 'pattern'];
const WEAR_LABEL = { colour: 'COLOUR', face: 'FACE', hat: 'HAT', pattern: 'PATTERN' };

// Build the lobby: the mode platforms one jump above the floor, and a small sound pad one jump higher on the
// left (the wardrobe door stands on the floor, see LOBBY_DOOR_X). Returns where the tower's own platforms
// may start on the sound pad's row.
const SOUND_W = 56;
function buildLobby() {
  buildLobbyRow1();
  const x = WALL + 24;
  platforms.push({ id: nextPid++, x, y: GROUND_Y - 2 * ROW_GAP, w: SOUND_W, h: 16, type: 'normal', menu: 'sound', noDrop: true, dx: 0, dy: 0, t: 0, falling: false });
  return x + SOUND_W;
}
// Row 1 changes when player 2 joins or leaves, so it can be rebuilt on its own
function buildLobbyRow1() {
  platforms = platforms.filter(p => !isMode(p));
  const items = lobbyModes();
  const y = GROUND_Y - ROW_GAP, slot = (W - WALL - LOBBY_LEFT) / items.length, w = Math.min(150, slot - 60);
  items.forEach((menu, k) => {
    const cx = LOBBY_LEFT + slot * (k + 0.5);
    platforms.push({ id: nextPid++, x: cx - w / 2, y, w, h: 16, type: 'normal', menu, dx: 0, dy: 0, t: 0, falling: false,
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

  // Everyone on the same mode platform for 2 seconds starts that mode
  const pl = standingOn(players[0]);
  const ok = pl && isMode(pl) && players.every(p => standingOn(p) === pl);
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
  // online (one cube per computer): the circle closes on your cube, then the 'Connecting' screen
  if (menu === 'multi') { mode = 'versus'; startIris(0.3, myCubeOnScreen(), () => [W / 2, 262], startSearch); return; }
  mode = menu === 'solo' ? 'solo' : menu === 'coop' ? 'split' : 'versus';
  beginPlay();
}
// The screen starts scrolling up the tower, from right where everyone is standing
// lobbyFade: seconds since leaving the lobby for a game — its logo, keys and labels fade out over LOBBY_FADE
let lobbyFade = 0;
const LOBBY_FADE = 0.65;
function beginPlay() {
  state = 'play'; lobbyFade = 0.0001;
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
  if (state !== 'lobby' && state !== 'wardrobe') {
    slab(x, y, p.w, p.h, PAL.normal, PAL.normalD);
    if (lobbyFade > 0) {   // just after the start: the white button and its label fade into the plain platform
      const a = ctx.globalAlpha; ctx.globalAlpha = a * (1 - clamp(lobbyFade / LOBBY_FADE, 0, 1));
      buttonSlab(p, false);
      if (p.menu === 'sound') drawSpeaker(cx + 2, y + p.h / 2, 0.5);
      else if (MENU_LABEL[p.menu]) text(MENU_LABEL[p.menu], cx, y + p.h / 2 + 3.6, 10, PAL.ink, 'center', 900);
      ctx.globalAlpha = a;
    }
    return;
  }
  // A white button; it lights up (green for a mode) while someone stands on it
  const on = players.some(q => standingOn(q) === p);
  const col = isMode(p) ? PAL.good : PAL.ink;
  buttonSlab(p, on, col);
  // Filling up while everyone stands on it, with the seconds left above
  if (lobby.on === p) {
    ctx.fillStyle = PAL.good; ctx.globalAlpha = 0.25;
    ctx.fillRect(x + 3, y + 3, (p.w - 6) * Math.min(1, lobby.holdT / HOLD_TIME), p.h - 6);
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
  if (p.menu === 'sound') { drawSpeaker(cx + 2, y + p.h / 2, 0.5); return; }
  if (p.menu === 'wear' && p.wear === 'colour') {   // a thin rainbow along the colour platform
    const sw = (p.w - 8) / COLORS.length;
    COLORS.forEach((C, k) => { ctx.fillStyle = C.c; ctx.fillRect(x + 4 + k * sw, y + p.h - 8, sw, 4); });
  }
  const label = p.menu === 'wear' ? WEAR_LABEL[p.wear] : MENU_LABEL[p.menu];
  let size = p.h < 20 ? 10 : 13;
  ctx.font = `900 ${size}px ${FONT}`;
  while (size > 9 && ctx.measureText(label).width > p.w - 14) { size--; ctx.font = `900 ${size}px ${FONT}`; }
  text(label, cx, y + p.h / 2 + size * 0.36, size, on && isMode(p) ? PAL.good : PAL.ink, 'center', 900);
}

// The logo, and on the floor who plays with which keys — drawn as keys, not words
// k: 0 in the lobby; 0…1 while it fades away after a game starts (the logo floats up, the floor's keys
// go down with the floor as the camera rises)
function drawLobbyHUD(k = 0) {
  ctx.save(); ctx.translate(0, -OY - k * k * 140);
  // Soft light behind the logo so the tower's platforms don't clash with it (the gradient fades out
  // before the edges of the area it fills, so it has no visible edge)
  const g = ctx.createRadialGradient(W / 2, 130, 30, W / 2, 130, 300);
  g.addColorStop(0, 'rgba(255,251,247,0.98)'); g.addColorStop(0.6, 'rgba(255,251,247,0.9)'); g.addColorStop(1, 'rgba(255,251,247,0)');
  ctx.fillStyle = g; ctx.fillRect(W / 2 - 310, 130 - 310, 620, 620);
  drawLogoArt(ctx, W / 2, 182, 25, time);                        // the mark (js/logo.js)
  if (best > 0) text('BEST ' + best + ' m', W / 2, 228, 14, PAL.inkSoft, 'center', 800);
  ctx.restore();
  if (k > 0) { ctx.save(); ctx.translate(0, -camY); }   // the floor strip rides down with the floor

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
    ctx.beginPath(); ctx.roundRect(bx + 1, by + 1, 26, 26, 6); ctx.stroke(); ctx.setLineDash([]);
    if (f > 0) { ctx.save(); ctx.beginPath(); ctx.roundRect(bx + 3, by + 3, 22, 24, 4); ctx.clip(); ctx.fillStyle = p2.c; ctx.fillRect(bx + 3, by + 27 - 24 * f, 22, 24 * f); ctx.restore(); }
    text('+', bx + 14, by + 21, 20, f > 0 ? p2.d : PAL.inkSoft, 'center', 900);
    keyCluster(ARROWS, rx, y, s, f > 0 ? p2.d : PAL.inkSoft, f > 0 ? 1 : 0.75, f);
  } else {
    cube(W - WALL - 50, y + 14, 28, { c: p2.c, d: p2.d }, p2Look);
    keyCluster(ARROWS, rx, y, s, p2.d);
    keycap('Esc', rx - 96, y + 27, s, PAL.inkSoft, 0.8);    // removes player 2
    ctx.strokeStyle = PAL.inkSoft; ctx.lineWidth = 2.4; ctx.lineCap = 'round';   // a small rounded ✕
    ctx.beginPath(); ctx.moveTo(rx - 132, y + 35); ctx.lineTo(rx - 124, y + 43); ctx.moveTo(rx - 124, y + 35); ctx.lineTo(rx - 132, y + 43); ctx.stroke();
  }
  if (k > 0) { ctx.restore(); return; }
  drawBanner(250);
}
