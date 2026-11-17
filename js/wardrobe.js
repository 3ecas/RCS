// RCS — The wardrobe and the portals. Every way in or out is a portal on the floor: stand in one for a
// second (DOOR_HOLD) and you go through. The wardrobe is a little room behind the shirt portal in the start
// scene (and in the online room). Inside are the COLOUR / FACE / HAT / PATTERN platforms — each landing
// switches that part of your cube — and a big mirror showing your cube(s). Leave through EXIT (or Esc);
// you come back out at the wardrobe portal. The start scene also has the ONLINE portal, and the online
// room an EXIT portal back to the start scene.
'use strict';

const DOOR_W = 46, DOOR_H = 66;
const wardrobe = { saved: null, exitX: 0 };

// Where the portals stand: the wardrobe always on the left, EXIT always on the right, any others in between.
// They stand in the corners, a little in from the walls (CORNER_X): the wardrobe in the left one, the way
// out in the right one — ONLINE in the start scene, EXIT in the online hub, the lobbies and inside the
// wardrobe. The hub's FIND MATCH and PRIVATE portals are in between. Nothing low ever hangs over a corner portal
// (the start scene's mode platforms and the room's platforms keep clear of them).
// wardrobe.from = the scene you went into the wardrobe from (you come back out there).
const CORNER_X = 52;                        // a portal's centre, from the wall beside it
const LOBBY_DOOR_X = () => WALL + CORNER_X;
const doorXOf = scene => LOBBY_DOOR_X();   // (the same corner in every scene)
const sceneDoorX = () => doorXOf(state === 'wardrobe' ? wardrobe.from : state);

// Is this cube standing in front of a door (on that platform / floor, within the doorway)?
const atDoor = (p, cx, floorY) => p.onGround && Math.abs(p.y + p.h - floorY) < 3 && Math.abs(p.x + p.w / 2 - cx) < DOOR_W / 2 + 6;
// Standing in a portal: after DOOR_HOLD seconds you go through. doorHold[id] = how long one of this
// computer's cubes has been standing in it (back to 0 as soon as nobody is).
const DOOR_HOLD = 1;
let doorHold = {};
function holdDoor(id, cx, dt) {
  // (two players on this computer: both have to be standing in it)
  const mine = players.filter(p => !p.remote && !p.dead);
  const inIt = !doorT && !iris && mine.length > 0 && mine.every(p => atDoor(p, cx, GROUND_Y));
  const before = doorHold[id] || 0;
  doorHold[id] = inIt ? before + dt : 0;
  if (inIt && before === 0) sfx.loadStart(DOOR_HOLD);   // the loading tone climbs while you stand in it
  if (!inIt && before > 0) sfx.loadStop();               // stepped out
  if (doorHold[id] >= DOOR_HOLD) { doorHold = {}; sfx.loadStop(); sfx.pling(); return true; }
  return false;
}
const holdOf = id => clamp((doorHold[id] || 0) / DOOR_HOLD, 0, 1);

// Start scene / online room: anyone standing in the wardrobe portal for a second takes everyone inside
function checkWardrobeDoor(dt) {
  if (holdDoor('wardrobe', sceneDoorX(), dt)) startDoor(true);
}
// Start scene: the ONLINE portal, on the floor by the right wall
const ONLINE_X = () => W - WALL - CORNER_X;
function checkOnlinePortal(dt) {
  if (holdDoor('online', ONLINE_X(), dt)) { chooseMode('multi'); return true; }
  return false;
}

