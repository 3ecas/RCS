// RCS online server: serves the game (index.html, css/, js/) and gathers searching players into matches of up to 10.
// No dependencies — uses only Node's built-in modules (Node 18+).
//
//   node server/server.js            (listens on $PORT, or 10000)
//   node server/server.js 8790       (listens on 8790)
//
// Messages (JSON over WebSocket at /ws):
//   client → server  {t:'find', mode, colors:[0-9, …], name}  start searching (this computer's cube colours and player name)
//                    {t:'cancel'}                       stop searching
//                    {t:'relay', d:{...}}               pass game data to the other computers
//                    {t:'again'}                        ready for a rematch
//                    {t:'leave'}                        leave the match
//   server → client  {t:'lobby', mode, players, computers, max, startsIn}  lobby status while searching
//                    {t:'match', you, seed, mode, startIn, roster}  a match (or rematch) starts in startIn ms;
//                                                                    roster = [{color, owner, slot, name}] for every cube
//                    {t:'peer', d:{...}}                       data from another computer
//                    {t:'peerReady'}                           another computer wants a rematch
//                    {t:'gone', owner}                         a computer left the match (others carry on)
//                    {t:'left'}                                everyone else left the match

'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.PORT || 10000);
const ROOT = path.join(__dirname, '..');                 // the game's files
const PUBLIC_DIRS = ['css', 'js'];                        // folders browsers may load from
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const MAX_FRAME = 64 * 1024;

// ---------- HTTP: the game files + health check ----------
function sendFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { url = '/'; }
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/' || url === '/index.html') return sendFile(res, path.join(ROOT, 'index.html'));
  // Only files inside css/ and js/ with a known type — never the server code or anything else
  const file = path.normalize(path.join(ROOT, url));
  const inPublic = PUBLIC_DIRS.some(d => file.startsWith(path.join(ROOT, d) + path.sep));
  if (inPublic && TYPES[path.extname(file)]) return sendFile(res, file);
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found');
});

// ---------- Minimal WebSocket (RFC 6455) ----------
let nextId = 1;
const clients = new Set();

class Client {
  constructor(sock) {
    this.id = nextId++;
    this.sock = sock;
    this.buf = Buffer.alloc(0);
    this.frags = [];
    this.alive = true;
    this.closed = false;
    this.room = null;
    this.lobby = null;       // open lobby while searching
    this.colors = [0];       // cube colours of the players on this computer
    sock.setNoDelay(true);
    sock.on('data', d => this.onData(d));
    sock.on('close', () => this.onClose());
    sock.on('error', () => this.onClose());
    clients.add(this);
  }

  onData(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) {
        if (this.buf.length < 10) return;
        if (this.buf.readUInt32BE(2) !== 0) return this.close();
        len = this.buf.readUInt32BE(6); off = 10;
      }
      if (len > MAX_FRAME || !masked) return this.close();   // browsers always mask
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4);
      const payload = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);

      if (op === 0x8) return this.close();                  // close
      if (op === 0x9) { this.frame(0xA, payload); continue; } // ping → pong
      if (op === 0xA) { this.alive = true; continue; }       // pong
      if (op === 0x1 || op === 0x0) {                        // text (or continuation)
        this.frags.push(payload);
        if (fin) {
          const text = Buffer.concat(this.frags).toString('utf8');
          this.frags = [];
          if (text.length <= MAX_FRAME) onMessage(this, text);
        }
      }
    }
  }

  frame(op, data) {
    if (this.closed || this.sock.destroyed) return;
    const len = data.length;
    let head;
    if (len < 126) head = Buffer.from([0x80 | op, len]);
    else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6); }
    this.sock.write(Buffer.concat([head, data]));
  }

  send(obj) { this.frame(0x1, Buffer.from(JSON.stringify(obj))); }

  close() {
    if (!this.closed && !this.sock.destroyed) {
      try { this.frame(0x8, Buffer.alloc(0)); } catch (e) {}
      this.sock.end();
      setTimeout(() => this.sock.destroy(), 500);
    }
    this.onClose();
  }

  onClose() {
    if (this.closed) return;
    this.closed = true;
    clients.delete(this);
    unqueue(this);
    leaveRoom(this);
  }
}

server.on('upgrade', (req, sock) => {
  const url = (req.url || '').split('?')[0];
  const key = req.headers['sec-websocket-key'];
  if (url !== '/ws' || !key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
             'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  new Client(sock);
});

// Ping everyone every 25 s; drop connections that stopped answering
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { c.close(); continue; }
    c.alive = false;
    c.frame(0x9, Buffer.alloc(0));
  }
}, 25000);

// ---------- Matchmaking ----------
// Searching computers gather in an open lobby. When a second computer joins, a short countdown starts
// so more people can hop in; the match starts when it runs out, or straight away at MAX_PLAYERS cubes.
const MAX_PLAYERS = 10;
const LOBBY_WAIT_MS = 8000;
const lobbies = { coop: null, versus: null };      // the open lobby for each mode (or null)

