// RCS — Online play: talking to the matchmaking server and syncing the other player.
'use strict';

// Where the online server lives. When the game is opened from the Render server itself (or a test
// server on this computer) it connects back to that address; everywhere else — GitHub Pages, or
// index.html opened from disk — it connects to SERVER_URL.
const SERVER_URL = 'wss://rcs-d5wp.onrender.com/ws';
// me: which computer we are in the race. roster: every cube's colour, owner and name.
// room: the shared room (who's in it, who's ready). round: which race in the room this is;
// sentOver: told the server this race has ended.
const PROTOCOL = 20;   // must match the server's; an outdated copy of the game is told to refresh
const net = { ws: null, status: 'off', me: 0, local: 1, roster: null, room: null, round: 0, sentOver: false, sendT: 0, banner: '', bannerT: 0 };

function netUrl() {
  const h = location.hostname;
  const ownServer = h.endsWith('.onrender.com') || h === 'localhost' || h === '127.0.0.1';
  if (ownServer && (location.protocol === 'http:' || location.protocol === 'https:'))
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  return SERVER_URL;
}

// Free Render servers fall asleep when nobody is playing. Knock on the door as soon as the page opens,
// so the server is usually awake by the time someone clicks Multiplayer.
(function wakeServer() {
  try {
    const health = netUrl().replace(/^ws/, 'http').replace(/\/ws$/, '/health');
    fetch(health, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
  } catch (e) {}
})();
function netSend(obj) { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(obj)); }
function relay(d) { netSend({ t: 'relay', d }); }
function netBanner(text) { net.banner = text; net.bannerT = 5; }

function netClose() {
  clearTimeout(net.retry);
  const ws = net.ws;
  net.ws = null; net.status = 'off';
  if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }
}

// Start searching for a random game. If the server can't be reached (e.g. it's still waking up), keep retrying
// every few seconds for about a minute before giving up.
const RETRY_FOR_MS = 75000;
function startSearch() {
  netClose();
  state = 'search'; net.room = null;
  chat.log = []; chat.bubbles = {};
  net.local = playerCount;       // cubes from this computer: 1, or 2 (WASD + arrow keys)
  net.searchStart = performance.now();
  connectOnce();
}

function connectOnce() {
  net.status = 'connecting';
  let ws;
  try { ws = new WebSocket(netUrl()); } catch (e) { netBanner('Could not reach the online server'); toMenu(); return; }
  net.ws = ws;
  let opened = false;
  // Tell the server our cube colours, so it can prefer partners with different colours
  const colors = [], looks = [];
  for (let k = 0; k < net.local; k++) { colors.push(localColor(k)); looks.push(localLook(k)); }
  ws.onopen = () => { opened = true; net.status = 'searching'; netSend({ t: 'find', v: PROTOCOL, colors, looks, name: '' }); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onNet(m); };
  ws.onclose = () => {
    if (net.ws !== ws) return;
    net.ws = null;
    if (!opened && state === 'search' && performance.now() - net.searchStart < RETRY_FOR_MS) {
      net.retry = setTimeout(() => { if (state === 'search' && !net.ws) connectOnce(); }, 3000);
      return;
    }
    const wasPlaying = net.status === 'playing';
    net.status = 'off';
    netBanner(wasPlaying ? 'Connection lost' : 'Could not reach the online server');
    toMenu();
  };
}

function leaveOnline() {
  const fromRoom = state === 'room';
  pendingStart = null; pendingRoom = 0; iris = null; netSend({ t: 'leave' }); netClose();
  // from the room: the circle closes on your cube there and opens on your cube back in the lobby
  if (fromRoom) startIris(0.3, myCubeOnScreen(), myCubeOnScreen, toMenu);
  else toMenu();
}

// The room: am I ready (for the rematch)? Toggle it.
const meInRoom = () => net.room && net.room.players[net.room.me];
const iAmReady = () => !!(meInRoom() && meInRoom().ready);
function toggleReady() { netSend({ t: 'ready', on: !iAmReady() }); sfx.beep(iAmReady() ? 400 : 660); }
// Name to show for a room member (their colour if they didn't type one)
const roomName = p => p.name || p.colors.map(ci => COLORS[ci].name).join(' & ');

