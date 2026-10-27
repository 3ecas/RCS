// RCS online server: serves the game (index.html, css/, js/) and runs a shared room where up to 10 players get ready and race.
// No dependencies — uses only Node's built-in modules (Node 18+).
//
//   node server/server.js            (listens on $PORT, or 10000)
//   node server/server.js 8790       (listens on 8790)
//
// Messages (JSON over WebSocket at /ws):
//   client → server  {t:'find', v, colors:[0-9, …], name}   join the shared room (protocol version, cube colours, name)
//                    {t:'ready', on}                    ready (or not) for the next race
//                    {t:'leave'}                        leave the room
//                    {t:'relay', d:{...}}               pass game data to the other computers in the race
//                    {t:'roundOver', round}             this computer's race has ended (one cube left)
//   server → client  {t:'room', phase, players:[{name, colors, ready, racing}], me, max, round}  the room
//                    {t:'match', you, seed, mode, startIn, roster, round}    a race starts in startIn ms;
//                                                        roster = [{color, owner, slot, name, id}] for every cube
//                    {t:'peer', d:{...}}                data from another computer
//                    {t:'gone', owner}                  a computer left the race (the others carry on)
//                    {t:'old'}                          this copy of the game is out of date — refresh

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
// MAX_PLAYERS cubes). In the room everyone presses READY; when every player in the room is ready
// (and there are at least 2), a race starts with all of them. After the race the room goes back to
// the ready list. Anyone joining while a race is on waits in the room and can get ready for the next.
const MAX_PLAYERS = 10;
const PROTOCOL = 3;              // game and server must speak the same version
const rooms = [];

const cubesIn = list => list.reduce((n, c) => n + c.colors.length, 0);

// Send each player the room: who's in it, who's ready, who's racing, and which one is them
function roomStatus(r) {
  const list = r.members.map(c => ({ name: c.name, colors: c.colors, ready: r.ready.has(c), racing: r.racers.includes(c) }));
  r.members.forEach((c, i) => c.send({ t: 'room', phase: r.phase, players: list, me: i, max: MAX_PLAYERS, round: r.round }));
}

function joinRoom(c) {
  let r = rooms.find(x => cubesIn(x.members) + c.colors.length <= MAX_PLAYERS);
  if (!r) { r = { members: [], racers: [], ready: new Set(), phase: 'lobby', round: 0, mode: 'versus' }; rooms.push(r); }
  c.room = r;
  r.members.push(c);
  roomStatus(r);
}

// Start when everyone in the room is ready (and there are at least 2)
function maybeStart(r) {
  if (r.phase !== 'lobby' || r.members.length < 2 || !r.members.every(c => r.ready.has(c))) return false;
  r.phase = 'playing';
  r.round++;
  r.racers = [...r.members];
  r.ready.clear();
  // Everyone in the race: colour, computer (owner), keys there (slot), name, and a stable id for win counts
  const roster = [];
  r.racers.forEach((cl, owner) => {
    cl.owner = owner;
    cl.colors.forEach((color, slot) => roster.push({ color, owner, slot, name: slot === 0 ? cl.name || '' : '', id: cl.id + ':' + slot }));
  });
  const seed = crypto.randomInt(1, 2147483646);
  r.racers.forEach((c, i) => c.send({ t: 'match', you: i, seed, mode: r.mode, startIn: 4500, roster, round: r.round }));
  roomStatus(r);
  return true;
}

// A computer reports its race has ended (one cube left standing): back to the ready list
function roundOver(c, round) {
  const r = c.room;
  if (!r || r.phase !== 'playing' || round !== r.round || !r.racers.includes(c)) return;
  r.phase = 'lobby';
  r.racers = [];
  roomStatus(r);
  maybeStart(r);
}

// A computer leaves (left, or disconnected). The others carry on.
function leaveRoom(c) {
  const r = c.room;
  if (!r) return;
  c.room = null;
  const racing = r.phase === 'playing' && r.racers.includes(c);
  r.members = r.members.filter(o => o !== c);
  r.racers = r.racers.filter(o => o !== c);
  r.ready.delete(c);
  if (!r.members.length) { rooms.splice(rooms.indexOf(r), 1); return; }
  if (racing) for (const o of r.racers) o.send({ t: 'gone', owner: c.owner });
  if (r.phase === 'playing' && !r.racers.length) r.phase = 'lobby';   // everyone racing left
  roomStatus(r);
  maybeStart(r);
}

function onMessage(c, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;

  if (m.t === 'find') {
    // An old copy of the game (e.g. cached by the browser) can't play with the current one
    if (m.v !== PROTOCOL) { c.send({ t: 'old' }); return; }
    leaveRoom(c);
    // Cube colours of the players on this computer (1 or 2 of them; colour numbers 0–9)
    const colors = (Array.isArray(m.colors) ? m.colors : [0]).slice(0, 2).map(v => Math.max(0, Math.min(9, v | 0)));
    c.colors = colors.length ? colors : [0];
    // The name the player typed: letters, numbers, spaces and a few symbols, at most 12 characters
    c.name = String(m.name || '').replace(/[^\p{L}\p{N} _.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 12);
    joinRoom(c);
  } else if (m.t === 'ready') {
    const r = c.room;
    if (!r) return;
    if (m.on) r.ready.add(c); else r.ready.delete(c);
    if (!maybeStart(r)) roomStatus(r);
  } else if (m.t === 'cancel' || m.t === 'leave') {
    leaveRoom(c);
  } else if (m.t === 'relay') {
    const r = c.room;
    if (!r || r.phase !== 'playing' || !r.racers.includes(c)) return;
    for (const o of r.racers) if (o !== c) o.send({ t: 'peer', d: m.d });
  } else if (m.t === 'roundOver') {
    roundOver(c, m.round);
  }
}

server.listen(PORT, () => console.log(`RCS server on http://localhost:${PORT}`));
