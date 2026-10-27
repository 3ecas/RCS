// RCS — The name box above the colour picker: an HTML text field kept lined up with the canvas.
'use strict';

const nameBox = document.getElementById('name');
nameBox.value = playerName;
nameBox.addEventListener('input', () => {
  playerName = nameBox.value.replace(/\s+/g, ' ').trimStart().slice(0, 12);
  try { localStorage.setItem('rcs.name', playerName.trim()); } catch (e) {}
});
nameBox.addEventListener('blur', () => { playerName = playerName.trim(); nameBox.value = playerName; reset(); });

// Called every frame: show the box only on the main menu, at the right spot and size
function placeNameBox() {
  const show = state === 'title' && ui.page === 'main' && !ui.help;
  nameBox.style.display = show ? 'block' : 'none';
  if (!show) { if (document.activeElement === nameBox) nameBox.blur(); return; }
  const r = canvas.getBoundingClientRect(), s = r.width / W;
  const bw = 230, bh = 40, bx = W / 2 - bw / 2, by = 22;
  nameBox.style.left = r.left + bx * s + 'px';
  nameBox.style.top = r.top + by * s + 'px';
  nameBox.style.width = bw * s + 'px';
  nameBox.style.height = bh * s + 'px';
  nameBox.style.fontSize = 18 * s + 'px';
}