const cubesIn = list => list.reduce((n, c) => n + c.colors.length, 0);

// Tell everyone in a lobby how many players have joined and when it starts
function lobbyStatus(lob) {
  const msg = {
    t: 'lobby', mode: lob.mode, players: cubesIn(lob.players), computers: lob.players.length, max: MAX_PLAYERS,
    startsIn: lob.startsAt ? Math.max(0, lob.startsAt - Date.now()) : null,
  };
  for (const c of lob.players) c.send(msg);
}

// Take a computer out of its lobby (cancelled, disconnected, or matched)
function unqueue(c) {
  const lob = c.lobby;
  if (!lob) return;
  c.lobby = null;
  lob.players = lob.players.filter(o => o !== c);
  if (lob.players.length < 2 && lob.timer) { clearTimeout(lob.timer); lob.timer = null; lob.startsAt = null; }
  if (!lob.players.length) { if (lobbies[lob.mode] === lob) lobbies[lob.mode] = null; }
  else lobbyStatus(lob);
}

// Lobby → match
function launch(lob) {
  clearTimeout(lob.timer); lob.timer = null;
  if (lobbies[lob.mode] === lob) lobbies[lob.mode] = null;
  const players = lob.players.filter(c => !c.closed);
  lob.players = [];
  const room = { players, mode: lob.mode, ready: new Set() };   // first to search is computer 0
  for (const c of players) { c.lobby = null; c.room = room; }
  startRound(room);
}

// A computer leaves a match: the others carry on without its cubes, unless only one computer is left
function leaveRoom(c) {
  const r = c.room;
  if (!r) return;
  c.room = null;
  r.players = r.players.filter(o => o !== c);
  r.ready.delete(c);
  if (r.players.length <= 1) {
    for (const last of r.players) { last.room = null; last.send({ t: 'left' }); }
    return;
  }
  for (const o of r.players) o.send({ t: 'gone', owner: c.owner });
  if (r.ready.size && r.ready.size === r.players.length) startRound(r);   // everyone left was waiting to play again
}

function startRound(room) {
  room.ready.clear();
  // Everyone in the match: colour, which computer they're on (owner), and which keys there (slot)
  const roster = [];
  room.players.forEach((cl, owner) => {
    cl.owner = owner;
    cl.colors.forEach((color, slot) => roster.push({ color, owner, slot, name: slot === 0 ? cl.name || '' : '' }));
  });
  const seed = crypto.randomInt(1, 2147483646);
  room.players.forEach((c, i) => c.send({ t: 'match', you: i, seed, mode: room.mode, startIn: 4500, roster }));
}

function onMessage(c, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;

  if (m.t === 'find') {
    const mode = m.mode === 'versus' ? 'versus' : 'coop';
    unqueue(c); leaveRoom(c);
    // Cube colours of the players on this computer (1 or 2 of them; colour numbers 0–9)
    const colors = (Array.isArray(m.colors) ? m.colors : [0]).slice(0, 2).map(v => Math.max(0, Math.min(9, v | 0)));
    c.colors = colors.length ? colors : [0];
    // The name the player typed: letters, numbers, spaces and a few symbols, at most 12 characters
    c.name = String(m.name || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 12);
    // Join an open lobby with room for this computer's cubes: the same mode first, otherwise the other
    // mode's lobby (so nobody is left waiting alone — that lobby's mode is used). Otherwise open a new one.
    const otherMode = mode === 'coop' ? 'versus' : 'coop';
    const fits = lob => lob && cubesIn(lob.players) + c.colors.length <= MAX_PLAYERS;
    let lob = fits(lobbies[mode]) ? lobbies[mode] : fits(lobbies[otherMode]) ? lobbies[otherMode] : null;
    if (!lob) { lob = { mode, players: [], timer: null, startsAt: null }; lobbies[mode] = lob; }
    lob.players.push(c); c.lobby = lob;
    if (cubesIn(lob.players) >= MAX_PLAYERS) { launch(lob); return; }
    if (lob.players.length >= 2 && !lob.timer) {
      lob.startsAt = Date.now() + LOBBY_WAIT_MS;
      lob.timer = setTimeout(() => launch(lob), LOBBY_WAIT_MS);
    }
    lobbyStatus(lob);
  } else if (m.t === 'cancel') {
    unqueue(c);
  } else if (m.t === 'relay') {
    const r = c.room;
    if (!r) return;
    for (const o of r.players) if (o !== c) o.send({ t: 'peer', d: m.d });
  } else if (m.t === 'again') {
    const r = c.room;
    if (!r) return;
    r.ready.add(c);
    if (r.ready.size === r.players.length) startRound(r);
    else for (const o of r.players) if (o !== c) o.send({ t: 'peerReady' });
  } else if (m.t === 'leave') {
    leaveRoom(c); unqueue(c);
  }
}

server.listen(PORT, () => console.log(`RCS server on http://localhost:${PORT}`));