// Going through a door: it swings open, a soft circle closes in on the doorway, the scene changes at
// DOOR_SWAP, and the circle opens again on the door you come out of (which swings shut behind you).
// The cubes hold still meanwhile. doorT: { t, enter, swapped } while it runs.
let doorT = null;
const DOOR_OPEN = 0.25, DOOR_SWAP = 0.6, DOOR_END = 1.05;
function startDoor(enter) {
  if (doorT) return;
  doorT = { t: 0, enter, swapped: false };
  sfx.portal();
}
function updateDoor(dt) {
  doorT.t += dt;
  if (doorT.t >= DOOR_OPEN && doorT.t - dt < DOOR_OPEN) sfx.swoosh();
  if (!doorT.swapped && doorT.t >= DOOR_SWAP) { doorT.swapped = true; doorT.enter ? enterWardrobe() : leaveWardrobe(); }
  if (doorT.t >= DOOR_END) doorT = null;
}
// How far open a door is (0 shut … 1 open): the one being gone through opens; the one come out of closes
function doorOpen(isLobbyDoor) {
  if (!doorT) return 0;
  const goingThrough = doorT.enter === isLobbyDoor;
  if (!doorT.swapped) return goingThrough ? clamp(doorT.t / DOOR_OPEN, 0, 1) : 0;
  return goingThrough ? 0 : clamp(1 - (doorT.t - DOOR_SWAP) / 0.35, 0, 1);
}
// The closing / opening circle, drawn over everything (screen coordinates)
function drawDoorIris() {
  if (!doorT) return;
  const t = doorT.t, Rmax = Math.hypot(VW, VH);
  let r;
  if (t < DOOR_OPEN) return;
  if (t < DOOR_SWAP) { const u = (t - DOOR_OPEN) / (DOOR_SWAP - DOOR_OPEN); r = Rmax * Math.pow(1 - u, 2.2); }
  else { const u = clamp((t - DOOR_SWAP) / (DOOR_END - DOOR_SWAP), 0, 1); r = Rmax * Math.pow(u, 2.2); }
  // centred on the doorway being used: before the swap the one gone into, after it the one come out of
  const inLobby = doorT.enter !== doorT.swapped;
  const cx = inLobby ? sceneDoorX() : wardrobe.exitX,   // (the lobby's or the room's door, whichever scene we're in)
        cy = GROUND_Y - DOOR_H / 2 - camY;
  ctx.fillStyle = SOFT.lilac[0];
  ctx.beginPath(); ctx.rect(-OX, -OY, VW, VH); ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2, true); ctx.fill('evenodd');
  ctx.strokeStyle = SOFT.lilac[1]; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2); ctx.stroke();
}

function enterWardrobe() {
  wardrobe.from = state;                                    // 'lobby' or 'room'
  wardrobe.saved = platforms; wardrobe.savedGems = gems; wardrobe.savedCamY = camY; wardrobe.savedDividers = dividers; camY = 0; dividers = [];   // the scene, as it is, for when you come back out
  wardrobe.savedPlayers = players; players = players.filter(p => !p.remote);   // only your own cubes come in
  gems = [];
  state = 'wardrobe';
  sfx.beep(520);
  wardrobe.exitX = W - WALL - CORNER_X;
  platforms = [{ id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, falling: false }];
  // The four wardrobe platforms, one jump above the floor, left of the exit
  const left = WALL + 20, right = wardrobe.exitX - 110, slot = (right - left) / WEAR.length, w = Math.min(190, slot - 50);
  WEAR.forEach((wear, k) => {
    const cx = left + slot * (k + 0.5);
    platforms.push({ id: nextPid++, x: cx - w / 2, y: GROUND_Y - ROW_GAP, w, h: 30, type: 'normal', menu: 'wear', wear, dx: 0, dy: 0, t: 0, falling: false });
  });
  players.forEach((p, k) => {
    p.x = p.prevX = wardrobe.exitX - 50 - PS - k * 50; p.y = p.prevY = GROUND_Y - p.h;
    p.vx = p.vy = 0; p.onGround = true; p.ground = platforms[0]; p.face = -1;
  });
  particles = [];
}

function leaveWardrobe() {
  platforms = wardrobe.saved; gems = wardrobe.savedGems || []; camY = wardrobe.savedCamY || 0; dividers = wardrobe.savedDividers || [];
  const mine = players;
  players = wardrobe.savedPlayers || players;
  state = wardrobe.from || 'lobby';
  sfx.beep(420);
  const floor = platforms.find(q => q.type === 'ground');
  mine.forEach((p, k) => {
    p.x = p.prevX = doorXOf(state) + 34 + k * 44; p.y = p.prevY = GROUND_Y - p.h;
    p.vx = p.vy = 0; p.onGround = true; p.ground = floor; p.face = 1;
  });
  particles = [];
  if (state === 'room') {   // online: tell everyone your new look, and catch up on who's in the room
    netSend({ t: 'look', colors: mine.map(p => localColor(p.slot || 0)), looks: mine.map(p => localLook(p.slot || 0)) });
    syncRoomCubes();
  }
}

