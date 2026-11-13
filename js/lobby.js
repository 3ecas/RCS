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
const MENU_LABEL = { solo: 'SOLO', coop: 'CO-OP', race: 'RACE', multi: 'MULTIPLAYER', sound: 'SOUND' };
const MENU_SUB = { solo: 'climb alone', coop: 'if one falls, both lose', race: 'last one standing wins', multi: 'online race' };

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

// Mode / sound / wardrobe platforms: a normal platform, thicker, with its name on it
function drawMenuPlatform(p) {
  const x = p.x, y = p.y;
  ctx.fillStyle = PAL.normal; ctx.fillRect(x, y, p.w, p.h);
  ctx.fillStyle = PAL.normalD; ctx.fillRect(x, y + p.h - 4, p.w, 4);
  ctx.globalAlpha = 1;
  if (state !== 'lobby' && state !== 'wardrobe') return;     // in the game they're plain platforms: the names go away
  // Filling up while everyone stands on it
  if (lobby.on === p) {
    ctx.fillStyle = PAL.good; ctx.globalAlpha = 0.55;
    ctx.fillRect(x, y, p.w * Math.min(1, lobby.holdT / HOLD_TIME), p.h - 4);
    ctx.globalAlpha = 1;
    text(String(Math.max(1, Math.ceil(HOLD_TIME - lobby.holdT))), x + p.w / 2, y - 62, 44, PAL.good, 'center', 900);
  }
  const label = p.menu === 'sound' ? (muted ? 'SOUND OFF' : 'SOUND ON') : p.menu === 'wear' ? WEAR_LABEL[p.wear] : MENU_LABEL[p.menu];
  if (p.menu === 'wear' && p.wear === 'colour') {   // a thin rainbow along the colour platform
    const sw = (p.w - 8) / COLORS.length;
    COLORS.forEach((C, k) => { ctx.fillStyle = C.c; ctx.fillRect(x + 4 + k * sw, y + p.h - 4, sw, 4); });
  }
  let size = 17;
  ctx.font = `900 ${size}px ${FONT}`;
  while (size > 10 && ctx.measureText(label).width > p.w - 14) { size--; ctx.font = `900 ${size}px ${FONT}`; }
  text(label, x + p.w / 2, y + 19, size, PAL.ink, 'center', 900);
  // A small hint above it (lobby only)
  if (lobby.on !== p) {
    const sub = p.menu === 'sound' ? 'jump on to switch' : p.menu === 'wear' ? 'land to change' : p.menu === 'multi' && playerCount === 2 ? 'online race, both of you' : MENU_SUB[p.menu];
    text(sub, x + p.w / 2, y - 12, 12, PAL.inkSoft, 'center', 700);
  }
  ctx.globalAlpha = 1;
}

// The logo and the key hints, pinned to the screen
function drawLobbyHUD() {
  ctx.save(); ctx.translate(0, -OY);
  const bob = Math.sin(time * 3) * 3;
  // Soft glow behind the logo so the tower's platforms don't clash with it
  const g = ctx.createRadialGradient(W / 2, 120, 20, W / 2, 120, 300);
  g.addColorStop(0, 'rgba(255,250,248,0.95)'); g.addColorStop(0.55, 'rgba(255,250,248,0.75)'); g.addColorStop(1, 'rgba(255,250,248,0)');
  ctx.fillStyle = g; ctx.fillRect(W / 2 - 300, -OY, 600, 300 + OY);
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 16;
  text('RCS', W / 2, 118 + bob, 92, PAL.ink, 'center', 900);
  text('Climb the tower. Don’t fall behind.', W / 2, 152, 18, PAL.inkSoft, 'center', 700);
  if (best > 0) text('Best height: ' + best + ' m', W / 2, 178, 15, PAL.good, 'center', 800);
  ctx.restore();
  ctx.restore();

  // Bottom strip (on the floor): who plays with which keys, and joining player 2
  const y = GROUND_Y + 56;
  const p1 = COLORS[myColor], p2 = COLORS[p2Color];
  text('PLAYER 1   W A S D', WALL + 24, y, 15, p1.d, 'left', 900);
  if (playerCount === 1) {
    const f = lobby.join / HOLD_TIME;
    if (f > 0) {
      const bw = 200, bx = W - WALL - 24 - bw;
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(bx, y + 8, bw, 8);
      ctx.fillStyle = p2.c; ctx.fillRect(bx, y + 8, bw * f, 8);
      text('Adding player 2…', W - WALL - 24, y, 15, p2.d, 'right', 900);
    } else text('Hold an arrow key to add player 2', W - WALL - 24, y, 15, PAL.inkSoft, 'right', 800);
  } else {
    text('PLAYER 2   ARROW KEYS   ·   Esc removes', W - WALL - 24, y, 15, p2.d, 'right', 900);
  }
  text('Stand on a mode together for 3 s to start  ·  go through the WARDROBE door to change your cube  ·  ? help', W / 2, GROUND_Y + 28, 13, PAL.inkSoft, 'center', 700);
  drawBanner(200);
}
