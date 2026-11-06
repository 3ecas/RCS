// RCS — Chat in the online room: press Enter to type, Enter again to send (Esc cancels).
// Messages show as a speech bubble over the sender's cube and in a short log in the corner.
'use strict';

const chatBox = document.getElementById('chat');
const chat = { log: [], bubbles: {} };   // log: recent messages; bubbles: latest message per computer (by id)

function openChat() {
  for (const k in keys) keys[k] = false;     // your cube stops while you type
  chatBox.value = '';
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
  const color = member ? COLORS[member.colors[0]].d : PAL.ink;
  chat.log.push({ name, color, text: m.text, at: time, mine: R && R.players[R.me] && R.players[R.me].id === m.from });
  if (chat.log.length > 6) chat.log.shift();
  chat.bubbles[m.from] = { text: m.text, until: time + 5 };
  sfx.beep(900);
}

// Speech bubbles over each computer's first cube (room scene: camera at 0, so world = screen)
function drawChatBubbles() {
  const R = net.room;
  if (!R) return;
  const myId = R.players[R.me] && R.players[R.me].id;
  for (const id in chat.bubbles) {
    const b = chat.bubbles[id];
    if (b.until < time) { delete chat.bubbles[id]; continue; }
    const cube = String(id) === String(myId) ? players.find(p => !p.remote && !p.slot) : players.find(p => p.remote && p.uid === id + ':0');
    if (!cube || cube.dead) continue;
    ctx.font = `800 15px ${FONT}`;
    const w = Math.min(320, ctx.measureText(b.text).width + 22), h = 30;
    const x = clamp(cube.x + cube.w / 2 - w / 2, WALL + 4, W - WALL - w - 4), y = cube.y - h - 16;
    ctx.globalAlpha = clamp(b.until - time, 0, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cube.dark; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.beginPath(); ctx.moveTo(cube.x + cube.w / 2 - 6, y + h); ctx.lineTo(cube.x + cube.w / 2, y + h + 9); ctx.lineTo(cube.x + cube.w / 2 + 6, y + h); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(x + 6, y, w - 12, h); ctx.clip();
    text(b.text, x + w / 2, y + 20, 15, PAL.ink, 'center', 800);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

// The last few messages, bottom-left above the floor (fade after 25 s)
function drawChatLog() {
  const x = WALL + 18;
  let y = GROUND_Y - 16 - (chat.log.length - 1) * 22;
  for (const c of chat.log) {
    const a = clamp(1 - (time - c.at - 25) / 5, 0, 1);
    if (a > 0) {
      ctx.globalAlpha = a;
      ctx.font = `900 14px ${FONT}`;
      const nw = ctx.measureText(c.name + ': ').width;
      text(c.name + ': ', x, y, 14, c.color, 'left', 900);
      text(c.text, x + nw, y, 14, PAL.ink, 'left', 700);
    }
    y += 22;
  }
  ctx.globalAlpha = 1;
}
