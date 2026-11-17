// RCS — Chat in the online room: press Enter to type, Enter again to send (Esc cancels).
// Messages show as a speech bubble over the sender's cube and in a short log in the corner.
'use strict';

const chatBox = document.getElementById('chat');
const chat = { log: [], bubbles: {}, last: -99, vis: 0, drawnAt: 0 };   // log: recent messages; bubbles: latest message per computer (by id)
// The log hides after CHAT_IDLE seconds with no chat activity (a message, or the chat box open) and comes back
// while the mouse is over it
const CHAT_IDLE = 5;

function openChat() {
  for (const k in keys) keys[k] = false;     // your cube stops while you type
  chatBox.value = ''; chat.last = time;
  fitChatBox();
  chatBox.style.display = 'block';
  chatBox.focus();
}
function closeChat() {
  chatBox.style.display = 'none';
  chatBox.blur();
}
const chatOpen = () => chatBox.style.display === 'block';
// The box (and the log above it) stay in the margin left of the game area, never over it
function chatSpace() { return OX * innerWidth / VW - 16 - 10; }   // screen pixels between the 16 px gutter and the arena
function fitChatBox() { chatBox.style.width = Math.round(clamp(chatSpace(), 100, 440)) + 'px'; }
addEventListener('resize', fitChatBox);

// Break text into lines that fit: the first line can be narrower (the name goes before it). Long words are
// split too.
function wrapLines(str, firstW, restW) {
  const lines = [];
  let line = '', maxW = firstW;
  const fits = t => ctx.measureText(t).width <= maxW;
  for (let word of str.split(' ')) {
    while (true) {
      const tryLine = line ? line + ' ' + word : word;
      if (fits(tryLine)) { line = tryLine; break; }
      if (line) { lines.push(line); line = ''; maxW = restW; continue; }
      // a single word too long for a whole line: as much of it as fits
      let k = word.length;
      while (k > 1 && !fits(word.slice(0, k))) k--;
      lines.push(word.slice(0, k)); word = word.slice(k); maxW = restW;
      if (!word) break;
    }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

chatBox.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const text = chatBox.value.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (text) netSend({ t: 'chat', text });
    closeChat();
    e.preventDefault();
  } else if (e.key === 'Escape') { closeChat(); e.preventDefault(); }
});
chatBox.addEventListener('blur', () => { chatBox.style.display = 'none'; });

// A message from the server (including our own, echoed back)
function onChat(m) {
  const R = net.room;
  const member = R && R.players.find(p => p.id === m.from);
  const name = member ? roomName(member) : 'Someone';
  const color = member ? COLORS[member.colors[0]].d : PAL.ink, tint = member ? COLORS[member.colors[0]].c : '#ffffff';
  chat.log.push({ name, color, tint, text: m.text, at: time, mine: R && R.players[R.me] && R.players[R.me].id === m.from });
  if (chat.log.length > 6) chat.log.shift();
  chat.bubbles[m.from] = { text: m.text, until: time + 10 };
  chat.last = time;
  sfx.beep(900);
}

// Speech bubbles over each computer's first cube (room scene: camera at 0, so world = screen)
function drawChatBubbles() {
  const R = net.room;
  if (!R) return;
  const myId = R.players[R.me] && R.players[R.me].id;
  // Who's typing right now (your first cube while the chat box is open; the others from their room updates):
  // three dots over them instead of their last bubble
  const typing = new Set(players.filter(p => !p.dead && (p.remote ? p.typing : !p.slot && chatOpen())));
  for (const p of typing) drawTypingDots(p);
  for (const id in chat.bubbles) {
    const b = chat.bubbles[id];
    if (b.until < time) { delete chat.bubbles[id]; continue; }
    const cube = String(id) === String(myId) ? players.find(p => !p.remote && !p.slot) : players.find(p => p.remote && p.uid === id + ':0');
    if (!cube || cube.dead || typing.has(cube)) continue;
    ctx.font = `800 18px ${FONT}`;
    const lines = wrapLines(b.text, 250, 250);   // longer messages go onto more lines
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 26, h = 12 + lines.length * 22;
    ctx.globalAlpha = clamp(b.until - time, 0, 1);
    const [x, y] = bubbleShape(cube, w, h);
    lines.forEach((l, i) => text(l, x + w / 2, y + 23 + i * 22, 18, PAL.ink, 'center', 800));
    ctx.globalAlpha = 1;
  }
}

// A plain rounded capsule over the cube (no tail). Returns its top-left corner.
function bubbleShape(cube, w, h) {
  const x = clamp(cube.x + cube.w / 2 - w / 2, WALL + 4, W - WALL - w - 4), y = cube.y - h - 12;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(h / 2, 17));
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = cube.dark; ctx.lineWidth = 2; ctx.stroke();
  return [x, y];
}

