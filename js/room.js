// RCS — The online room: a small scene where everyone in the room walks around together.
// Every computer's cubes are shown (yours full colour, the others softer). A computer is ready when all
// its cubes stand on the START platform; when every computer in the room is ready, the server starts
// the race. After a race everyone comes back here.
'use strict';

const START_W = 300;
let roomSent = null;          // the ready state we last told the server
let roomSendT = 0;

// Go to the room scene (after joining, or after a race)
function enterRoom() {
  if (net.status === 'playing') net.status = 'searching';   // the race is over for us: back in the room
  state = 'room'; ui.focus = 0; ui.help = false;
  W = ONLINE_W; resize();                                   // the same size on every computer
  camY = 0; time = time || 0; shake = 0; height = 0;
  particles = []; fireballs = []; warnings = []; texts = []; blades = []; jets = []; zaps = []; bubbles = []; dividers = [];
  platforms = [
    { id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, dy: 0, t: 0, falling: false },
    { id: 1, x: W / 2 - START_W / 2, y: GROUND_Y - ROW_GAP, w: START_W, h: 30, type: 'normal', menu: 'start', dx: 0, dy: 0, t: 0, falling: false },
  ];
  // A few platforms to hop around on while waiting
  [[0.18, 2], [0.32, 1], [0.68, 1], [0.82, 2], [0.25, 3], [0.75, 3]].forEach(([f, row], k) => {
    platforms.push({ id: 2 + k, x: W * f - 80, y: GROUND_Y - row * ROW_GAP, w: 160, h: 16, type: 'normal', dx: 0, dy: 0, t: 0, falling: false });
  });
  // Your cubes: player 1 (WASD) and player 2 (arrow keys) if you're two on this computer
  players = [];
  for (let j = 0; j < net.local; j++) {
    const p = mkPlayer(j, W / 2 - 300 - j * 60);
    p.slot = j; p.uid = 'me:' + j;
    players.push(p);
  }
  roomSent = null; roomSendT = 0;
  if (net.room) syncRoomCubes();
}

// Make the other computers' cubes match the room list (keeping the ones already there)
function syncRoomCubes() {
  const R = net.room;
  if (!R || state !== 'room') return;
  const want = [];
  R.players.forEach((m, k) => {
    if (k === R.me || m.racing) return;     // you, and anyone still in a race, aren't walking around here
    m.colors.forEach((ci, j) => want.push({ uid: m.id + ':' + j, ci, name: j === 0 && m.name ? m.name : COLORS[ci].name }));
  });
  const mine = players.filter(p => !p.remote);
  const old = Object.fromEntries(players.filter(p => p.remote).map(p => [p.uid, p]));
  const others = want.map((w, k) => {
    let p = old[w.uid];
    if (!p) {
      p = mkPlayer(net.local + k, W / 2, w.ci);
      p.remote = true; p.uid = w.uid; p.dead = true;     // hidden until we hear where it is
      p.color = soften(p.color); p.dark = soften(p.dark, 0.5);
    }
    p.name = w.name;
    return p;
  });
  players = [...mine, ...others];
  players.forEach((p, i) => { p.i = i; });
}

// Positions from another computer in the room
function onRoomPeer(d, from) {
  if (state !== 'room' || d.k !== 'r') return;
  for (const s of d.p || []) {
    const r = players.find(p => p.remote && p.uid === from + ':' + s.j);
    if (!r) continue;
    r.net = { x: s.x, y: s.y, vx: s.vx, vy: s.vy, g: s.g, age: 0 };
    r.face = s.f; r.sq = s.q;
    if (r.dead) { r.dead = false; r.x = s.x; r.y = s.y; }
  }
}

const startPlatform = () => platforms.find(p => p.menu === 'start');
// Ready = standing (on START, or piled on other cubes on top of it) anywhere in the area above START
const onStart = p => {
  const s = startPlatform(), cx = p.x + p.w / 2;
  return !p.dead && p.onGround && cx >= s.x && cx <= s.x + s.w && p.y + p.h <= s.y + 2;
};

