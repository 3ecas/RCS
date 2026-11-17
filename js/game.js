// RCS — The game rules: update loop, player movement, hazards and deaths.
'use strict';

let runRecord = null;   // { t } once this run has beaten your best height (see the height update below)
function update(dt) {
  if (runRecord) runRecord.t += dt;
  if (screenWipe && (screenWipe.t += dt) > 0.8) screenWipe = null;   // the end-screen transition (js/menu.js)
  if (lobbyFade > 0 && (lobbyFade += dt) > LOBBY_FADE) lobbyFade = 0;   // the lobby fading away (js/lobby.js)
  if (state !== 'room' && chatOpen()) closeChat();   // the chat box is only for the room
  if (pressed.KeyM) toggleMute();
  if (pressed.KeyF) toggleFullscreen();
  ambTick(dt);   // the ambience follows what's near your cube (js/music.js)
  updateWarp(dt);   // cubes spinning into / out of a portal (js/wardrobe.js)

  if (doorT) { updateDoor(dt); time += dt; return; }
  if (updateDeathCam(dt)) return;                        // frozen on the moment an obstacle got you   // going through the wardrobe door (js/wardrobe.js)
  if (updateRaceStart(dt)) { time += dt; return; }      // online circle transitions (js/net.js)
  if (state === 'lobby') { updateLobby(dt); return; }   // the playable start scene (js/lobby.js)
  if (state === 'room') { updateRoom(dt); return; }     // the online room scene (js/room.js)
  if (state === 'hub') { updateHub(dt); return; }       // the online hub: FIND MATCH / PRIVATE (js/hub.js)
  if (state === 'lift') { updateLift(dt); return; }     // START rising from the room into the race (js/lift.js)
  if (state === 'wardrobe') { updateWardrobe(dt); return; }   // inside the wardrobe (js/wardrobe.js)
  // Pause, room and end screens are driven by buttons (mouse or keyboard)
  if (state === 'found') {       // "Match found!" — then the countdown
    time += dt; foundT -= dt;
    if (foundT <= 0) { state = 'count'; sfx.count(); }
    return;
  }
  if (state === 'over' && overT < 0 && finaleOn()) {   // the finale: slow motion, zooming in on the winner
    const sd = dt * FINALE_SLOW;
    time += sd; overT += dt;
    updateWorld(sd);
    for (const p of players) if (!p.dead) p.remote ? updateRemote(p, sd) : updatePlayer(p, sd);
    updateParticles(sd);
    shake = Math.max(0, shake - dt);
    reportRoundOver();
    return;
  }
  if (state === 'paused' || state === 'search' || state === 'over') {
    time += dt;
    if (state !== 'paused') updateParticles(dt);
    if (state === 'over') { revealSfx(overT, overT + dt); overT += dt; shake = Math.max(0, shake - dt); reportRoundOver(); }
    if (net.bannerT > 0) net.bannerT -= dt;
    if (state === 'paused' && (pressed.KeyR || pressed.Escape)) { state = pausedFrom; return; }   // R / Esc again: carry on
    if (pressed.Escape) { escAction(); return; }
    menuInput();
    return;
  }
  if (spectating()) {   // knocked out online: the ROOM / LEAVE buttons (and Esc back to the room)
    if (pressed.Escape) { escAction(); return; }
    menuInput(); if (state !== 'play') return;
  } else gameClicks();   // the sound icon
  // R or Esc pauses the game. Not online — the other computers' games can't be paused.
  if ((pressed.KeyR || pressed.Escape) && net.status !== 'playing') { pausedFrom = state; state = 'paused'; ui.focus = 0; return; }

  time += dt;
  if (state === 'count') {
    const before = Math.ceil(countdown);
    countdown -= dt;
    const after = Math.ceil(countdown);
    if (after !== before) {
      if (after > 0) sfx.count();                       // 3 … 2 … 1 …
      else { sfx.horn(); state = 'play'; floatText('GO!', W / 2, camY + H * 0.4, PAL.good); }   // GO!
    }
  }

  updateCamera(dt);

  generate();
  updateWorld(dt);
  // During the countdown you can walk left and right to pick your spot, but not jump (see updatePlayer)
  {
    for (const p of players) {
      if (p.dead) continue;
      if (p.remote) { updateRemote(p, dt); continue; }
      updatePlayer(p, dt);
    }
  }
  netTick(dt);
  updateHazards(dt);
  updateParticles(dt);
  shake = Math.max(0, shake - dt);

  for (const p of alive()) p.best = Math.max(p.best, Math.floor(playerProgress(p)));
  const h = Math.max(0, ...alive().map(p => Math.floor(playerProgress(p))));
  if (h > height) {
    height = h;
    // Passing your best height in a solo / co-op run: a jingle, and the height counter goes green and bounces
    if (mode !== 'versus' && best > 0 && !runRecord && height > best) {
      runRecord = { t: 0 }; sfx.record();
      floatText('NEW BEST!', W / 2, camY + H * 0.3, PAL.good, 40);
    }
    if (height >= nextMilestone) {
      const ms = Math.floor(height / 50) * 50;   // the highest one passed (a spring can skip one)
      floatText(ms + ' m!', W / 2, camY + H * 0.3);
      sfx.milestone();
      nextMilestone = ms + 50;
    }
  }

  for (const p of alive()) {
    if (p.remote) continue;          // their computer decides when they fall
    const why = outReason(p);
    if (why) die(p, why);
    if (state === 'over') return;
  }
}

