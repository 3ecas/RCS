// RCS — The online hub: where the ONLINE portal in the start scene leads. A small scene of portals (no
// server connection yet): the wardrobe in the left corner, FIND MATCH (into a public lobby, with the START
// platform), PRIVATE (a room password, then a private lobby) and EXIT in the right corner (back to the start
// scene). Leaving a lobby (its EXIT, LEAVE or Esc) brings you back here.
'use strict';

const FIND_X = () => W / 2 - 130;     // FIND MATCH (PRIVATE_X, right of the middle, is in js/private.js)
const HUB_EXIT_X = () => W - WALL - CORNER_X;
// It's a low tunnel, not a tall room: a solid ceiling (built of the floor's blocks — you bump your head on
// it) this far above the floor
const HUB_HEIGHT = 230;
const hubCeil = () => GROUND_Y - HUB_HEIGHT;
// The camera sits lower here, so the tunnel is in the middle of the screen (the floor fills the space below)
const hubCamY = () => GROUND_Y - HUB_HEIGHT / 2 - H / 2;

function enterHub() {
  netClose();
  net.room = null; net.code = '';
  state = 'hub'; mode = 'versus'; ui.focus = 0; ui.help = false;
  W = ARENA_W; resize();                                    // the same width as the online lobbies
  camY = hubCamY(); time = time || 0; shake = 0; height = 0;
  particles = []; fireballs = []; warnings = []; texts = []; blades = []; jets = []; zaps = []; bubbles = []; dividers = []; gems = [];
  platforms = [{ id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, falling: false }];
  dividers = [{ x: WALL, w: W - 2 * WALL, top: -OY - 2000, bot: hubCeil(), pillar: true, ceiling: true }];   // (solid, like a pillar)
  players = [];
  for (let j = 0; j < playerCount; j++) {
    const p = mkPlayer(j, W / 2 + 40 - j * 50);           // (between FIND MATCH and PRIVATE)
    p.slot = j; players.push(p);
  }
  doorHold = {};
}

function updateHub(dt) {
  time += dt;
  if (net.bannerT > 0) net.bannerT -= dt;
  const click = ui.click; ui.click = null;
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) toggleMute();
  if (privOpen()) return;                      // typing a private room's password (js/private.js)
  if (pressed.Escape) { leaveHub(); return; }
  updateWorld(dt);
  for (const p of players) updatePlayer(p, dt);
  updateParticles(dt);
  checkWardrobeDoor(dt);                       // the wardrobe, left corner (js/wardrobe.js)
  if (doorT) return;
  if (holdDoor('find', FIND_X(), dt)) { findMatch(); return; }
  if (checkPrivatePortal(dt)) return;          // PRIVATE: the password box (js/private.js)
  if (holdDoor('hubExit', HUB_EXIT_X(), dt)) { leaveHub(); return; }
}

// FIND MATCH: the circle closes on the portal and stays shut until you're in a public lobby, then opens on you
function findMatch() {
  net.code = ''; mode = 'versus';
  startIris(0.4, [FIND_X(), GROUND_Y - DOOR_H / 2 - camY], myCubeOnScreen, startSearch, true);
}
// Back to the start scene (EXIT or Esc): the circle closes on your cube and opens on it there
function leaveHub() {
  startIris(0.3, myCubeOnScreen(), myCubeOnScreen, toMenu);
}

function drawHubPortals() {
  drawDoor(FIND_X(), GROUND_Y, 'FIND MATCH', holdOf('find'), 0);
  drawDoor(PRIVATE_X(), GROUND_Y, 'PRIVATE', holdOf('private'), 0);
  drawDoor(HUB_EXIT_X(), GROUND_Y, 'EXIT', holdOf('hubExit'), 0);
}

// The tunnel's ceiling: the floor's soft blocks, upside down, with the same deep edge along it
function drawCeiling(dv) {
  const top = camY - OY - 10;
  tiles(-OX, W + OX, top, dv.bot, 58, 30, 6, 'rgba(255,255,255,0.28)', PAL.ground);
  ctx.fillStyle = PAL.groundD; ctx.beginPath(); ctx.roundRect(WALL - 2, dv.bot - 5, W - 2 * WALL + 4, 5, 2.5); ctx.fill();
}

function drawHubHUD() {
  const c = hubCeil();
  ctx.save(); ctx.translate(0, -camY);   // (in the tunnel, which the camera centres)
  ctx.save(); OUTLINE = true;   // the title, inside the tunnel just under the ceiling
  text('ONLINE', W / 2, c + 46, 36, PAL.ink, 'center', 900);
  text('Find a match, or play in private with your friends', W / 2, c + 72, 15, PAL.good, 'center', 900);
  OUTLINE = false; ctx.restore();
  text('Stand in a portal for a second  ·  Esc: back', W / 2, GROUND_Y + 60, 14, PAL.inkSoft, 'center', 800);
  ctx.restore();
  drawBanner(250);
}