function updateWardrobe(dt) {
  time += dt;
  const click = ui.click; ui.click = null;
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) toggleMute();
  updateWorld(dt);
  for (const p of players) updatePlayer(p, dt);
  updateParticles(dt);
  if (holdDoor('exit', wardrobe.exitX, dt) || pressed.Escape) startDoor(false);
}

// The wardrobe's way in (and out): an arch holding a hypnotic rainbow portal (rings flowing in, a turning spiral), and a
// sign on top — a shirt, or a word (EXIT, ONLINE). Always a rectangle. open (0…1): someone is going
// through — it glows. hold (0…1): someone is standing in it — a bar under the sign fills up, and it brightens.
function drawDoor(cx, floorY, label, hold, open = 0) {
  const x = cx - DOOR_W / 2, y = floorY - DOOR_H, r = 7;
  open = Math.max(open, hold * 0.45);
  const arch = (dx, dy, w, h, rr) => { ctx.beginPath(); ctx.roundRect(dx, dy, w, h, [rr, rr, 0, 0]); };
  const base = ctx.globalAlpha;   // (respects a fade in progress)
  // rim
  ctx.fillStyle = SOFT.lilac[1]; arch(x - EDGE, y - EDGE, DOOR_W + 2 * EDGE, DOOR_H + EDGE, r + EDGE); ctx.fill();   // rim: as thick as the cubes' outline
  // the portal: rainbow rings flowing endlessly into its middle, with a slow spiral of light turning over them
  ctx.save(); arch(x, y, DOOR_W, DOOR_H, r); ctx.clip();
  const pcx = cx, pcy = y + DOOR_H * 0.52, RW = 7, cols = ['rose', 'apricot', 'butter', 'mint', 'sky', 'lilac'];
  const flow = time * 2.2, f = flow % 1, n = Math.ceil(Math.hypot(DOOR_W / 2, DOOR_H * 0.52) / RW) + 2;
  for (let i = n; i >= 0; i--) {
    const rr = (i + 1 - f) * RW;
    if (rr <= 0) continue;
    ctx.fillStyle = SOFT[cols[(i + Math.floor(flow)) % 6]][0];   // (each ring keeps its colour as it shrinks)
    ctx.beginPath(); ctx.arc(pcx, pcy, rr, 0, Math.PI * 2); ctx.fill();
  }
  if (ctx.createConicGradient) {
    const sp = ctx.createConicGradient(-time * 1.6, pcx, pcy), arms = 5;
    for (let k = 0; k < arms; k++) {
      sp.addColorStop(k / arms, 'rgba(255,255,255,0.38)');
      sp.addColorStop((k + 0.5) / arms, 'rgba(255,255,255,0)');
    }
    sp.addColorStop(1, 'rgba(255,255,255,0.38)');
    ctx.fillStyle = sp; ctx.fillRect(x, y, DOOR_W, DOOR_H);
  }
  // a bright eye in the middle
  const eg = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, 12);
  eg.addColorStop(0, 'rgba(255,255,255,0.9)'); eg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = eg; ctx.fillRect(pcx - 12, pcy - 12, 24, 24);
  if (open > 0) { ctx.globalAlpha = base * 0.75 * open; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, DOOR_W, DOOR_H); ctx.globalAlpha = base; }
  ctx.restore();
  // the round badge on top
  const by = y - 24;
  if (label) {   // a word on its own, drawn like the shirt sign: white with a dark rounded outline
    ctx.save();
    ctx.font = `900 18px ${FONT}`; ctx.textAlign = 'center'; if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    // (kept inside the walls: a long word over a corner portal shifts in a little)
    const half = ctx.measureText(label).width / 2 + 4, lx = clamp(cx, WALL + 6 + half, W - WALL - 6 - half);
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = PAL.ink; ctx.strokeText(label, lx, by + 7);
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, lx, by + 7);
    ctx.restore();
  } else {
    drawShirt(cx, by + 2);   // a shirt sign, on its own (no badge behind it)
  }
  if (hold > 0) {   // standing in it: a little bar fills up over the second
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.roundRect(cx - 16, y + 6, 32, 6, 3); ctx.fill();
    ctx.fillStyle = PAL.good; ctx.beginPath(); ctx.roundRect(cx - 16, y + 6, 32 * hold, 6, 3); ctx.fill();
  }
}

