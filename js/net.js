// RCS — Online play: talking to the matchmaking server and syncing the other player.
'use strict';

// Where the online server lives. When the game is opened from the Render server itself (or a test
// server on this computer) it connects back to that address; everywhere else — GitHub Pages, or
// index.html opened from disk — it connects to SERVER_URL.
const SERVER_URL = 'wss://rcs.onrender.com/ws';
const net = { ws: null, status: 'off', me: 0, counts: { coop: 0, versus: 0 }, peerReady: false, waitingAgain: false, sendT: 0, banner: '', bannerT: 0 };

function netUrl() {
  const h = location.hostname;
  const ownServer = h.endsWith('.onrender.com') || h === 'localhost' || h === '127.0.0.1';
  if (ownServer && (location.protocol === 'http:' || location.protocol === 'https:'))
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  return SERVER_URL;
}
function netSend(obj) { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(obj)); }
function relay(d) { netSend({ t: 'relay', d }); }
function netBanner(text) { net.banner = text; net.bannerT = 5; }

function netClose() {
  const ws = net.ws;
  net.ws = null; net.status = 'off';
  if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }
}

function startSearch() {
  netClose();
  state = 'search'; net.status = 'connecting'; net.peerReady = false; net.waitingAgain = false;
  let ws;
  try { ws = new WebSocket(netUrl()); } catch (e) { netBanner('Could not reach the online server'); toMenu(); return; }
  net.ws = ws;
  ws.onopen = () => { net.status = 'searching'; netSend({ t: 'find', mode }); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onNet(m); };
  ws.onclose = () => {
    if (net.ws !== ws) return;
    const wasPlaying = net.status === 'playing';
    net.ws = null; net.status = 'off';
    netBanner(wasPlaying ? 'Connection lost' : 'Could not reach the online server');
    toMenu();
  };
}

function leaveOnline() { netSend({ t: 'leave' }); netClose(); toMenu(); }

function onNet(m) {
  if (m.t === 'queue') net.counts = m.counts;
  else if (m.t === 'match') {
    net.rematch = net.status === 'playing';
    mode = m.mode; net.me = m.you; net.status = 'playing'; net.peerReady = false; net.waitingAgain = false; net.sendT = 0;
    reset(m.seed);
    // Show "Match found!" first, then the 3-2-1 countdown (both computers start together)
    foundT = Math.min(1.5, m.startIn / 1000 - 1);
    countdown = m.startIn / 1000 - foundT;
    state = 'found'; sfx.milestone();
  } else if (m.t === 'peerReady') net.peerReady = true;
  else if (m.t === 'left') { netClose(); netBanner('Your friend left the game'); toMenu(); }
  else if (m.t === 'peer') onPeer(m.d || {});
}

// Data from the other player's computer
function onPeer(d) {
  if (!players || net.status !== 'playing') return;
  const r = players.find(p => p.remote);
  if (!r) return;
  if (d.k === 's') {               // their position
    r.net = { x: d.x, y: d.y, vx: d.vx, vy: d.vy, g: d.g, age: 0 };
    r.face = d.f; r.sq = d.q; r.best = Math.max(r.best, d.b | 0);
    if (!r.seen) { r.x = d.x; r.y = d.y; r.seen = true; }
  } else if (d.k === 'c') {        // they landed on a crumbling platform
    const pl = platforms.find(q => q.id === d.id);
    if (pl && pl.crumbleT < 0 && !pl.falling) pl.crumbleT = 0.7;
  } else if (d.k === 'f') {        // fireball warning (Player 1's computer decides these)
    warnings.push({ x: d.x, t: 1.1 });
  } else if (d.k === 'd') {        // they died
    if (state === 'play' || state === 'count') die(r, d.r || 'fell');
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

// Send my cube's position ~30 times a second
function netTick(dt) {
  if (net.status !== 'playing') return;
  net.sendT -= dt;
  if (net.sendT > 0) return;
  net.sendT = 1 / 30;
  const p = players.find(q => !q.remote);
  if (!p || p.dead) return;
  const r1 = v => Math.round(v * 10) / 10;
  relay({ k: 's', x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), g: p.onGround, f: p.face, q: Math.round(p.sq * 100) / 100, b: p.best });
}