function updateRoom(dt) {
  time += dt;
  if (net.bannerT > 0) net.bannerT -= dt;
  const click = ui.click; ui.click = null;
  if (pressed.Escape || (click && layoutButtons().some(b => b.id === 'cancel' && inside(b, click.x, click.y)))) { leaveOnline(); return; }
  if (click && cornerIcons().some(b => inside(b, click.x, click.y))) toggleMute();
  if (pressed.Enter && !chatOpen()) openChat();     // chat (js/chat.js)

  updateWorld(dt);
  for (const p of players) p.remote ? updateRemote(p, dt) : updatePlayer(p, dt);
  updateParticles(dt);

  // Ready = all of this computer's cubes are on START. Tell the server when that changes.
  const ready = players.filter(p => !p.remote).every(onStart);
  if (ready !== roomSent) {
    roomSent = ready;
    netSend({ t: 'ready', on: ready });
    if (ready) sfx.beep(660);
  }
  // Tell the others in the room where our cubes are (~20 times a second)
  roomSendT -= dt;
  if (roomSendT <= 0) {
    roomSendT = 1 / 20;
    const r1 = v => Math.round(v * 10) / 10;
    relay({ k: 'r', p: players.filter(p => !p.remote).map(p => ({ j: p.slot, x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), g: p.onGround, f: p.face, q: Math.round(p.sq * 100) / 100 })) });
  }
}

// START platform: its name, and how many computers are on it
function drawStartPlatform(p) {
  ctx.fillStyle = PAL.move; ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = PAL.moveD; ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);
  text('START', p.x + p.w / 2, p.y + 21, 18, PAL.ink, 'center', 900);
  const R = net.room;
  if (!R) return;
  const here = R.players.filter(m => !m.racing), n = here.filter(m => m.ready).length;
  text(`${n} / ${here.length} on START`, p.x + p.w / 2, p.y - 14, 14, n ? PAL.good : PAL.inkSoft, 'center', 900);
}

// Room screen text: title, who we're waiting for, and everyone in the room
function drawRoomHUD() {
  ctx.save(); ctx.translate(0, -OY);
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 12;
  text('ROOM', W / 2, 92, 56, PAL.ink, 'center', 900);
  text(roomLine(), W / 2, 128, 18, PAL.good, 'center', 900);
  ctx.restore();
  const R = net.room;
  if (R) {
    const x = WALL + 20, top = 24, rh = 26;
    text(`PLAYERS  ${R.players.reduce((n, m) => n + m.colors.length, 0)}/${R.max}`, x, top + 14, 13, PAL.inkSoft, 'left', 900);
    R.players.forEach((m, k) => {
      const y = top + 26 + k * rh;
      m.colors.forEach((ci, j) => {
        const C = COLORS[ci];
        ctx.fillStyle = C.d; ctx.fillRect(x + j * 20, y, 16, 16);
        ctx.fillStyle = C.c; ctx.fillRect(x + j * 20 + 2, y + 2, 12, 12);
      });
      const nm = m.name || m.colors.map(ci => COLORS[ci].name).join(' & ');
      const tagTxt = m.racing ? '  racing' : m.ready ? '  ✓' : '';
      text(nm + (k === R.me ? ' (you)' : '') + tagTxt, x + m.colors.length * 20 + 8, y + 13, 14, m.ready ? PAL.good : PAL.ink, 'left', 800);
    });
  }
  ctx.restore();
  const keysTxt = net.local === 2 ? `${COLORS[localColor(0)].name.toUpperCase()}: W A S D   ·   ${COLORS[localColor(1)].name.toUpperCase()}: ARROW KEYS` : 'W A S D or arrow keys';
  drawChatLog(); drawChatBubbles();
  text('Everyone gets on START (piling up on top is fine) to begin  ·  Enter to chat  ·  Esc leaves the room', W / 2, GROUND_Y + 28, 14, PAL.inkSoft, 'center', 800);
  text(keysTxt, W / 2, GROUND_Y + 54, 14, localCube(0).d, 'center', 900);
  drawBanner(150);
}
