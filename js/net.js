// RCS — Online play: talking to the matchmaking server and syncing the other player.
'use strict';

// Where the online server lives. When the game is opened from the Render server itself (or a test
// server on this computer) it connects back to that address; everywhere else — GitHub Pages, or
// index.html opened from disk — it connects to SERVER_URL.
const SERVER_URL = 'wss://rcs-d5wp.onrender.com/ws';
// me: which computer we are in the match (0 or 1). local: players on this computer. roster: everyone's colour and owner.
// lobby: while searching, how many players have joined and when the match starts.
const net = { ws: null, status: 'off', me: 0, local: 1, roster: null, lobby: null, peerReady: false, waitingAgain: false, sendT: 0, banner: '', bannerT: 0 };

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
  state = 'search'; net.peerReady = false; net.waitingAgain = false; net.lobby = null;
  net.local = 1;                 // one player per computer
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
  const colors = [];
  for (let k = 0; k < net.local; k++) colors.push(localColor(k));
  ws.onopen = () => { opened = true; net.status = 'searching'; netSend({ t: 'find', mode, colors, name: playerName }); };
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

function leaveOnline() { netSend({ t: 'leave' }); netClose(); toMenu(); }

function onNet(m) {
  if (m.t === 'lobby') net.lobby = { ...m, at: performance.now() };
  else if (m.t === 'match') {
    net.rematch = net.status === 'playing';
    mode = m.mode; net.me = m.you; net.status = 'playing'; net.peerReady = false; net.waitingAgain = false; net.sendT = 0;
    net.roster = m.roster || [{ color: 0, owner: 0, slot: 0 }, { color: 7, owner: 1, slot: 0 }];
    // New group of players (or someone left since last round): start the win count afresh
    const sig = JSON.stringify(net.roster) + net.me;
    if (sig !== net.rosterSig) { wins.fill(0); net.rosterSig = sig; }
    reset(m.seed);
    // Show "Match found!" first, then the 3-2-1 countdown (both computers start together)
    foundT = Math.min(1.5, m.startIn / 1000 - 1);
    countdown = m.startIn / 1000 - foundT;
    state = 'found'; sfx.milestone();
  } else if (m.t === 'peerReady') net.peerReady = true;
  else if (m.t === 'gone') playersLeft(m.owner);
  else if (m.t === 'left') { netClose(); netBanner('Everyone else left the game'); toMenu(); }
  else if (m.t === 'peer') onPeer(m.d || {});
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
    state = 'over'; overT = 0; winner = left[0].i; wins[winner]++;
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
  } else if (d.k === 'c') {        // they landed on a crumbling platform
    const pl = platforms.find(q => q.id === d.id);
    if (pl && pl.crumbleT < 0 && !pl.falling) pl.crumbleT = 0.7;
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
