// RCS — The game rules: update loop, player movement, hazards and deaths.
'use strict';

function update(dt) {
  if (pressed.KeyM) toggleMute();
  if (pressed.KeyF) toggleFullscreen();

  // Menus and end/pause screens are driven by buttons (mouse or keyboard)
  if (state === 'found') {       // "Match found!" — then the countdown
    time += dt; foundT -= dt;
    if (foundT <= 0) { state = 'count'; sfx.beep(440); }
    return;
  }
  if (state === 'title' || state === 'paused' || state === 'search' || state === 'over') {
    time += dt;
    if (state !== 'paused') updateParticles(dt);
    if (state === 'over') { overT += dt; shake = Math.max(0, shake - dt); reportRoundOver(); }
    if (net.bannerT > 0) net.bannerT -= dt;
    if (state === 'paused' && pressed.KeyR) { startGame(); return; }   // R again: start over
    if (pressed.Escape && state !== 'paused') { escAction(); return; }
    menuInput();
    return;
  }
  gameClicks();   // the sound icon
  // R stops the game (stop menu). Not online — the other computers' games can't be stopped.
  if (pressed.KeyR && net.status !== 'playing') { pausedFrom = state; state = 'paused'; ui.focus = 0; return; }

  time += dt;
  if (state === 'count') {
    const before = Math.ceil(countdown);
    countdown -= dt;
    const after = Math.ceil(countdown);
    if (after !== before) {
      if (after > 0) sfx.beep(440);
      else { sfx.beep(880); state = 'play'; floatText('GO!', W / 2, camY + H * 0.4, PAL.good); }
    }
  }

  // Camera: constant climb that speeds up, plus catch-up when players climb fast
  if (state === 'play') {
    const camM = Math.max(0, heightM(camY + H));
    scrollSpeed = Math.min(38 + camM * 0.4, 200);
    camY -= scrollSpeed * dt;
  }
  const topY = Math.min(...alive().map(p => p.y));
  const target = topY - H * 0.38;
  if (target < camY) camY += (target - camY) * Math.min(1, 5 * dt);

  generate();
  updateWorld(dt);
  // In versus nobody moves until the countdown hits GO, so it's a fair start
  if (!(mode === 'versus' && state === 'count')) {
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

  for (const p of alive()) p.best = Math.max(p.best, Math.floor(heightM(p.y + PS)));
  const h = Math.max(0, Math.floor(heightM(topY + PS)));
  if (h > height) {
    height = h;
    if (height >= nextMilestone) {
      floatText(nextMilestone + ' m!', W / 2, camY + H * 0.3);
      sfx.milestone();
      nextMilestone += 50;
    }
  }

  for (const p of alive()) {
    if (p.remote) continue;          // their computer decides when they fall
    if (p.y > camY + H + 10) die(p, mode === 'versus' ? 'fell behind' : 'fell off the tower');
    if (state === 'over') return;
  }
}

function updateWorld(dt) {
  for (const p of platforms) {
    p.t += dt;
    const ox = p.x;
    if (p.type === 'move') p.x = p.baseX + Math.sin(p.t * p.spd) * p.amp;
    if (p.crumbleT >= 0 && !p.falling) {
      p.crumbleT -= dt;
      if (p.crumbleT <= 0) {
        p.falling = true; sfx.crumble();
        burst(p.x + p.w / 2, p.y + 8, 6, PAL.crumbleD, 120, 0.5, 6);
      }
    }
    if (p.falling) { p.vy += GRAV * 0.6 * dt; p.y += p.vy * dt; }
    if (p.bounceT > 0) p.bounceT -= dt;
    p.dx = p.x - ox;
  }
  for (const b of blades) {
    b.x += b.vx * dt;
    if (b.x < b.lo) { b.x = b.lo; b.vx = -b.vx; }
    if (b.x > b.hi) { b.x = b.hi; b.vx = -b.vx; }
    b.ang += dt * 9 * Math.sign(b.vx);
  }
  for (const j of jets) {
    j.t += dt;
    const s = jetState(j);
    if (s === 2 && j.last !== 2 && j.y > camY && j.y < camY + H) sfx.flame();
    j.last = s;
  }
  const cut = camY + H + 250;
  platforms = platforms.filter(p => p.y < cut);
  blades = blades.filter(b => b.y < cut);
  jets = jets.filter(j => j.y < cut);
}

// One player per computer: WASD or the arrow keys both work
function humanInput() {
  const a = CONTROLS[0], b = CONTROLS[1];
  return { left: keys[a.left] || keys[b.left], right: keys[a.right] || keys[b.right], jump: keys[a.jump] || keys[b.jump],
           jumpPressed: pressed[a.jump] || pressed[b.jump], down: pressed[a.down] || pressed[b.down] };
}

function updatePlayer(p, dt) {
  const inp = humanInput();
  p.prevX = p.x; p.prevY = p.y;

  // Ride whatever we're standing on
  if (p.onGround && p.ground) {
    if (p.ground.falling) { p.onGround = false; p.ground = null; }
    else p.x += p.ground.isPlayer ? (p.ground.ref.x - p.ground.ref.prevX) : p.ground.dx;
  }

  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
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
    p.vy = -JUMP_V; p.buf = 0; p.coyote = 0; p.onGround = false; p.ground = null; p.sq = 1.25;
    sfx.jump(p.i); dust(p.x + p.w / 2, p.y + p.h);
  }
  if (inp.down && p.onGround && p.ground && !p.ground.isPlayer && p.ground.type !== 'ground') {
    p.dropT = 0.2; p.onGround = false; p.ground = null; p.y += 2;
  }
  p.dropT -= dt;

  // Gravity (heavier when jump is released early, for variable jump height)
  p.vy += GRAV * dt;
  if (!inp.jump && p.vy < 0) p.vy += GRAV * 1.4 * dt;
  p.vy = Math.min(p.vy, MAX_FALL);

  p.x += p.vx * dt;
  if (p.x < WALL) { p.x = WALL; p.vx = 0; }
  if (p.x + p.w > W - WALL) { p.x = W - WALL - p.w; p.vx = 0; }

  const prevBottom = p.y + p.h;
  p.y += p.vy * dt;
  const wasGround = p.onGround;
  p.onGround = false; p.ground = null;

  if (p.vy >= 0) {
    // One-way platforms
    if (p.dropT <= 0) {
      for (const pl of platforms) {
        if (pl.falling) continue;
        if (p.x + p.w - 4 > pl.x && p.x + 4 < pl.x + pl.w && prevBottom <= pl.y + 1 && p.y + p.h >= pl.y) {
          land(p, pl, wasGround);
          break;
        }
      }
    }
    // Stand on another player's head
    for (const o of players) {
      if (p.onGround) break;
      if (o === p || o.dead) continue;
      if (p.x + p.w - 6 > o.x && p.x + 6 < o.x + o.w && prevBottom <= Math.max(o.y, o.prevY) + 2 && p.y + p.h >= o.y) {
        p.y = o.y - p.h; p.vy = 0; p.onGround = true;
        p.ground = { isPlayer: true, ref: o, falling: false };
        if (!wasGround) { p.sq = 0.78; sfx.land(); }
      }
    }
  }

  p.sq += (1 - p.sq) * Math.min(1, dt * 12);
  p.blink -= dt; if (p.blink < -0.12) p.blink = rand(2, 5);
}

