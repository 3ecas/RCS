// RCS — The name boxes on the setup screen: HTML text fields kept lined up with the canvas.
'use strict';

const nameBoxes = [document.getElementById('name1'), document.getElementById('name2')];
nameBoxes[0].value = playerName;
nameBoxes[1].value = p2Name;
nameBoxes.forEach((box, who) => {
  box.addEventListener('input', () => {
    const v = box.value.replace(/\s+/g, ' ').trimStart().slice(0, 12);
    if (who === 0) playerName = v; else p2Name = v;
    try { localStorage.setItem(who === 0 ? 'rcs.name' : 'rcs.name2', v.trim()); } catch (e) {}
  });
  box.addEventListener('blur', () => {
    if (who === 0) { playerName = playerName.trim(); box.value = playerName; }
    else { p2Name = p2Name.trim(); box.value = p2Name; }
    reset();
  });
});

// Called every frame: show a box for each player on the setup screen, at the top of their panel
function placeNameBox() {
  const panels = state === 'title' && ui.page === 'setup' && !ui.help ? setupPanels() : [];
  const r = canvas.getBoundingClientRect(), s = r.width / W;
  nameBoxes.forEach((box, who) => {
    const pcx = panels[who];
    box.style.display = pcx === undefined ? 'none' : 'block';
    if (pcx === undefined) { if (document.activeElement === box) box.blur(); return; }
    const bw = 230, bh = 40;
    box.placeholder = ui.setup === 'split' ? `Player ${who + 1} name` : 'Your name';
    box.style.left = r.left + (pcx - bw / 2) * s + 'px';
    box.style.top = r.top + 240 * s + 'px';
    box.style.width = bw * s + 'px';
    box.style.height = bh * s + 'px';
    box.style.fontSize = 18 * s + 'px';
  });
}
