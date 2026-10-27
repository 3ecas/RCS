// RCS online server: serves the game page and pairs up players who are searching.
// No dependencies — uses only Node's built-in modules (Node 18+).
//
//   node server/server.js            (listens on $PORT, or 10000)
//   node server/server.js 8790       (listens on 8790)
//
// Messages (JSON over WebSocket at /ws):
//   client → server  {t:'find', mode:'coop'|'versus'}  start searching
//                    {t:'cancel'}                       stop searching
//                    {t:'relay', d:{...}}               pass game data to your partner
//                    {t:'again'}                        ready for a rematch
//                    {t:'leave'}                        leave the match
//   server → client  {t:'queue', counts:{coop, versus}}       how many are searching
//                    {t:'match', you, seed, mode, startIn}     a match (or rematch) starts in startIn ms
//                    {t:'peer', d:{...}}                       data from your partner
//                    {t:'peerReady'}                           partner wants a rematch
//                    {t:'left'}                                partner left

'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.PORT || 10000);
const GAME_FILE = path.join(__dirname, '..', 'game', 'index.html');
const MAX_FRAME = 64 * 1024;

// ---------- HTTP: the game page + health check ----------
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  if (url === '/' || url === '/index.html') {
    fs.readFile(GAME_FILE, (err, data) => {
      if (err) { res.writeHead(500); res.end('game file missing'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
    return;
  }
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
    this.searching = null;   // mode while in a queue
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
    broadcastCounts();
  }
}

server.on('upgrade', (req, sock) => {
  const url = (req.url || '').split('?')[0];
  const key = req.headers['sec-websocket-key'];
  if (url !== '/ws' || !key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
             'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const c = new Client(sock);
  c.send({ t: 'queue', counts: counts() });
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
const queues = { coop: [], versus: [] };

function counts() { return { coop: queues.coop.length, versus: queues.versus.length }; }

function broadcastCounts() {
  const msg = { t: 'queue', counts: counts() };
  for (const c of clients) if (!c.room) c.send(msg);
}

function unqueue(c) {
  if (!c.searching) return;
  const q = queues[c.searching];
  const i = q.indexOf(c);
  if (i >= 0) q.splice(i, 1);
  c.searching = null;
}

function leaveRoom(c) {
  const r = c.room;
  if (!r) return;
  c.room = null;
  for (const o of r.players) if (o !== c && o.room === r) { o.room = null; o.send({ t: 'left' }); }
}

function startRound(room) {
  room.ready.clear();
  const seed = crypto.randomInt(1, 2147483646);
  room.players.forEach((c, i) => c.send({ t: 'match', you: i, seed, mode: room.mode, startIn: 4500 }));
}

function onMessage(c, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;

  if (m.t === 'find') {
    const mode = m.mode === 'versus' ? 'versus' : 'coop';
    unqueue(c); leaveRoom(c);
    // Prefer someone searching the same mode; otherwise pair with anyone who's searching
    // (the player who was waiting first decides the mode). Whoever waited is Player 1.
    const otherMode = mode === 'coop' ? 'versus' : 'coop';
    const other = queues[mode].find(o => o !== c && !o.closed) || queues[otherMode].find(o => o !== c && !o.closed);
    if (other) {
      const roomMode = other.searching || mode;
      unqueue(other);
      const room = { players: [other, c], mode: roomMode, ready: new Set() };
      other.room = c.room = room;
      startRound(room);
    } else {
      queues[mode].push(c); c.searching = mode;
    }
    broadcastCounts();
  } else if (m.t === 'cancel') {
    unqueue(c); broadcastCounts();
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
    leaveRoom(c); unqueue(c); broadcastCounts();
  }
}

server.listen(PORT, () => console.log(`RCS server on http://localhost:${PORT}`));