// Our race has ended: tell the server once, so the room can start the next round
function reportRoundOver() {
  if (net.status !== 'playing' || net.sentOver) return;
  net.sentOver = true;
  netSend({ t: 'roundOver', round: net.round });
}

// Circle transitions for online play: the circle closes on one spot, the next scene is set up, and it
// opens again on another spot (iris: { t, close, open, from: [x, y], to: () => [x, y] }, screen coordinates).
//  - connecting -> room: closes on your bouncing cube, opens on your cube in the room
//  - room -> race: closes on the START platform, opens on the 'Match found' cubes. The 'Match found' screen
//    is shortened by the closing time, so the countdown still ends together on every computer; anything else
//    for the race that arrives meanwhile sets it up at once.
const RACE_IRIS = 0.4, ROOM_IRIS = 0.3;
let pendingStart = null, pendingRoom = 0, iris = null;
// action: run once the circle has closed (the scene holds still until then); returns true while holding
function startIris(close, from, to, action = null) { iris = { t: 0, close, open: 0.55, from, to, action }; sfx.swoosh(); }
function updateRaceStart(dt) {
  if (iris) {
    iris.t += dt;
    if (iris.action && iris.t >= iris.close) { const a = iris.action; iris.action = null; a(); }
    else if (iris.action) return true;
    if (iris.t > iris.close + iris.open) iris = null;
  }
  if (pendingStart && (pendingStart.t += dt) >= RACE_IRIS) applyStart(pendingStart.m, pendingStart.t);
  if (pendingRoom && (pendingRoom += dt) >= ROOM_IRIS) { pendingRoom = 0; if (state === 'search') enterRoom(); }
}
function applyStart(m, late) {
  pendingStart = null;
  startWipe();                       // (from the results: the stripes sweep away)
  reset(m.seed);
  // Show "Match found!" first, then the 3-2-1 countdown (both computers start together)
  const total = m.startIn / 1000 - late;
  foundT = Math.max(0.3, Math.min(1.5, total - 1));
  countdown = total - foundT;
  state = 'found'; sfx.milestone();
}
function drawIris() {
  if (!iris) return;
  const t = iris.t, Rmax = Math.hypot(VW, VH), closing = t < iris.close;
  const u = closing ? t / iris.close : clamp((t - iris.close) / iris.open, 0, 1);
  const r = Math.max(0.1, Rmax * (closing ? Math.pow(1 - u, 2.2) : Math.pow(u, 2.2)));
  const [cx, cy] = closing ? iris.from : iris.to();
  ctx.fillStyle = SOFT.lilac[0];
  ctx.beginPath(); ctx.rect(-OX, -OY, VW, VH); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.fill('evenodd');
  ctx.strokeStyle = SOFT.lilac[1]; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}
// where your own cube is on screen (the circle opens on it)
const myCubeOnScreen = () => { const p = players && players.find(q => !q.remote); return p ? [p.x + p.w / 2, p.y + p.h / 2 - camY] : [W / 2, H / 2]; };

function onNet(m) {
  if (pendingStart && m.t !== 'room') applyStart(pendingStart.m, pendingStart.t);   // (the race comes first)
  if (m.t === 'room') {
    net.room = m;
    if (state === 'search' && !pendingRoom) {     // joined: the circle closes on your cube, then into the room
      pendingRoom = 0.0001; startIris(ROOM_IRIS, [W / 2, 262], myCubeOnScreen);
    }
    else if (state === 'room') syncRoomCubes();   // someone joined, left, got ready…
  }
  else if (m.t === 'old') { netClose(); netBanner('The game was updated — please refresh the page'); toMenu(); }
  else if (m.t === 'match') {
    net.rematch = net.status === 'playing';
    mode = m.mode; net.me = m.you; net.status = 'playing'; net.sendT = 0;
    net.round = m.round; net.sentOver = false;
    net.roster = m.roster || [{ color: 0, owner: 0, slot: 0 }, { color: 7, owner: 1, slot: 0 }];
    if (state === 'room') { pendingStart = { m, t: 0 }; startIris(RACE_IRIS, [W / 2, GROUND_Y - ROW_GAP + 15 - camY], () => [W / 2, 280]); }   // the circle closes first
    else applyStart(m, 0);
  }
  else if (m.t === 'gone') playersLeft(m.owner);
  else if (m.t === 'chat') onChat(m);
  else if (m.t === 'left') { netClose(); netBanner('Everyone else left the game'); toMenu(); }
  else if (m.t === 'peer') { if (state === 'room') onRoomPeer(m.d || {}, m.from); else onPeer(m.d || {}); }
}

