// RCS — The wardrobe: a little room you enter through the WARDROBE door in the start scene (stand at the
// door and press down: S, or ↓ for player 2). Inside are the COLOUR / FACE / HAT / PATTERN platforms —
// each landing switches that part of your cube — and a big mirror showing your cube(s). Leave through the
// EXIT door (down again) or with Esc; you come back out at the wardrobe door.
'use strict';

const DOOR_W = 46, DOOR_H = 66;
const wardrobe = { saved: null, exitX: 0 };

// The wardrobe door in the start scene stands on the floor, near the left wall
const LOBBY_DOOR_X = () => WALL + 52;

// Is this cube standing in front of a door (on that platform / floor, within the doorway)?
const atDoor = (p, cx, floorY) => p.onGround && Math.abs(p.y + p.h - floorY) < 3 && Math.abs(p.x + p.w / 2 - cx) < DOOR_W / 2 + 6;
// The down key of a cube on this keyboard (player 1: S, player 2: ↓)
const downKey = p => pressed[CONTROLS[p.i].down];

// Start scene: anyone pressing down at the door takes everyone inside
function checkWardrobeDoor() {
  if (players.some(p => atDoor(p, LOBBY_DOOR_X(), GROUND_Y) && downKey(p))) enterWardrobe();
}

function enterWardrobe() {
  wardrobe.saved = platforms; wardrobe.savedGems = gems;   // the start scene, as it is, for when you come back out
  gems = [];
  state = 'wardrobe';
  sfx.beep(520);
  wardrobe.exitX = WALL + 90;
  platforms = [{ id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, falling: false }];
  // The four wardrobe platforms, one jump above the floor, right of the exit door
  const left = WALL + 200, slot = (W - WALL - left) / WEAR.length, w = Math.min(190, slot - 50);
  WEAR.forEach((wear, k) => {
    const cx = left + slot * (k + 0.5);
    platforms.push({ id: nextPid++, x: cx - w / 2, y: GROUND_Y - ROW_GAP, w, h: 30, type: 'normal', menu: 'wear', wear, dx: 0, dy: 0, t: 0, falling: false });
  });
  players.forEach((p, k) => {
    p.x = p.prevX = wardrobe.exitX + 50 + k * 50; p.y = p.prevY = GROUND_Y - p.h;
    p.vx = p.vy = 0; p.onGround = true; p.ground = platforms[0]; p.face = 1;
  });
  particles = [];
}

function leaveWardrobe() {
  platforms = wardrobe.saved; gems = wardrobe.savedGems || [];
  state = 'lobby';
  sfx.beep(420);
  const floor = platforms.find(q => q.type === 'ground');
  players.forEach((p, k) => {
    p.x = p.prevX = LOBBY_DOOR_X() + 34 + k * 44; p.y = p.prevY = GROUND_Y - p.h;
    p.vx = p.vy = 0; p.onGround = true; p.ground = floor; p.face = 1;
  });
  particles = [];
}

function updateWardrobe(dt) {
  time += dt;
  const click = ui.click; ui.click = null;
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) toggleMute();
  updateWorld(dt);
  for (const p of players) updatePlayer(p, dt);
  updateParticles(dt);
  if (pressed.Escape || players.some(p => atDoor(p, wardrobe.exitX, GROUND_Y) && downKey(p))) leaveWardrobe();
}

// A door: frame, wooden door, knob and a sign above it (a word, or the hanger icon for '').
// near: someone is standing at it — the down key(s) to go through bob beside it.
function drawDoor(cx, floorY, label, near) {
  const x = cx - DOOR_W / 2, y = floorY - DOOR_H;
  ctx.fillStyle = PAL.wallLine; ctx.fillRect(x - 6, y - 6, DOOR_W + 12, DOOR_H + 6);
  ctx.fillStyle = '#c99a6c'; ctx.fillRect(x, y, DOOR_W, DOOR_H);
  ctx.fillStyle = '#b3845a';
  ctx.fillRect(x + 6, y + 7, DOOR_W - 12, 20); ctx.fillRect(x + 6, y + 33, DOOR_W - 12, 26);
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x + DOOR_W - 9, y + DOOR_H / 2 + 4, 3.5, 0, 7); ctx.fill();
  ctx.font = `900 13px ${FONT}`;
  const sw = label ? ctx.measureText(label).width + 18 : 44;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - sw / 2, y - 32, sw, 22);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.strokeRect(cx - sw / 2 + 1, y - 31, sw - 2, 20);
  if (label) text(label, cx, y - 16, 13, PAL.ink, 'center', 900);
  else drawHanger(cx, y - 22);
  if (near) {   // the down key(s), bobbing beside the door
    const b = Math.abs(Math.sin(time * 5)) * 4, kx = x + DOOR_W + 26;
    keycap('S', kx, y + 14 + b, 26, PAL.good);
    if (playerCount === 2) keycap('↓', kx + 32, y + 14 + b, 26, PAL.good);
  }
}

// The wardrobe door in the start scene (drawn behind the cubes)
function drawLobbyDoor() {
  const near = players.some(q => atDoor(q, LOBBY_DOOR_X(), GROUND_Y));
  drawDoor(LOBBY_DOOR_X(), GROUND_Y, '', near);
}

// Inside: striped wallpaper, the exit door and the mirror with a big view of each cube
function drawWardrobeRoom() {
  ctx.fillStyle = 'rgba(201,154,108,0.08)';
  for (let x = WALL; x < W - WALL; x += 60) ctx.fillRect(x, -OY, 30, GROUND_Y + OY);
  const near = players.some(q => atDoor(q, wardrobe.exitX, GROUND_Y));
  drawDoor(wardrobe.exitX, GROUND_Y, 'EXIT', near);
  // Mirror
  const n = players.length, mw = 260 * n + 80, mh = 330, mx = W / 2 - mw / 2, my = 120;
  ctx.fillStyle = '#c99a6c'; ctx.fillRect(mx - 12, my - 12, mw + 24, mh + 24);
  const g = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
  g.addColorStop(0, '#f4fbff'); g.addColorStop(1, '#dcebf5');
  ctx.fillStyle = g; ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';   // a glint
  ctx.beginPath(); ctx.moveTo(mx + 30, my); ctx.lineTo(mx + 70, my); ctx.lineTo(mx + 10, my + 90); ctx.lineTo(mx, my + 90); ctx.lineTo(mx, my + 40); ctx.closePath(); ctx.fill();
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
  keycap('Esc', W - WALL - 44, GROUND_Y + 20, 26, PAL.inkSoft, 0.8);   // also leaves
  text('←', W - WALL - 82, GROUND_Y + 42, 22, PAL.inkSoft, 'right', 900);
}