// ---- How the tower scrolls and where its edges are ----

// The screen climbs at a speed that rises with height, and catches up when players climb fast
function updateCamera(dt) {
  if (climbWait && players.some(p => !p.dead && p.y + p.h < camY + H * 0.5)) climbWait = false;
  if (state === 'play' && !climbWait) {
    const camM = Math.max(0, heightM(camY + H));
    scrollSpeed = Math.min(38 + camM * 0.4, 200);
    camY -= scrollSpeed * dt;
  }
  const topY = Math.min(...alive().map(p => p.y));
  const target = topY - H * 0.38;
  if (target < camY) camY += (target - camY) * Math.min(1, 5 * dt);
}
// How far a player has got (metres)
function playerProgress(p) { return heightM(p.y + PS); }
// How far the screen has got (metres) — sets which obstacles appear
function levelM() { return heightM(camY); }
// Is this player off the screen? Returns why, or null
function outReason(p) {
  return p.y > camY + H + 10 ? (mode === 'versus' ? 'fell behind' : 'fell off the tower') : null;
}
// Keep a player between the side walls
function clampX(p) {
  if (p.x < WALL) { p.x = WALL; p.vx = 0; }
  if (p.x + p.w > W - WALL) { p.x = W - WALL - p.w; p.vx = 0; }
}
// Two Paths region: the wall up the middle can't be crossed (you stay on the side you came from)
// Pillars are solid: from the side they stop you (blockDividers, after moving sideways), from below
// they're a ceiling and from above a floor (blockDividersY, after moving up / down). Resolving each
// direction separately means a cube can never end up inside one and be pushed out the wrong side.
function blockDividers(p) {
  for (const dv of dividers) {
    if (p.y + p.h <= dv.top || p.y >= dv.bot) continue;            // not level with it
    if (p.x + p.w <= dv.x || p.x >= dv.x + dv.w) continue;          // not touching it
    if (p.prevX + p.w <= dv.x + 1) { p.x = dv.x - p.w; p.vx = 0; }              // came from the left
    else if (p.prevX >= dv.x + dv.w - 1) { p.x = dv.x + dv.w; p.vx = 0; }       // came from the right
  }
}
function blockDividersY(p, prevTop, prevBottom) {
  for (const dv of dividers) {
    if (p.x + p.w <= dv.x + 0.5 || p.x >= dv.x + dv.w - 0.5) continue;
    if (p.vy < 0 && prevTop >= dv.bot - 0.5 && p.y < dv.bot) { p.y = dv.bot; p.vy = 0; }                 // head on its bottom
    else if (p.vy >= 0 && prevBottom <= dv.top + 0.5 && p.y + p.h > dv.top) { p.y = dv.top - p.h; p.vy = 0; p.onGround = true; p.ground = { type: 'normal', dx: 0, dy: 0, noDrop: true, pillarTop: true }; }   // standing on its top
  }
}
// Has something scrolled far enough off-screen to be thrown away?
function offScreen(x, y, w) { return y >= camY + H + OY + 250; }
// Where a falling fireball comes from (its warning shows at the top of the screen)

