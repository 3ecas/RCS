// RCS online server: serves the game (index.html, css/, js/) and runs a shared room where up to 10 players race in rounds.
// No dependencies — uses only Node's built-in modules (Node 18+).
//
//   node server/server.js            (listens on $PORT, or 10000)
//   node server/server.js 8790       (listens on 8790)
//
// Messages (JSON over WebSocket at /ws):
//   client → server  {t:'find', colors:[0-9, …], name}   join the shared room (this computer's cube colours, player name)
//                    {t:'cancel'} / {t:'leave'}         leave the room
//                    {t:'relay', d:{...}}               pass game data to the other computers in the race
//                    {t:'roundOver', round}             this computer's race has ended (one cube left)
//   server → client  {t:'lobby', phase, players, computers, max, startsIn}  room status (lobby / playing / break)
//                    {t:'match', you, seed, mode, startIn, roster, round}    a race starts in startIn ms;
//                                                        roster = [{color, owner, slot, name, id}] for every cube
//                    {t:'peer', d:{...}}                data from another computer
//                    {t:'gone', owner}                  a computer left the race (the others carry on)

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

// ---------- Rooms ----------
// Everyone who clicks Multiplayer goes into the same room (a new room only opens once one is full,
// MAX_PLAYERS cubes). A room runs races in a loop:
//   lobby   — waiting for a 2nd player; once there are 2, LOBBY_WAIT_MS countdown (more can join)
//   playing — a race is on; anyone joining now waits and plays from the next round
//   break   — the race ended (leaderboard); the next round starts after NEXT_ROUND_MS
const MAX_PLAYERS = 10;
const LOBBY_WAIT_MS = 8000;
const NEXT_ROUND_MS = 10000;
const rooms = [];

const cubesIn = list => list.reduce((n, c) => n + c.colors.length, 0);
const members = r => [...r.players, ...r.waiting];

// Tell everyone in the room what's happening and when the next race starts
function roomStatus(r) {
  const all = members(r);
  const msg = {
    t: 'lobby', phase: r.phase, players: cubesIn(all), computers: all.length, max: MAX_PLAYERS,
    startsIn: r.startsAt ? Math.max(0, r.startsAt - Date.now()) : null,
  };
  for (const c of all) c.send(msg);
}

function schedule(r, ms) {
  clearTimeout(r.timer);
  r.startsAt = Date.now() + ms;
  r.timer = setTimeout(() => startRound(r), ms);
}
function unschedule(r) { clearTimeout(r.timer); r.timer = null; r.startsAt = null; }

function joinRoom(c) {
  let r = rooms.find(x => cubesIn(members(x)) + c.colors.length <= MAX_PLAYERS);
  if (!r) { r = { players: [], waiting: [], phase: 'lobby', timer: null, startsAt: null, round: 0, mode: 'versus' }; rooms.push(r); }
  c.room = r;
  if (r.phase === 'playing') r.waiting.push(c);     // joins from the next round
  else r.players.push(c);
  if (r.phase === 'lobby' && members(r).length >= 2 && !r.timer) schedule(r, LOBBY_WAIT_MS);
  if (r.phase === 'lobby' && cubesIn(members(r)) >= MAX_PLAYERS) { startRound(r); return; }
  roomStatus(r);
}

function startRound(r) {
  unschedule(r);
  r.players = members(r).filter(c => !c.closed);
  r.waiting = [];
  if (r.players.length < 2) { r.phase = 'lobby'; roomStatus(r); return; }
  r.phase = 'playing';
  r.round++;
  // Everyone in the race: colour, computer (owner), keys there (slot), name, and a stable id for win counts
  const roster = [];
  r.players.forEach((cl, owner) => {
    cl.owner = owner;
    cl.colors.forEach((color, slot) => roster.push({ color, owner, slot, name: slot === 0 ? cl.name || '' : '', id: cl.id + ':' + slot }));
  });
  const seed = crypto.randomInt(1, 2147483646);
  r.players.forEach((c, i) => c.send({ t: 'match', you: i, seed, mode: r.mode, startIn: 4500, roster, round: r.round }));
}

// A computer reports its race ended (one cube left standing): show the leaderboard, then go again
function roundOver(c, round) {
  const r = c.room;
  if (!r || r.phase !== 'playing' || round !== r.round || !r.players.includes(c)) return;
  r.phase = 'break';
  if (members(r).length >= 2) schedule(r, NEXT_ROUND_MS);
  else { r.phase = 'lobby'; unschedule(r); }
  roomStatus(r);
}

// A computer leaves (cancelled, left, or disconnected). The others carry on.
function leaveRoom(c) {
  const r = c.room;
  if (!r) return;
  c.room = null;
  const racing = r.phase === 'playing' && r.players.includes(c);
  r.players = r.players.filter(o => o !== c);
  r.waiting = r.waiting.filter(o => o !== c);
  if (!members(r).length) { unschedule(r); rooms.splice(rooms.indexOf(r), 1); return; }
  if (racing) for (const o of r.players) o.send({ t: 'gone', owner: c.owner });
  if (r.phase === 'playing' && !r.players.length) {            // everyone racing left; only waiters remain
    r.phase = 'lobby';
    if (members(r).length >= 2) schedule(r, LOBBY_WAIT_MS);
  } else if (r.phase !== 'playing' && members(r).length < 2) {
    r.phase = 'lobby'; unschedule(r);
  }
  roomStatus(r);
}

function onMessage(c, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;

  if (m.t === 'find') {
    leaveRoom(c);
    // Cube colours of the players on this computer (1 or 2 of them; colour numbers 0–9)
    const colors = (Array.isArray(m.colors) ? m.colors : [0]).slice(0, 2).map(v => Math.max(0, Math.min(9, v | 0)));
    c.colors = colors.length ? colors : [0];
    // The name the player typed: letters, numbers, spaces and a few symbols, at most 12 characters
    c.name = String(m.name || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 12);
    joinRoom(c);
  } else if (m.t === 'cancel' || m.t === 'leave') {
    leaveRoom(c);
  } else if (m.t === 'relay') {
    const r = c.room;
    if (!r || r.phase === 'lobby') return;
    for (const o of r.players) if (o !== c) o.send({ t: 'peer', d: m.d });
  } else if (m.t === 'roundOver') {
    roundOver(c, m.round);
  }
}

server.listen(PORT, () => console.log(`RCS server on http://localhost:${PORT}`));