function superBounce(p, pl) {
  p.vy = -SPRING_V; p.buf = 0; p.springT = 0; p.sq = 1.4;
  sfx.spring(); burst(pl.x + pl.w / 2, pl.y, 8, PAL.springD, 220, 0.5, 6);
  floatText('BOING!', p.x + p.w / 2, p.y - 20, '#d9b42e', 28);
}

function land(p, pl, wasGround) {
  p.y = pl.y - p.h; p.onGround = true; p.ground = pl;
  if (pl.type === 'spring') {
    p.onGround = false; p.ground = null; pl.bounceT = 0.25;
    if (p.buf > 0) {
      superBounce(p, pl);                     // jump pressed just before landing
    } else {
      p.vy = -JUMP_V; p.sq = 1.2;             // plain bounce, like a normal jump
      p.springT = 0.15; p.springPad = pl;     // short window to press jump for the boost
      tone(220, 500, 0.15, 'sine', 0.06);
    }
    return;
  }
  if (!wasGround) { p.sq = 0.75; sfx.land(); dust(p.x + p.w / 2, pl.y); }
  p.vy = 0;
  if (pl.type === 'crumble' && pl.crumbleT < 0) {
    pl.crumbleT = 0.7;
    if (net.status === 'playing') relay({ k: 'c', id: pl.id });
  }
}