function updateWorld(dt) {
  for (const p of platforms) {
    p.t += dt;
    const ox = p.x, oy = p.y;
    if (p.type === 'move') p.x = p.baseX + Math.sin(p.t * p.spd) * p.amp;
    if (p.type === 'tilt') updateTilt(p, dt);
    if (p.falling) { p.vy += GRAV * 0.6 * dt; p.y += p.vy * dt; }
    if (p.type === 'spring' && !p.held) {
      // The pad wobbles back to rest: comp 0 = rest, 1 = pressed all the way down, below 0 = stretched up
      p.cv = (p.cv || 0) + (-SPRING_K * (p.comp || 0) - SPRING_DAMP * (p.cv || 0)) * dt;
      p.comp = (p.comp || 0) + p.cv * dt;
    }
    p.dx = p.x - ox;
    p.dy = p.falling ? 0 : p.y - oy;
  }
  platforms = platforms.filter(p => !offScreen(p.x, p.y, p.w));
  updateObstacles(dt);   // shurikens, flames, lightning, water columns (js/obstacles.js)
  dividers = dividers.filter(dv => !offScreen(0, dv.top, 0));
  gems = gems.filter(g => !g.taken && !offScreen(0, g.y, 0));
}

// Two players on this computer (offline or online): player 1 uses WASD, player 2 the arrow keys.
// In the lobby player 1 is always WASD (the arrow keys are for adding player 2).
// One player on this computer: either set moves your cube.
function humanInput(p) {
  const online = net.status === 'playing' || state === 'room';
  if (online ? net.local === 2 : playerCount === 2 || state === 'lobby' || state === 'wardrobe') {
    const c = CONTROLS[online ? p.slot || 0 : p.i];   // online: slot = which keys on this computer
    return { left: keys[c.left], right: keys[c.right], jump: keys[c.jump], jumpPressed: pressed[c.jump], down: pressed[c.down],
             leftPressed: pressed[c.left], rightPressed: pressed[c.right] };
  }
  const a = CONTROLS[0], b = CONTROLS[1];
  return { left: keys[a.left] || keys[b.left], right: keys[a.right] || keys[b.right], jump: keys[a.jump] || keys[b.jump],
           jumpPressed: pressed[a.jump] || pressed[b.jump], down: pressed[a.down] || pressed[b.down],
           leftPressed: pressed[a.left] || pressed[b.left], rightPressed: pressed[a.right] || pressed[b.right] };
}

// A seesaw tips toward the side with weight on it: each cube standing on it pushes down in proportion to
// how far it is from the centre; with nobody on it, it springs slowly back to level.
function updateTilt(pl, dt) {
  let push = 0;
  for (const q of players) {
    if (q.dead) continue;
    const cx = q.x + q.w / 2;
    const on = q.remote
      ? Math.abs(cx - pl.px) <= pl.w / 2 && Math.abs(q.y + q.h - tiltY(pl, cx)) < 8   // other computers' cubes: by position
      : q.onGround && q.ground === pl;
    if (on) push += clamp((cx - pl.px) / (pl.w / 2), -1, 1);
  }
  const before = Math.sign(pl.angle);
  pl.av += (push * TILT.push - pl.angle * TILT.spring - pl.av * TILT.damp) * dt;
  pl.angle += pl.av * dt;
  if (Math.abs(pl.angle) > TILT.max) { pl.angle = Math.sign(pl.angle) * TILT.max; pl.av = 0; }
  if (push && before !== Math.sign(pl.angle) && Math.abs(pl.av) > 0.3) sfx.creak();
}

// Is there a wall (the tower's sides, or either face of a chimney pillar) within `reach` of the cube's side?
// Returns -1 = on its left, 1 = on its right, 0 = none; nearWallId = which wall (so the same one can't be
// jumped off twice in a row, but another wall on the same side can)
let nearWallId = null;
function wallNear(p, reach) {
  nearWallId = null;
  if (p.x - WALL <= reach) { nearWallId = 'towerL'; return -1; }
  if (W - WALL - (p.x + p.w) <= reach) { nearWallId = 'towerR'; return 1; }
  for (const dv of dividers) {
    if (p.y + p.h <= dv.top || p.y >= dv.bot) continue;
    const dl = p.x - (dv.x + dv.w), dr = dv.x - (p.x + p.w);
    if (dl > -1 && dl <= reach) { nearWallId = dv; return -1; }
    if (dr > -1 && dr <= reach) { nearWallId = dv; return 1; }
  }
  return 0;
}

