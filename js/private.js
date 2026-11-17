// RCS — Private rooms. The PRIVATE portal in the online hub (js/hub.js) opens a little box asking for a room password.
// Everyone who types the same password goes into the same room, away from the public one: a way to play
// with friends. (The password isn't a secret kept by the server — it's a meeting place: pick one only your
// friends would guess.) Enter joins, Esc cancels.
'use strict';

const privBox = document.getElementById('priv'), privCode = document.getElementById('privcode');

function openPrivate() {
  for (const k in keys) keys[k] = false;     // your cube stops while you type
  privCode.value = '';
  privBox.style.display = 'block';
  privCode.focus();
  sfx.beep(660);
}
function closePrivate(stepOut = true) {
  privBox.style.display = 'none';
  privCode.blur();
  // step out of the portal, so it doesn't open again straight away
  if (stepOut && state === 'hub') for (const p of players) if (!p.remote && atDoor(p, PRIVATE_X(), GROUND_Y)) { p.x -= DOOR_W + 6; p.prevX = p.x; }
}
const privOpen = () => privBox.style.display === 'block';
// Same password, same room: case and extra spaces don't matter
const cleanCode = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 24);

privCode.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const code = cleanCode(privCode.value);
    e.preventDefault();
    if (!code) return;                       // (nothing typed yet)
    closePrivate(false);
    chooseMode('private', code);
  } else if (e.key === 'Escape') { closePrivate(); e.preventDefault(); }
});
privCode.addEventListener('blur', () => { if (privOpen()) closePrivate(); });

// The PRIVATE portal: in the online hub, right of the middle (between FIND MATCH and EXIT)
const PRIVATE_X = () => W / 2 + 160;
const privateHere = () => state === 'hub';
function checkPrivatePortal(dt) {
  if (privateHere() && holdDoor('private', PRIVATE_X(), dt)) { openPrivate(); return true; }
  return false;
}
