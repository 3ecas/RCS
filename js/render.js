// RCS — Drawing the world: background, walls, platforms, hazards and players.
'use strict';

function bgAt(m) {
  const f = Math.max(0, m) / 130, i = Math.floor(f) % BG.length, j = (i + 1) % BG.length;
  const t = clamp((f - Math.floor(f) - 0.6) / 0.4, 0, 1);
  return [mixHex(BG[i][0], BG[j][0], t), mixHex(BG[i][1], BG[j][1], t)];
}

function drawBackground() {
  const [top, bot] = bgAt(heightM(camY + H / 2));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Soft floating squares (parallax)
  const span = H * 2;
  for (let k = 0; k < 14; k++) {
    const s = 30 + hash(k, 3) * 90;
    const x = WALL + hash(k, 1) * (W - 2 * WALL);
    let y = (hash(k, 2) * span - camY * 0.25) % span;
    if (y < 0) y += span;
    y -= s;
    if (y > H) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hash(k, 4) * 0.8 + time * 0.05 * (hash(k, 5) - 0.5));
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

function drawWalls() {
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(0, camY, WALL, H); ctx.fillRect(W - WALL, camY, WALL, H);
  ctx.fillStyle = PAL.wallLine;
  ctx.fillRect(WALL - 3, camY, 3, H); ctx.fillRect(W - WALL, camY, 3, H);
  // Height markers every 25 m
  ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center';
  const mTop = Math.ceil(heightM(camY + H) / 25) * 25, mMax = heightM(camY);
  for (let mm = Math.max(25, mTop); mm <= mMax; mm += 25) {
    const y = GROUND_Y - mm * PX_PER_M;
    ctx.fillStyle = PAL.wallLine;
    ctx.fillRect(8, y - 1, WALL - 16, 2); ctx.fillRect(W - WALL + 8, y - 1, WALL - 16, 2);
    ctx.fillStyle = PAL.inkSoft;
    ctx.fillText(mm + 'm', WALL / 2, y - 6); ctx.fillText(mm + 'm', W - WALL / 2, y - 6);
  }
  if (best > 0 && mode !== 'versus') {
    const y = GROUND_Y - best * PX_PER_M;
    if (y > camY - 10 && y < camY + H + 10) {
      ctx.setLineDash([8, 8]); ctx.strokeStyle = PAL.good; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(WALL, y); ctx.lineTo(W - WALL, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = PAL.good; ctx.textAlign = 'left'; ctx.font = `800 13px ${FONT}`;
      ctx.fillText('BEST ' + best + 'm', WALL + 8, y - 6);
    }
  }
}

function drawPlatform(p) {
  if (p.y < camY - 60 || p.y > camY + H + 80) return;
  const y = p.y;
  if (p.type === 'ground') {
    ctx.fillStyle = PAL.ground; ctx.fillRect(p.x, y, p.w, p.h);
    ctx.fillStyle = PAL.groundD; ctx.fillRect(p.x, y, p.w, 5);
    ctx.fillStyle = PAL.inkSoft; ctx.font = `700 16px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('START', W / 2, y + 40);
    return;
  }
  let x = p.x;
  if (p.crumbleT >= 0 && !p.falling) x += rand(-2, 2);
  const colors = { normal: [PAL.normal, PAL.normalD], move: [PAL.move, PAL.moveD], crumble: [PAL.crumble, PAL.crumbleD], spring: [PAL.spring, PAL.springD] };
  const [c, cd] = colors[p.type];

  if (p.type === 'move') {
    // faint track showing how far it slides
    ctx.fillStyle = 'rgba(127,207,176,0.35)';
    ctx.fillRect(p.baseX - p.amp, y + p.h / 2 - 1, p.w + 2 * p.amp, 2);
  }
  if (p.type === 'crumble') {
    ctx.globalAlpha = p.falling ? 0.6 : 1;
    const n = Math.max(2, Math.round(p.w / 26)), bw = p.w / n;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = c; ctx.fillRect(x + k * bw + 1.5, y, bw - 3, p.h);
      ctx.fillStyle = cd; ctx.fillRect(x + k * bw + 1.5, y + p.h - 4, bw - 3, 4);
    }
    ctx.globalAlpha = 1;
  } else if (p.type === 'spring') {
    drawSpringI(x, y, p.w, p.bounceT > 0 ? 5 : 0);
  } else {
    ctx.fillStyle = c; ctx.fillRect(x, y, p.w, p.h);
    ctx.fillStyle = cd; ctx.fillRect(x, y + p.h - 4, p.w, 4);
  }

  if (p.spikes) {
    const x0 = x + p.spikes.x0, len = p.spikes.x1 - p.spikes.x0;
    const n = Math.max(1, Math.floor(len / 11)), sw = len / n;
    ctx.fillStyle = PAL.spike;
    for (let k = 0; k < n; k++) {
      ctx.beginPath(); ctx.moveTo(x0 + k * sw, y); ctx.lineTo(x0 + k * sw + sw / 2, y - 11); ctx.lineTo(x0 + (k + 1) * sw, y); ctx.closePath(); ctx.fill();
    }
  }
}

// Spring shaped like an "I": top bar you land on, a short post, and a bottom bar.
// `sq` pushes the top bar down while it's bouncing.
function drawSpringI(x, y, w, sq) {
  ctx.fillStyle = PAL.springD;
  ctx.fillRect(x + 4, y + 16, w - 8, 6);                 // bottom bar
  ctx.fillRect(x + w / 2 - 5, y + 6 + sq, 10, 10 - sq);  // post
  ctx.fillStyle = PAL.spring;
  ctx.fillRect(x, y + sq, w, 7);                         // top bar
  ctx.fillStyle = PAL.springD;
  ctx.fillRect(x, y + sq + 5, w, 2);
}

function drawBlade(b) {
  if (b.y < camY - 40 || b.y > camY + H + 40) return;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(b.ang);
  ctx.fillStyle = PAL.blade;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const r = k % 2 ? b.r * 0.38 : b.r;
    const a = k * Math.PI / 4;
    k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(r, 0);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
  ctx.restore();
  // faint patrol track
  ctx.fillStyle = 'rgba(108,91,123,0.12)';
  ctx.fillRect(b.lo, b.y - 1, b.hi - b.lo, 2);
}

function drawJet(j) {
  if (j.y < camY - 40 || j.y > camY + H + 40) return;
  const s = jetState(j), L = j.side === 'L';
  const wallX = L ? WALL : W - WALL;
  // nozzle on the wall
  ctx.fillStyle = s ? PAL.flame : PAL.nozzle;
  ctx.fillRect(L ? WALL - 12 : W - WALL, j.y - 9, 12, 18);
  if (s === 1 && Math.floor(time * 12) % 2) {
    ctx.fillStyle = 'rgba(255,154,118,0.6)';
    ctx.fillRect(L ? wallX : wallX - 14, j.y - 4, 14, 8);
  }
  if (s === 2) {
    const len = JET_LEN * (0.92 + 0.08 * Math.sin(time * 30));
    const g = ctx.createLinearGradient(wallX, 0, L ? wallX + len : wallX - len, 0);
    g.addColorStop(0, PAL.flame2); g.addColorStop(0.5, PAL.flame); g.addColorStop(1, 'rgba(255,154,118,0)');
    ctx.fillStyle = g;
    ctx.fillRect(L ? wallX : wallX - len, j.y - 11, len, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(L ? wallX : wallX - len * 0.5, j.y - 3, len * 0.5, 6);
  }
}

function drawPlayer(p) {
  if (p.dead) return;
  const sx = 1 / Math.sqrt(p.sq), sy = p.sq;
  const w = p.w * sx, h = p.h * sy;
  const x = p.x + p.w / 2 - w / 2, y = p.y + p.h - h;
  ctx.fillStyle = p.dark; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = p.color; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  // eyes
  const ex = x + w / 2 + p.face * 5, ey = y + h * 0.36;
  ctx.fillStyle = PAL.ink;
  const eh = p.blink < 0 ? 2 : 7;
  ctx.fillRect(ex - 8, ey, 4, eh); ctx.fillRect(ex + 4, ey, 4, eh);
}

function render() {
  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);
  drawBackground();

  ctx.save();
  ctx.translate(0, -camY);
  for (const p of platforms) drawPlatform(p);
  for (const b of blades) drawBlade(b);
  for (const p of players) drawPlayer(p);
  for (const f of fireballs) {
    ctx.fillStyle = 'rgba(255,140,105,0.25)'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 1.8, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.fire; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
  }
  for (const q of particles) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  drawWalls();
  for (const j of jets) drawJet(j);
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = clamp(t.t, 0, 1);
    ctx.font = `900 ${t.size}px ${FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineJoin = 'round';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Fireball warnings at the top edge
  for (const w of warnings) {
    if (Math.floor(w.t * 10) % 2) continue;
    ctx.fillStyle = PAL.fire;
    ctx.beginPath(); ctx.moveTo(w.x, 14); ctx.lineTo(w.x - 13, 36); ctx.lineTo(w.x + 13, 36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `900 14px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('!', w.x, 33);
  }

  // Danger glow when someone is near the bottom
  if (state === 'play' && camY < -40) {
    let danger = 0;
    for (const p of alive()) danger = Math.max(danger, (p.y - (camY + H * 0.72)) / (H * 0.28));
    danger = clamp(danger, 0, 1);
    if (danger > 0) {
      const g = ctx.createLinearGradient(0, H, 0, H - 150);
      g.addColorStop(0, `rgba(255,123,156,${0.45 * danger * (0.7 + 0.3 * Math.sin(time * 12))})`); g.addColorStop(1, 'rgba(255,123,156,0)');
      ctx.fillStyle = g; ctx.fillRect(0, H - 150, W, 150);
    }
  }
  ctx.restore();
  drawHUD();
}

function text(str, x, y, size, color, align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align;
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}

function cube(x, y, s, P) {
  ctx.fillStyle = P.d; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = P.c; ctx.fillRect(x + s * 0.09, y + s * 0.09, s * 0.82, s * 0.82);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x + s * 0.3, y + s * 0.36, s * 0.12, s * 0.2); ctx.fillRect(x + s * 0.6, y + s * 0.36, s * 0.12, s * 0.2);
}