function updatePlayer(p, dt) {
  const inp = humanInput(p);
  if (state === 'count') inp.jump = inp.jumpPressed = inp.down = false;   // countdown: left and right only
  p.prevX = p.x; p.prevY = p.y;
  if (warpOf(p) > 0) { p.vx = p.vy = 0; return; }   // spinning into / out of a portal: held still
  if (p.press) { springPress(p, inp, dt); return; }   // riding a spring pad down

  // Ride whatever we're standing on
  if (p.onGround && p.ground) {
    if (p.ground.falling) { p.onGround = false; p.ground = null; }
    else if (p.ground.isPlayer) p.x += p.ground.ref.x - p.ground.ref.prevX;
    else if (p.ground.type === 'tilt') {
      // On a seesaw: slide toward the low end, and stay on the sloping surface (or fall off the end)
      const pl = p.ground;
      p.x += Math.sin(pl.angle) * TILT.slide * dt;
      const cx = p.x + p.w / 2;
      if (Math.abs(cx - pl.px) > pl.w / 2 * Math.cos(pl.angle) + 4) { p.onGround = false; p.ground = null; }
      else p.y = tiltY(pl, cx) - p.h;
    }
    else { p.x += p.ground.dx; p.y += p.ground.dy || 0; }
  }

  let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  // Hanging on a wall: touch a wall in mid-air to grab it; you then slide down it slowly until you land or
  // slip off its end. Jump + the other way wall-jumps; the other way alone just lets go (you drop)
  if (p.cling && (p.onGround || p.wall !== p.cling)) p.cling = 0;
  // Touching a wall in mid-air grabs it — no key needed (unless you're pressing away from it)
  if (!p.onGround && p.wall && dir !== -p.wall) p.cling = p.wall;
  // Wall jump: jump AND the other way while on (or close to) a wall. Forgiving on timing: being near the wall
  // counts, so does having just left it, and either press made a moment before the other is remembered.
  if (p.onGround) { p.wallT = 0; p.lastWall = null; }
  else {
    const nw = wallNear(p, WALL_REACH);
    if (nw) { p.wallSide = nw; p.wallId = nearWallId; p.wallT = WALL_COYOTE; }
  }
  if (inp.leftPressed) p.awayBuf = { d: -1, t: WALL_BUFFER };
  if (inp.rightPressed) p.awayBuf = { d: 1, t: WALL_BUFFER };
  if (inp.jumpPressed) p.wjBuf = WALL_BUFFER;
  // (not off the same wall twice in a row without landing, so you can't climb a single wall — any other
  // wall is fine, including the outside of a pillar on the same side)
  const away = dir === -p.wallSide || (p.awayBuf && p.awayBuf.t > 0 && p.awayBuf.d === -p.wallSide);
  const wallJump = !p.onGround && p.wallT > 0 && p.wjBuf > 0 && away && p.lastWall !== p.wallId;
  if (p.wallT > 0) p.wallT -= dt;
  if (p.wjBuf > 0) p.wjBuf -= dt;
  if (p.awayBuf) p.awayBuf.t -= dt;
  if (dir) p.face = dir;
  const accel = p.onGround ? 3200 : 2200;
  const tvx = dir * MAX_VX * p.speedMul;
  if (p.vx < tvx) p.vx = Math.min(tvx, p.vx + accel * dt);
  else if (p.vx > tvx) p.vx = Math.max(tvx, p.vx - accel * dt);

  if (inp.jumpPressed) p.buf = 0.13;
  // Pressed jump right after a plain spring bounce: upgrade it to the full launch
  if (p.springT > 0) {
    p.springT -= dt;
    if (inp.jumpPressed && p.vy < 0) superBounce(p, p.springPad);
  }
  p.buf -= dt;
  p.coyote = p.onGround ? 0.1 : p.coyote - dt;
  if (p.buf > 0 && p.coyote > 0) {
    p.vy = -JUMP_V; p.buf = 0; p.coyote = 0; p.onGround = false; p.ground = null; p.sq = 1.32;
    sfx.jump(p.i); jumpPuff(p);
  } else if (wallJump) {
    // Wall jump: up and away from the wall, toward the side you pressed
    const side = p.wallSide;
    p.vy = -WALLJUMP_V; p.vx = -side * WALLJUMP_PUSH; p.buf = 0; p.face = -side; p.sq = 1.2; p.cling = 0;
    p.wallT = 0; p.awayBuf = null; p.wjBuf = 0; p.lastWall = p.wallId;
    sfx.jump(p.i); jumpPuff(p, side);
  }
  if (inp.down && p.onGround && p.ground && !p.ground.isPlayer && p.ground.type !== 'ground' && !p.ground.noDrop) {
    p.dropT = 0.2; p.onGround = false; p.ground = null; p.y += 2;
  }
  p.dropT -= dt;

  // Gravity (heavier when jump is released early, for variable jump height)
  p.vy += GRAV * dt;
  if (!inp.jump && p.vy < 0 && !p.inBubbles) p.vy += GRAV * 1.4 * dt;
  p.vy = Math.min(p.vy, MAX_FALL);
  // Sliding down a wall you push against (or hang on) is slower
  if (!p.onGround && p.wall && (dir === p.wall || p.cling === p.wall) && p.vy > WALL_SLIDE) {
    p.vy = WALL_SLIDE;
    if (Math.random() < dt * 25) particles.push({ x: p.wall < 0 ? p.x : p.x + p.w, y: p.y + p.h - 4, vx: -p.wall * 30, vy: -20, life: 0.3, max: 0.3, color: airColor(p.y), size: 3.5, grav: 0, kind: 'dot' });
  }
  // Water region: inside a bubble column you're pushed up, no jump needed
  const cx = p.x + p.w / 2;
  p.inBubbles = bubbles.some(b => cx > b.x && cx < b.x + b.w && p.y + p.h > b.top && p.y < b.bot);
  if (p.inBubbles) {
    p.vy = Math.max(p.vy - BUBBLE_PUSH * dt, -BUBBLE_MAX);
    if (p.onGround) { p.onGround = false; p.ground = null; }
    if (Math.random() < dt * 20) particles.push({ x: cx + rand(-10, 10), y: p.y + p.h, vx: rand(-20, 20), vy: rand(-120, -60), life: 0.5, max: 0.5, color: '#ffffff', size: rand(4, 7), grav: -100, kind: 'ring' });
  }

  p.x += p.vx * dt;
  clampX(p);
  blockDividers(p);
  // Touching a wall (the tower's sides, or a pillar / dividing wall)? -1 = on the left, 1 = on the right
  p.wall = p.x <= WALL + 0.5 ? -1 : p.x + p.w >= W - WALL - 0.5 ? 1 : 0;
  for (const dv of dividers) {
    if (p.y + p.h <= dv.top || p.y >= dv.bot) continue;
    if (Math.abs(p.x - (dv.x + dv.w)) < 0.6) p.wall = -1;
    else if (Math.abs(p.x + p.w - dv.x) < 0.6) p.wall = 1;
  }

  const prevBottom = p.y + p.h, prevTop = p.y;
  p.y += p.vy * dt;
  const wasGround = p.onGround;
  p.onGround = false; p.ground = null;

  if (p.vy >= 0) {
    // One-way platforms
    if (p.dropT <= 0) {
      for (const pl of platforms) {
        if (pl.falling) continue;
        if (pl.type === 'tilt') {
          // Land on the sloping surface under the cube's middle (a little tolerance: the plank moves)
          const cx = p.x + p.w / 2;
          if (Math.abs(cx - pl.px) > pl.w / 2 * Math.cos(pl.angle) + 4) continue;
          const sy = tiltY(pl, cx);
          if (prevBottom <= sy + 10 && p.y + p.h >= sy) { land(p, pl, wasGround); p.y = sy - p.h; break; }
          continue;
        }
        if (p.x + p.w - 4 > pl.x && p.x + 4 < pl.x + pl.w && prevBottom <= pl.y + 1 && p.y + p.h >= pl.y) {
          land(p, pl, wasGround);
          break;
        }
      }
    }
    // Cubes don't collide with each other (no standing on heads): everyone climbs on their own
  }
  blockDividersY(p, prevTop, prevBottom);

  p.sq += (1 - p.sq) * Math.min(1, dt * 12);
  p.blink -= dt; if (p.blink < -0.12) p.blink = rand(2, 5);
}