function updateHazards(dt) {
  const m = heightM(camY);
  const fd = ramp(m, unlock.fireball, 300);
  // Online, only Player 1's computer decides fireballs and tells the other one
  if (state === 'play' && m >= unlock.fireball && !(net.status === 'playing' && net.me !== 0)) {
    fireTimer -= dt;
    if (fireTimer <= 0) {
      fireTimer = rand(lerp(7, 1.8, fd), lerp(10, 3.5, fd));
      const x = Math.round(rand(WALL + 20, W - WALL - 20));
      warnings.push({ x, t: 1.1 });
      if (net.status === 'playing') relay({ k: 'f', x });
    }
  }
  for (const w of warnings) {
    w.t -= dt;
    if (w.t <= 0) { fireballs.push({ x: w.x, y: camY - 40, vy: 360 + fd * 260, r: 13 }); sfx.fireball(); }
  }
  warnings = warnings.filter(w => w.t > 0);
  for (const f of fireballs) { f.vy += 250 * dt; f.y += f.vy * dt; }
  fireballs = fireballs.filter(f => f.y < camY + H + 80);

  const circleHit = (p, cx, cy, r) => {
    const nx = clamp(cx, p.x + 3, p.x + p.w - 3), ny = clamp(cy, p.y + 3, p.y + p.h);
    return (nx - cx) ** 2 + (ny - cy) ** 2 < r * r;
  };
  const hazardHit = p => {
    const px0 = p.x + 4, px1 = p.x + p.w - 4, py0 = p.y + 4, py1 = p.y + p.h;
    for (const pl of platforms) {
      if (!pl.spikes || pl.y < camY - 150 || pl.y > camY + H + 50) continue;
      const x0 = pl.x + pl.spikes.x0 + 3, x1 = pl.x + pl.spikes.x1 - 3;
      if (px1 > x0 && px0 < x1 && py1 > pl.y - 9 && py0 < pl.y) return 'got spiked';
    }
    for (const b of blades) if (circleHit(p, b.x, b.y, b.r - 5)) return 'was hit by a shuriken';
    for (const j of jets) {
      if (jetState(j) !== 2) continue;
      const [x0, x1] = jetRect(j);
      if (px1 > x0 + 4 && px0 < x1 - 8 && py1 > j.y - 10 && py0 < j.y + 10) return 'got burned';
    }
    for (const f of fireballs) if (circleHit(p, f.x, f.y, f.r - 2)) return 'was hit by a fireball';
    return null;
  };
  for (const p of alive()) {
    if (p.remote) continue;
    const why = hazardHit(p);
    if (why) die(p, why);
    if (state === 'over') return;
  }
}

function updateParticles(dt) {
  if (!particles) return;
  for (const q of particles) { q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  particles = particles.filter(q => q.life > 0);
  if (texts) { for (const t of texts) { t.t -= dt; t.y -= 40 * dt; } texts = texts.filter(t => t.t > 0); }
}

function die(p, reason) {
  if (state === 'over' || p.dead) return;
  if (net.status === 'playing' && !p.remote) relay({ k: 'd', i: p.i, r: reason });   // tell the other computer
  p.dead = true; p.outAt = ++outCount; shake = 0.35;
  deathMsg = `${p.name} ${reason}!`;
  sfx.die();
  const left = alive();
  if (mode === 'versus' && left.length > 1) {
    // Knocked out, but the race goes on — and you keep watching until one is left
    const cy = Math.min(p.y + p.h / 2, camY + H - 20);
    burst(p.x + p.w / 2, cy, 18, p.color, 360, 0.9, 9);
    floatText(p.remote ? `${p.name} is out!` : 'You’re out!', W / 2, camY + H * 0.5, p.dark, 34);
    return;
  }
  state = 'over'; overT = 0;
  const cy = Math.min(p.y + p.h / 2, camY + H - 20);
  burst(p.x + p.w / 2, cy, 18, p.color, 360, 0.9, 9);
  burst(p.x + p.w / 2, cy, 8, p.dark, 260, 0.7, 6);
  if (mode === 'versus') { winner = left.length ? left[0].i : -1; if (winner >= 0) wins[left[0].uid] = winsOf(left[0]) + 1; }
  else if (height > best) { best = height; newBest = true; saveBest(); }
}

function toggleFullscreen() {
  try {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(() => {});   // the browser may refuse; that's fine
  } catch (e) {}
}
