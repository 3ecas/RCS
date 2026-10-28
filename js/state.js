// RCS — Game state: saved best height, current screen, players, and starting a new tower.
'use strict';

let best = 0;
try { best = parseInt(localStorage.getItem('towerduo.best') || '0', 10) || 0; } catch (e) {}
function saveBest() { try { localStorage.setItem('towerduo.best', String(best)); } catch (e) {} }

// Names and cube colours for player 1 (you) and player 2 (split screen), picked on the setup screen
// after choosing a mode, and remembered by the browser
let myColor = 0, p2Color = 7, playerName = '', p2Name = '';
try {
  const c1 = parseInt(localStorage.getItem('rcs.color'), 10), c2 = parseInt(localStorage.getItem('rcs.color2'), 10);
  if (c1 >= 0 && c1 < COLORS.length) myColor = c1;
  if (c2 >= 0 && c2 < COLORS.length) p2Color = c2;
  playerName = (localStorage.getItem('rcs.name') || '').slice(0, 12);
  p2Name = (localStorage.getItem('rcs.name2') || '').slice(0, 12);
} catch (e) {}
if (p2Color === myColor) p2Color = (myColor + 3) % COLORS.length;
function saveColor() {
  try { localStorage.setItem('rcs.color', String(myColor)); localStorage.setItem('rcs.color2', String(p2Color)); } catch (e) {}
}
const localColor = n => n === 0 ? myColor : p2Color;

// ---------- World state ----------
let state = 'title', pausedFrom = 'play';
// Game mode: 'solo' (climb alone), 'split' (two players, one keyboard, same team: if one falls both lose)
// or 'versus' (online race: last one standing wins)
let mode = 'solo', winner = -1;
let playerCount = 1;            // players on this keyboard: 1, or 2 in split screen
// Button menus: which page we're on, which button has keyboard focus, and the mouse
// setup: which mode the setup screen (names + colours) is for: 'solo', 'split' or 'multi'
const ui = { page: 'main', focus: 0, mx: -1, my: -1, mouseMoved: false, click: null, help: false, setup: 'solo' };
let foundT = 0;                           // "Match found" screen timer

// Online race wins this session, by player id (so they stay right as people join and leave the room)
const wins = {};
const winsOf = p => wins[p.uid] || 0;
let players, platforms, blades, jets, particles, fireballs, warnings, texts;
let camY, rowK, gen, time, countdown, overT, deathMsg, height, nextMilestone;
let fireTimer, shake, scrollSpeed, newBest;
let outCount = 0;               // order players are knocked out in (for the leaderboard)

function mkPlayer(i, x, colorIdx = localColor(i)) {
  const typed = i === 0 ? playerName : i === 1 ? p2Name : '';
  const P = { ...COLORS[colorIdx], name: typed.trim() || 'Player ' + (i + 1) };
  return {
    speedMul: 1,
    i, x, y: GROUND_Y - PS, w: PS, h: PS, vx: 0, vy: 0, prevX: x, prevY: GROUND_Y - PS,
    onGround: true, ground: null, coyote: 0, buf: 0, face: x < W / 2 ? 1 : -1, sq: 1, dropT: 0,
    blink: rand(1, 4), dead: false, springT: 0, springPad: null, best: 0,
    color: P.c, dark: P.d, name: P.name,
  };
}

function reset(seed) {
  wseed = seed || (Math.random() * 2147483646 + 1) | 0;
  nextPid = 1;
  camY = 0; time = 0; height = 0; nextMilestone = 50; shake = 0; scrollSpeed = 0;
  fireTimer = 3; newBest = false; outCount = 0;
  particles = []; fireballs = []; warnings = []; texts = []; blades = []; jets = [];
  platforms = [{ id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, t: 0, crumbleT: -1, falling: false }];
  // Generator memory: last main-path platform, and whether the last row had a hazard
  gen = { prev: null, prevHaz: false };
  rowK = 1;
  generate();
  players = [];
  // Spread the cubes evenly across the floor (closer together when there are many)
  const spawnX = (i, n) => W / 2 - PS / 2 + (i - (n - 1) / 2) * Math.min(90, (W - 2 * WALL - PS - 20) / Math.max(1, n - 1));
  if (net.status === 'playing' && net.roster) {
    // Online: everyone in the match, in the server's order. Cubes from the other computer
    // are moved by that computer and drawn softer, so yours always stand out.
    const n = net.roster.length;
    net.roster.forEach((r, i) => {
      const p = mkPlayer(i, spawnX(i, n), r.color);
      p.remote = r.owner !== net.me;
      p.slot = r.slot;                         // on its own computer: 0 = WASD, 1 = arrow keys
      p.uid = r.id || 'p' + i;                 // stable id across rounds (for win counts)
      if (p.remote) { p.color = soften(p.color); p.dark = soften(p.dark, 0.5); }
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
  // Local: just you (Solo), or you and player 2 (Split screen)
  for (let i = 0; i < playerCount; i++) players.push(mkPlayer(i, spawnX(i, playerCount)));
}
let nextPid = 1;
const alive = () => players.filter(p => !p.dead);

// Seeded random numbers for building the tower, so an online match gets the same tower on both computers
let wseed = 1;
function R() {
  wseed = (wseed + 0x6D2B79F5) | 0;
  let t = Math.imul(wseed ^ (wseed >>> 15), 1 | wseed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const wrand = (a, b) => a + R() * (b - a);