function superBounce(p, pl) {
  p.vy = -SPRING_V; p.buf = 0; p.springT = 0; p.sq = 1.4;
  sfx.spring(); burst(pl.x + pl.w / 2, pl.y, 8, PAL.springD, 220, 0.5, 6);
  floatText('BOING!', p.x + p.w / 2, p.y - 20, PAL.springD, 28);
}

// On a spring: the pad (and the cube on it) sinks to its lowest point, the cube squashing, then the pad
// snaps back up and launches it. Jump pressed just before landing or during the press = the big boost;
// right after the launch there's still a short window for it (see springT).
function springPress(p, inp, dt) {
  const s = p.press, pl = s.pl;
  if (inp.jumpPressed) p.buf = 0.13;
  p.buf -= dt;
  s.t += dt;
  const k = Math.min(1, s.t / SPRING_DOWN), e = 1 - (1 - k) * (1 - k);   // eases into the bottom
  pl.comp = e;
  p.y = pl.y + e * SPRING_DEPTH - p.h;
  p.sq = 1 - 0.32 * e;
  p.blink -= dt;
  if (k < 1) return;
  // Launch: the pad springs up past its resting height and wobbles back
  p.press = null; pl.held = false; pl.cv = -26;
  p.onGround = false; p.ground = null; p.coyote = 0;
  if (p.buf > 0) superBounce(p, pl);
  else {
    p.vy = -JUMP_V; p.sq = 1.25;                   // a plain bounce, like a normal jump
    p.springT = 0.15; p.springPad = pl;            // short window to press jump for the boost
    sfx.boing();
  }
}

