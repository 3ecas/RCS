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
  chatBox.style.display = 'block';
  chatBox.focus();
}
function closeChat() {
  chatBox.style.display = 'none';
  chatBox.blur();
}
const chatOpen = () => chatBox.style.display === 'block';

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
    const w = Math.min(380, ctx.measureText(b.text).width + 26), h = 34;
    ctx.globalAlpha = clamp(b.until - time, 0, 1);
    const [x, y] = bubbleShape(cube, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 10, y, w - 20, h); ctx.clip();
    text(b.text, x + w / 2, y + 23, 18, PAL.ink, 'center', 800);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// A rounded pill over the cube with a little rounded tail pointing down at it. Returns its top-left corner.
function bubbleShape(cube, w, h) {
  const x = clamp(cube.x + cube.w / 2 - w / 2, WALL + 4, W - WALL - w - 4), y = cube.y - h - 16;
  const tx = clamp(cube.x + cube.w / 2, x + h / 2, x + w - h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.moveTo(tx - 7, y + h - 1); ctx.quadraticCurveTo(tx, y + h + 2, tx, y + h + 10); ctx.quadraticCurveTo(tx + 2, y + h + 2, tx + 7, y + h - 1);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = cube.dark; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(tx - 6, y + h - 4, 12, 4);   // (no outline where the tail meets the pill)
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
  let y = bottom - 17 - (n - 1) * 31;
  // the corner it lives in (the hover area): a bit wider and taller than the lines, even when there are none
  const hover = typeof ui !== 'undefined' && ui.mx != null && ui.mx < x + 460 && ui.my > bottom - Math.max(3, n) * 31 - 20 && ui.my < H + OY;
  if (hover || chatOpen()) chat.last = time;
  const dt = clamp(time - chat.drawnAt, 0, 0.1); chat.drawnAt = time;
  const want = time - chat.last < CHAT_IDLE ? 1 : 0;
  chat.vis += clamp(want - chat.vis, -dt / 0.4, dt / 0.15);   // (quick to show, gentle to fade)
  if (chat.vis <= 0) return;
  ctx.font = `900 17px ${FONT}`;
  for (const c of chat.log) {
    ctx.globalAlpha = chat.vis;
    {
      ctx.font = `900 17px ${FONT}`;
      const nw = ctx.measureText(c.name + ': ').width;
      ctx.font = `700 17px ${FONT}`;
      const tw = ctx.measureText(c.text).width;
      // a soft rounded pill behind each line, lightly tinted with the sender's colour (light enough to read on)
      ctx.beginPath(); ctx.roundRect(x, y - 19, nw + tw + 26, 27, 13.5);
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
      ctx.globalAlpha = chat.vis * 0.2; ctx.fillStyle = c.tint || '#ffffff'; ctx.fill();
      ctx.globalAlpha = chat.vis * 0.45; ctx.strokeStyle = c.tint || '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.globalAlpha = chat.vis;
      text(c.name + ': ', x + 13, y, 17, c.color, 'left', 900);
      text(c.text, x + 13 + nw, y, 17, PAL.ink, 'left', 700);
    }
    y += 31;
  }
  ctx.globalAlpha = 1;
}
