// RCS — The lift from the online room up into the race.
// When the race starts while you're in the room, the race tower is built straight above the room: its floor
// is the room's ceiling, with a START-shaped hole in it. The START platform rises on a piston with everyone
// who was standing on it, the camera following, until it slots into the hole, flush with the floor. That's
// the start line. Then the countdown: you can walk left and right to pick your spot, but not jump yet.
'use strict';

let lift = null;              // { t, dur, total, plat, ground, y0, y1, s0, s1, D } while it runs
const LIFT_PLUG = 40;         // the block under the START slab that fills the hole in the floor

function startLift(m) {
  // Where everyone stood in the room (yours by key slot, the others by id), before the room is replaced
  const at = {};
  for (const p of players) at[p.remote ? p.uid : 'me:' + (p.slot || 0)] = { x: p.x, face: p.face };
  const roomPlats = platforms.filter(p => p.menu !== 'start');
  net.readyWant = undefined;
  reset(m.seed);                                   // the race tower (its floor at GROUND_Y)
  const total = m.startIn / 1000;
  // The room sits D below the race floor: far enough that the ceiling starts just out of sight
  const D = GROUND_Y + 70 + OY + 60;
  for (const q of roomPlats) platforms.push({ ...q, id: nextPid++, y: q.y + D, roomPart: true });
  const ground = platforms.find(q => q.type === 'ground');
  const plat = { id: nextPid++, x: W / 2 - START_W / 2, y: GROUND_Y + D - ROW_GAP, w: START_W, h: 30, type: 'normal', menu: 'lift',
                 dx: 0, dy: 0, t: 0, falling: false, noDrop: true, base: GROUND_Y + D };
  ground.hole = { x: plat.x, w: plat.w };
  platforms.push(plat);
  // Riders: everyone in the race who was in your room, where they stood on START. Anyone who wasn't
  // (still on the results screen) shows up at the start line when the lift arrives.
  for (const p of players) {
    const s = at[p.remote ? p.uid : 'me:' + (p.slot || 0)];
    if (s) { p.x = p.prevX = p.liftX = clamp(s.x, plat.x + 2, plat.x + plat.w - PS - 2); p.face = s.face; p.liftHide = false; }
    else p.liftHide = true;
  }
  const dur = Math.max(1.2, total - 3);            // (3 s are left for the countdown)
  lift = { t: 0, dur, total, plat, ground, D, y0: plat.y, y1: GROUND_Y, s0: GROUND_Y - ROW_GAP, s1: GROUND_Y };
  state = 'lift';
  placeRiders();
  sfx.creak();
}

const LIFT_WAIT = 0.35;       // a moment's pause (and a little shudder) before it goes up
function liftProgress() {
  const u = clamp((lift.t - LIFT_WAIT) / (lift.dur - LIFT_WAIT), 0, 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;   // ease in and out
}
// The tremble: a quick shudder before it goes, then a lighter shake all the way up (strongest mid-way)
function liftShake() {
  if (!lift) return [0, 0];
  const u = clamp((lift.t - LIFT_WAIT) / (lift.dur - LIFT_WAIT), 0, 1);
  const a = lift.t < LIFT_WAIT ? 1.6 : u < 1 ? 0.7 + 1.1 * Math.sin(Math.PI * u) : 0;
  return [Math.sin(lift.t * 57) * a, Math.sin(lift.t * 83 + 1) * a * 0.6];
}
function placeRiders() {
  const e = liftProgress(), pl = lift.plat, [jx, jy] = liftShake();
  pl.y = lift.y0 + (lift.y1 - lift.y0) * e;
  camY = pl.y - (lift.s0 + (lift.s1 - lift.s0) * e);   // the platform's place on screen glides from the room's to the floor's
  pl.jx = jx; pl.jy = jy;                               // (the camera doesn't shake with it)
  for (const p of players) {
    if (p.liftHide) continue;
    p.x = p.prevX = p.liftX + jx;
    p.y = p.prevY = pl.y + jy - p.h; p.vx = p.vy = 0; p.onGround = true; p.ground = pl;
  }
}

function updateLift(dt) {
  time += dt;
  const before = lift.t;
  lift.t += dt;
  if (before < LIFT_WAIT && lift.t >= LIFT_WAIT) { sfx.whoosh(); shake = Math.max(shake, 0.08); }
  placeRiders();
  updateParticles(dt);
  shake = Math.max(0, shake - dt);
  if (lift.t >= lift.dur) {
    // Clunk: it's in. That's the start line; the room below is gone.
    const pl = lift.plat;
    pl.y = GROUND_Y; camY = 0; pl.base = 0; pl.jx = pl.jy = 0;   // (no piston any more: it's part of the floor)
    platforms = platforms.filter(q => !q.roomPart);
    for (const p of players) {
      if (p.liftHide) { p.liftHide = false; continue; }
      p.x = p.prevX = p.liftX; p.y = p.prevY = GROUND_Y - p.h; p.onGround = true; p.ground = lift.ground; p.sq = 0.8;
    }
    for (let k = 0; k < 6; k++) dust(pl.x + (k + 0.5) * pl.w / 6, GROUND_Y);
    sfx.land(1); sfx.count(); shake = Math.max(shake, 0.12);
    countdown = lift.total - lift.dur;
    state = 'count';
    lift = null;
  }
}

// The START slab, with the block that plugs the floor's hole under it and, below that, the piston.
// All in flat colours, so it all moves as one piece (a texture would stay put on screen and slide).
function drawLiftPlatform(p) {
  const x = p.x + (p.jx || 0), y = p.y + (p.jy || 0);
  // piston (only while there's a room below to stand it on)
  if (p.base > y + p.h + LIFT_PLUG) {
    const pw = 70;
    ctx.fillStyle = PAL.normalD; ctx.fillRect(x + p.w / 2 - pw / 2, y + p.h + LIFT_PLUG, pw, p.base - y - p.h - LIFT_PLUG);
    ctx.fillStyle = PAL.normal; ctx.fillRect(x + p.w / 2 - pw / 2 + 10, y + p.h + LIFT_PLUG, pw - 20, p.base - y - p.h - LIFT_PLUG);
  }
  ctx.fillStyle = PAL.ground; ctx.fillRect(x + 2, y + p.h - 6, p.w - 4, LIFT_PLUG + 6);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';   // two soft bands, like a course of the floor's blocks
  ctx.beginPath(); ctx.roundRect(x + 8, y + p.h + 4, p.w - 16, 12, 6); ctx.roundRect(x + 8, y + p.h + 22, p.w - 16, 12, 6); ctx.fill();
  slab(x, y, p.w, p.h, '#ffffff', PAL.good, 3);
  text('START', x + p.w / 2, y + 21, 18, PAL.good, 'center', 900);
}