function land(p, pl, wasGround) {
  p.y = pl.y - p.h; p.onGround = true; p.ground = pl;
  if (pl.menu && !wasGround) touchLobby(p, pl);   // sound platform / colour pads
  if (pl.type === 'spring') {
    // The pad sinks under the cube first (springPress), then throws it up
    p.vy = 0; p.vx *= 0.5; p.press = { pl, t: 0 }; pl.held = true; pl.cv = 0;
    return;
  }
  if (!wasGround) {   // landing: squash and a spray of shapes, both by how hard you came down
    const k = clamp((p.vy - 150) / 1000, 0, 1);
    p.sq = 0.82 - 0.22 * k; sfx.land(k); landPuff(p, pl.y, k);
  }
  p.vy = 0;
}

function updateHazards(dt) {
  updateFireballs(dt);   // (js/obstacles/fireball.js)
  // Gems: picked up by touching them (each computer collects its own)
  for (const p of alive()) {
    if (p.remote) continue;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    for (const g of gems) {
      if (g.taken || Math.abs(g.x - cx) > p.w / 2 + GEM_R || Math.abs(g.y - cy) > p.h / 2 + GEM_R) continue;
      g.taken = true; runGems++; totalGems++; saveGems();
      burst(g.x, g.y, 10, '#5fd8e8', 180, 0.5, 5, 200);
      sfx.gem();
    }
  }
  for (const p of alive()) {
    if (p.remote) continue;
    const why = obstacleHit(p);   // (js/obstacles.js)
    if (why) die(p, why);
    if (state === 'over') return;
  }
}

// The race is won: slow motion and a zoom on the winner before the results (see FINALE in js/hud.js)
function startFinale() {
  overT = -FINALE;
  sfx.slowmo();
}

function updateParticles(dt) {
  if (!particles) return;
  for (const q of particles) { q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.vr) q.rot += q.vr * dt; }
  updateDeaths(dt);
  particles = particles.filter(q => q.life > 0);
  if (texts) { for (const t of texts) { t.t -= dt; t.y -= 40 * dt; } texts = texts.filter(t => t.t > 0); }
}