// "Typing…": just three small dots floating over the cube (no balloon), each growing and shrinking in turn,
// like a wave. White-ringed so they show on any background.
function drawTypingDots(cube) {
  const cx = cube.x + cube.w / 2, cy = cube.y - 18;
  for (let k = 0; k < 3; k++) {
    const u = 0.5 + 0.5 * Math.sin(time * 7 - k * 0.9);    // 0..1, each dot a little behind the one before
    const r = 2.8 + 2.6 * u;
    ctx.beginPath(); ctx.arc(cx + (k - 1) * 14, cy, r + 1.8, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + (k - 1) * 14, cy, r, 0, Math.PI * 2); ctx.fillStyle = cube.dark; ctx.fill();
  }
}

// The last few messages, in the screen's bottom-left corner, just above the chat box. Hidden after a few
// seconds without chat; hover the mouse there to see them again.
function drawChatLog() {
  const px = VW / innerWidth;                    // (one screen pixel, in arena units: the box is placed in pixels)
  const x = -OX + 16 * px, bottom = H + OY - (16 + 48 + 12) * px;
  const n = chat.log.length;
  // the corner it lives in (the hover area): a bit wider and taller than the lines, even when there are none
  const hover = typeof ui !== 'undefined' && ui.mx != null && ui.mx < Math.max(-10, x + 150) && ui.my > bottom - Math.max(3, n) * 40 - 20 && ui.my < H + OY;
  if (hover || chatOpen()) chat.last = time;
  const dt = clamp(time - chat.drawnAt, 0, 0.1); chat.drawnAt = time;
  const want = time - chat.last < CHAT_IDLE ? 1 : 0;
  chat.vis += clamp(want - chat.vis, -dt / 0.4, dt / 0.15);   // (quick to show, gentle to fade)
  if (chat.vis <= 0) return;
  // Each message wraps to fit the margin left of the game area (never over it); stacked up from the box
  const maxW = Math.max(100, chatSpace() * px), LH = 21;
  const blocks = chat.log.map(c => {
    ctx.font = `900 17px ${FONT}`;
    const nw = ctx.measureText(c.name + ': ').width;
    ctx.font = `700 17px ${FONT}`;
    const lines = wrapLines(c.text, maxW - 26 - nw, maxW - 26);
    const w = Math.max(nw + ctx.measureText(lines[0]).width, ...lines.slice(1).map(l => ctx.measureText(l).width)) + 26;
    return { c, nw, lines, w, h: 27 + (lines.length - 1) * LH };
  });
  let top = bottom - blocks.reduce((t, k) => t + k.h + 4, 0);
  for (const k of blocks) {
    const c = k.c;
    ctx.globalAlpha = chat.vis;
    // a soft rounded pill behind each message, lightly tinted with the sender's colour (light enough to read on)
    ctx.beginPath(); ctx.roundRect(x, top, k.w, k.h, 13.5);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
    ctx.globalAlpha = chat.vis * 0.2; ctx.fillStyle = c.tint || '#ffffff'; ctx.fill();
    ctx.globalAlpha = chat.vis * 0.45; ctx.strokeStyle = c.tint || '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = chat.vis;
    text(c.name + ': ', x + 13, top + 19, 17, c.color, 'left', 900);
    k.lines.forEach((l, i) => text(l, x + 13 + (i ? 0 : k.nw), top + 19 + i * LH, 17, PAL.ink, 'left', 700));
    top += k.h + 4;
  }
  ctx.globalAlpha = 1;
}

// "Pink went to the room": when someone leaves the race or the results screen for the room scene, everyone still
// in the race / on the results screen gets a small notice at the top, in that player's colour, so they can follow
const notices = [];
function noticeRoomMoves(before, after) {
  if (!before || !after || mode !== 'versus' || net.status !== 'playing') return;
  if (!(state === 'play' || state === 'count' || state === 'over' || state === 'found')) return;
  const meId = after.players[after.me] && after.players[after.me].id;
  for (const m of after.players) {
    if (m.id === meId || m.racing || m.results) continue;
    const was = before.players.find(o => o.id === m.id);
    if (!was || !(was.racing || was.results)) continue;
    const racer = players.find(p => p.uid === m.id + ':0');   // (the name they had in the race)
    notices.push({ text: (racer ? racer.name : roomName(m)) + ' went to the room', color: COLORS[m.colors[0]], at: performance.now() / 1000 });
    if (notices.length > 3) notices.shift();
    sfx.beep(740);
  }
}
function drawNotices() {
  const now = performance.now() / 1000;
  while (notices.length && now - notices[0].at > 4.5) notices.shift();
  let y = -OY + (state === 'over' ? 74 : 112);   // (in a race: under the height and the ladder's top)
  ctx.font = `900 17px ${FONT}`;
  for (const n of notices) {
    const age = now - n.at, a = clamp(Math.min(age / 0.2, (4.5 - age) / 0.5), 0, 1);
    const w = ctx.measureText(n.text).width + 34, x = W / 2 - w / 2, dy = (1 - Math.min(1, age / 0.2)) * -10;
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.roundRect(x, y + dy, w, 32, 16);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.globalAlpha = a * 0.22; ctx.fillStyle = n.color.c; ctx.fill();
    ctx.globalAlpha = a; ctx.strokeStyle = n.color.d; ctx.lineWidth = 2; ctx.stroke();
    text(n.text, W / 2, y + dy + 22, 17, n.color.d, 'center', 900);
    y += 40;
  }
  ctx.globalAlpha = 1;
}