// The wardrobe door in the start scene / the online room (drawn behind the cubes)
function drawLobbyDoor() {
  drawDoor(sceneDoorX(), GROUND_Y, '', holdOf('wardrobe'), doorOpen(true));
  if (state === 'room') drawRoomExit();
  else if (state === 'hub') drawHubPortals();   // FIND MATCH, PRIVATE, EXIT (js/hub.js)
  else drawDoor(ONLINE_X(), GROUND_Y, 'ONLINE', holdOf('online'), 0);
}

// The online room's way out: an EXIT portal by the right wall (the wardrobe is on the left). Press down at it to leave online play
// (the circle closes on your cube and opens back in the start scene — js/net.js leaveOnline).
const ROOM_EXIT_X = () => W - WALL - CORNER_X;
function checkRoomExit(dt) {
  if (holdDoor('roomExit', ROOM_EXIT_X(), dt)) { sfx.swoosh(); leaveOnline(); return true; }
  return false;
}
function drawRoomExit() {
  drawDoor(ROOM_EXIT_X(), GROUND_Y, 'EXIT', holdOf('roomExit'), 0);
}

// Inside: striped wallpaper, the exit door and the mirror with a big view of each cube
function drawWardrobeRoom() {
  // Wallpaper: soft lilac stripes with a little row of dots
  ctx.fillStyle = 'rgba(200,182,242,0.14)';
  for (let x = WALL; x < W - WALL; x += 60) ctx.fillRect(x, -OY, 30, GROUND_Y + OY);
  drawDoor(wardrobe.exitX, GROUND_Y, 'EXIT', holdOf('exit'), doorOpen(false));
  // Mirror
  const n = players.length, mw = 260 * n + 80, mh = 330, mx = W / 2 - mw / 2, my = 120;
  ctx.fillStyle = SOFT.lilac[0]; ctx.beginPath(); ctx.roundRect(mx - 12, my - 12, mw + 24, mh + 24, 22); ctx.fill();
  ctx.strokeStyle = SOFT.lilac[1]; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(mx - 11, my - 11, mw + 22, mh + 22, 21); ctx.stroke();
  ctx.fillStyle = '#f3f9ff'; ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 12); ctx.fill();
  // a glint: two soft diagonal bars, kept inside the glass
  ctx.save(); ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 12); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.translate(mx + 40, my + 30); ctx.rotate(-0.7);
  ctx.beginPath(); ctx.roundRect(-60, -9, 120, 18, 9); ctx.roundRect(-40, 18, 80, 8, 4); ctx.fill();
  ctx.restore();
  players.forEach((p, k) => {
    const cx = mx + 40 + 260 * k + 130, s = 110;
    const bob = Math.sin(time * 3 + k) * 4;
    cube(cx - s / 2, my + 70 + bob, s, { c: p.color, d: p.dark }, p.look);
    text(p.name.toUpperCase(), cx, my + 236, 20, p.dark, 'center', 900);
  });
  // Gems: how many you have, and a bar filling up toward the next unlock
  if (!GEMS_ON) return;
  const nx = nextUnlock(), gy = my + mh - 34, gx = W / 2;
  drawGemIcon(gx - 92, gy - 5, 9);
  text(String(totalGems), gx - 78, gy + 1, 16, '#1f97ab', 'left', 900);
  if (nx) {
    const bx = gx - 40, bw = 132, prev = Math.max(0, ...Object.values(NEED).flat().filter(v => v <= totalGems));
    ctx.fillStyle = 'rgba(91,75,107,0.12)'; ctx.fillRect(bx, gy - 9, bw, 8);
    ctx.fillStyle = '#2fb7cc'; ctx.fillRect(bx, gy - 9, bw * clamp((totalGems - prev) / (nx.need - prev), 0, 1), 8);
    text(`${nx.name} ${nx.need}`, bx + bw + 8, gy, 13, PAL.inkSoft, 'left', 800);
  } else text('all unlocked', gx - 40, gy, 13, PAL.good, 'left', 900);
}

function drawWardrobeHUD() {
  ctx.save(); ctx.translate(0, -OY);
  text('WARDROBE', W / 2, 78, 44, PAL.ink, 'center', 900);
  ctx.restore();
}