// The death camera (solo / co-op): when an obstacle gets you, the game freezes for DEATH_HOLD seconds and the
// camera zooms in on the moment of contact; then the cube bursts as usual while the camera eases back out.
// deathCam = { t, p, reason, x, y } while it runs (t keeps counting through the ease-out).
const DEATH_HOLD = 0.9, DEATH_ZOOM_IN = 0.18, DEATH_ZOOM_OUT = 0.4, DEATH_ZOOM = 2.3;
let deathCam = null;
const deathZoom = () => {
  if (!deathCam) return 0;
  const t = deathCam.t, ease = u => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
  return t < DEATH_HOLD ? ease(t / DEATH_ZOOM_IN) : 1 - ease((t - DEATH_HOLD) / DEATH_ZOOM_OUT);
};
function updateDeathCam(dt) {   // returns true while the game is frozen
  if (!deathCam) return false;
  const before = deathCam.t;
  deathCam.t += dt;
  if (before < DEATH_HOLD && deathCam.t >= DEATH_HOLD) { const d = deathCam; die(d.p, d.reason, true); }   // now it bursts
  if (deathCam && deathCam.t >= DEATH_HOLD + DEATH_ZOOM_OUT) deathCam = null;
  return !!deathCam && deathCam.t < DEATH_HOLD;
}

function die(p, reason, afterCam = false) {
  if (state === 'over' || p.dead) return;
  // Solo / co-op, hit by an obstacle: freeze and zoom in on it first (falling off the bottom has no contact moment)
  if (!afterCam && mode !== 'versus' && net.status !== 'playing' && !/^fell/.test(reason) && !deathCam) {
    deathCam = { t: 0, p, reason, x: p.x + p.w / 2, y: p.y + p.h / 2 };
    sfx.impact(); shake = 0;
    return;
  }
  if (net.status === 'playing' && !p.remote) relay({ k: 'd', i: p.i, r: reason });   // tell the other computer
  p.dead = true; p.outAt = ++outCount; shake = 0.35;
  deathMsg = `${p.name} ${reason}!`;
  sfx.die();
  const left = alive();
  knockOut(p);
  if (mode === 'versus' && left.length > 1) {
    // Knocked out, but the race goes on — and you keep watching until one is left
    floatText(net.status === 'playing' && !p.remote ? 'You’re out!' : `${p.name} is out!`, W / 2, camY + H * 0.5, p.dark, 34);
    return;
  }
  state = 'over'; overT = 0; ui.focus = 0;   // (the first button — PLAY AGAIN / READY — starts selected)
  if (mode === 'versus') { winner = left.length ? left[0].i : -1; if (winner >= 0) { wins[left[0].uid] = winsOf(left[0]) + 1; startFinale(); } }
  else if (height > best) { best = height; newBest = true; saveBest(); }
}

// The death animation: a burst of shapes in the cube's colours, and the cube itself pops up spinning, then
// tumbles down and away (from the bottom edge of the screen if it fell behind, so you see it go)
function knockOut(p) {
  const x = p.x + p.w / 2, y = Math.min(p.y + p.h / 2, camY + H - PS);
  burst(x, y, 26, p.color, 420, 1.0, 10);
  burst(x, y, 12, p.dark, 300, 0.8, 7);
  for (let k = 0; k < 3; k++)    // a few big rings flying out
    particles.push({ x, y, vx: rand(-160, 160), vy: rand(-260, -120), life: 0.9, max: 0.9, color: p.dark, size: rand(14, 20), grav: 300, kind: 'ring', rot: 0, vr: 0 });
  p.deathAnim = { x: x - p.w / 2, y: y - p.h / 2, vx: rand(-150, 150), vy: -760, rot: 0, vr: rand(7, 11) * (Math.random() < 0.5 ? -1 : 1), t: 0 };
  // whatever it wears flies off on its own: the hat higher and spinning, shades (that face) popping off sideways
  const fly = (dx, dy, vx, vy) => ({ x: x + dx, y: y + dy, vx, vy, rot: 0, vr: rand(-14, 14) });
  if (p.look && p.look.h) p.deathAnim.hat = fly(0, -p.h / 2, rand(-220, 220), -980);
  if (p.look && WORN_FACES.includes(p.look.f)) p.deathAnim.shades = fly(0, -p.h * 0.14 + 3, (Math.random() < 0.5 ? -1 : 1) * rand(160, 260), -620);
}
function updateDeaths(dt) {
  if (!players) return;
  for (const p of players) {
    const a = p.deathAnim;
    if (!a || a.t > 3) continue;
    a.t += dt;
    for (const o of [a, a.hat, a.shades]) if (o) { o.vy += GRAV * 0.75 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; }
  }
}

function toggleFullscreen() {
  try {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(() => {});   // the browser may refuse; that's fine
  } catch (e) {}
}