// Another computer left the match: its cubes vanish and the rest carry on
function playersLeft(owner) {
  if (!players || !net.roster) return;
  const gone = players.filter(p => p.remote && net.roster[p.i] && net.roster[p.i].owner === owner && !p.dead);
  for (const p of gone) {
    p.dead = true; p.outAt = ++outCount;
    burst(p.x + p.w / 2, p.y + p.h / 2, 10, p.color, 200, 0.6, 6);
  }
  if (!gone.length) return;
  floatText(gone.map(p => p.name).join(' & ') + ' left', W / 2, camY + H * 0.45, PAL.inkSoft, 26);
  // In a race, if only one cube is left standing, it wins
  const left = alive();
  if (mode === 'versus' && (state === 'play' || state === 'count') && left.length === 1) {
    state = 'over'; overT = 0; winner = left[0].i; wins[left[0].uid] = winsOf(left[0]) + 1;
    deathMsg = 'Everyone else left the race';
  }
}

// Data from the other computers
function onPeer(d) {
  if (!players || net.status !== 'playing') return;
  if (d.k === 's') {               // positions of their cubes
    for (const s of d.p || []) {
      const r = players[s.i];
      if (!r || !r.remote) continue;
      r.net = { x: s.x, y: s.y, vx: s.vx, vy: s.vy, g: s.g, age: 0 };
      r.face = s.f; r.sq = s.q; r.best = Math.max(r.best, s.b | 0);
      if (!r.seen) { r.x = s.x; r.y = s.y; r.seen = true; }
    }
  } else if (d.k === 'f') {        // fireball warning (Player 1's computer decides these)
    warnings.push({ x: d.x, t: 1.1 });
  } else if (d.k === 'd') {        // one of their cubes died
    const r = players[d.i];
    if (r && r.remote && (state === 'play' || state === 'count' || state === 'found')) die(r, d.r || 'fell');
  }
}

// Move the friend's cube smoothly toward where their computer says it is
function updateRemote(p, dt) {
  p.prevX = p.x; p.prevY = p.y;
  const r = p.net;
  if (!r) return;
  r.age += dt;
  const k = Math.min(r.age, 0.12);
  const tx = r.x + r.vx * k, ty = r.g ? r.y : r.y + r.vy * k + 0.5 * GRAV * k * k;
  if (Math.abs(tx - p.x) > 200 || Math.abs(ty - p.y) > 200) { p.x = tx; p.y = ty; }
  else { const a = Math.min(1, dt * 18); p.x += (tx - p.x) * a; p.y += (ty - p.y) * a; }
  p.vx = r.vx; p.vy = r.vy; p.onGround = r.g;
  p.blink -= dt; if (p.blink < -0.12) p.blink = rand(2, 5);
}

// Send the positions of the cubes on this computer ~30 times a second
function netTick(dt) {
  if (net.status !== 'playing') return;
  net.sendT -= dt;
  if (net.sendT > 0) return;
  net.sendT = 1 / 30;
  const r1 = v => Math.round(v * 10) / 10;
  const mine = players.filter(q => !q.remote && !q.dead);
  if (!mine.length) return;
  relay({ k: 's', p: mine.map(p => ({ i: p.i, x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), g: p.onGround, f: p.face, q: Math.round(p.sq * 100) / 100, b: p.best })) });
}
