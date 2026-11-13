// RCS — Game state: saved best height, current screen, players, and starting a new tower.
'use strict';

let best = 0, totalGems = 0;   // totalGems: every gem this computer has ever picked up (unlocks wardrobe items)
try { best = parseInt(localStorage.getItem('towerduo.best') || '0', 10) || 0; } catch (e) {}
function saveBest() { try { localStorage.setItem('towerduo.best', String(best)); } catch (e) {} }
try { totalGems = parseInt(localStorage.getItem('rcs.gems') || '0', 10) || 0; } catch (e) {}
function saveGems() { try { localStorage.setItem('rcs.gems', String(totalGems)); } catch (e) {} }

// Cube colour and look (face, hat, pattern) for player 1 and player 2, picked on the wardrobe platforms
// in the start scene and remembered by the browser
let myColor = 0, p2Color = 7, myLook = { f: 0, h: 0, p: 0 }, p2Look = { f: 1, h: 0, p: 0 };
try {
  const c1 = parseInt(localStorage.getItem('rcs.color'), 10), c2 = parseInt(localStorage.getItem('rcs.color2'), 10);
  if (c1 >= 0 && c1 < COLORS.length) myColor = c1;
  if (c2 >= 0 && c2 < COLORS.length) p2Color = c2;
  const l1 = JSON.parse(localStorage.getItem('rcs.look') || 'null'), l2 = JSON.parse(localStorage.getItem('rcs.look2') || 'null');
  if (l1) myLook = cleanLook(l1);
  if (l2) p2Look = cleanLook(l2);
} catch (e) {}
if (p2Color === myColor) p2Color = (myColor + 3) % COLORS.length;
function saveColor() {
  try { localStorage.setItem('rcs.color', String(myColor)); localStorage.setItem('rcs.color2', String(p2Color)); } catch (e) {}
}
const localColor = n => n === 0 ? myColor : p2Color;
const localLook = n => n === 0 ? myLook : p2Look;
function saveLook() {
  try { localStorage.setItem('rcs.look', JSON.stringify(myLook)); localStorage.setItem('rcs.look2', JSON.stringify(p2Look)); } catch (e) {}
}
// A look from storage or another computer: whole numbers within range
function cleanLook(l) {
  const n = (v, max) => Math.max(0, Math.min(max - 1, (l && l[v]) | 0));
  return { f: n('f', FACES.length), h: n('h', HATS.length), p: n('p', PATTERNS.length) };
}

// ---------- World state ----------
let state = 'lobby', pausedFrom = 'play';   // lobby = the playable start scene (js/lobby.js)
// Game mode: 'solo' (climb alone), 'split' (two players, one keyboard, co-op: if one falls both lose)
// or 'versus' (a race, online or split screen: last one standing wins)
let mode = 'solo', winner = -1;
let playerCount = 1;            // players on this keyboard: 1, or 2 once player 2 has joined in the lobby
// help: the instructions overlay; mouse position and clicks (for the remaining buttons)
const ui = { focus: 0, mx: -1, my: -1, mouseMoved: false, click: null, help: false };
let foundT = 0;                           // "Match found" screen timer

// Online race wins this session, by player id (so they stay right as people join and leave the room)
const wins = {};
const winsOf = p => wins[p.uid] || 0;
let players = null, platforms, blades, jets, zaps, bubbles, dividers, gems, particles, fireballs, warnings, texts;
// camY: the top of the screen in the world
let camY, rowK, gen, time, countdown, overT, deathMsg, height, nextMilestone;
let fireTimer, shake, scrollSpeed, newBest;
let runGems = 0;                // gems picked up this run (by this computer's cubes)
let outCount = 0;               // order players are knocked out in (for the leaderboard)

function mkPlayer(i, x, colorIdx = localColor(i), look = localLook(i)) {
  const P = COLORS[colorIdx];           // players are named after their colour
  return {
    speedMul: 1, uid: 'L' + i,           // uid: for win counts (online players get the server's id)
    i, x, y: GROUND_Y - PS, w: PS, h: PS, vx: 0, vy: 0, prevX: x, prevY: GROUND_Y - PS,
    onGround: true, ground: null, coyote: 0, buf: 0, face: x < W / 2 ? 1 : -1, sq: 1, dropT: 0,
    blink: rand(1, 4), dead: false, deathAnim: null, springT: 0, springPad: null, best: 0,
    color: P.c, dark: P.d, name: P.name, look: { ...look },
  };
}

// withLobby: build the start scene at the bottom (offline only); PLAY AGAIN / START OVER get a clean tower
function reset(seed, withLobby = true) {
  wseed = seed || (Math.random() * 2147483646 + 1) | 0;
  towerSeed = wseed;                // (kept: the winner animation is picked from it, the same on every computer)
  makeRegionOrder(wseed);   // which regions come in which order (js/level.js)
  // Arena width: online everyone shares one width; offline it fills this window
  W = arenaW();
  resize();
  nextPid = 1;
  camY = 0; time = 0; height = 0; nextMilestone = 50; shake = 0; scrollSpeed = 0;
  fireTimer = 3; newBest = false; outCount = 0;
  particles = []; fireballs = []; warnings = []; texts = []; blades = []; jets = []; zaps = []; bubbles = []; dividers = []; gems = []; runGems = 0;
  startWorld(withLobby && net.status !== 'playing');   // the floor and the first rows (js/level.js)
  players = [];
  const place = (p, n) => {
    const s = spawnPos(p.i, n);
    p.x = p.prevX = s.x; p.y = p.prevY = s.y;
    p.face = s.x < W / 2 ? 1 : -1;
    return p;
  };
  if (net.status === 'playing' && net.roster) {
    // Online: everyone in the match, in the server's order. Cubes from the other computer
    // are moved by that computer and drawn softer, so yours always stand out.
    const n = net.roster.length;
    net.roster.forEach((r, i) => {
      const p = place(mkPlayer(i, 0, r.color, cleanLook(r.look)), n);
      p.remote = r.owner !== net.me;
      p.slot = r.slot;                         // on its own computer: 0 = WASD, 1 = arrow keys
      p.uid = r.id || 'p' + i;                 // stable id across rounds (for win counts)
      p.net = null;
      players.push(p);
    });
    // Names: the name each player typed (or their colour). Yours stays as typed; a repeated name
    // from another computer gets a number ("Pink 2").
    const seen = {};
    for (const p of [...players.filter(q => !q.remote), ...players.filter(q => q.remote)]) {
      const r = net.roster[p.i];
      const nm = (r.name || '').trim() || COLORS[r.color].name;
      seen[nm.toLowerCase()] = (seen[nm.toLowerCase()] || 0) + 1;
      const k = seen[nm.toLowerCase()];
      p.name = k > 1 ? `${nm} ${k}` : nm;
    }
    return;
  }
  // Local: player 1, and player 2 if they've joined
  for (let i = 0; i < playerCount; i++) players.push(place(mkPlayer(i, 0), playerCount));
}
let nextPid = 1;
const alive = () => players.filter(p => !p.dead);

// Seeded random numbers for building the tower, so an online match gets the same tower on both computers
let wseed = 1, towerSeed = 1;
function R() {
  wseed = (wseed + 0x6D2B79F5) | 0;
  let t = Math.imul(wseed ^ (wseed >>> 15), 1 | wseed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const wrand = (a, b) => a + R() * (b - a);
