// RCS — Game state: saved best height, current screen, players, and starting a new tower.
'use strict';

let best = 0;
try { best = parseInt(localStorage.getItem('towerduo.best') || '0', 10) || 0; } catch (e) {}
function saveBest() { try { localStorage.setItem('towerduo.best', String(best)); } catch (e) {} }

// Cube colours for player 1 (also picked on the main menu) and player 2 on this computer, remembered by the browser
let myColor = 0, p2Color = 7;
try {
  const c1 = parseInt(localStorage.getItem('rcs.color'), 10), c2 = parseInt(localStorage.getItem('rcs.color2'), 10);
  if (c1 >= 0 && c1 < COLORS.length) myColor = c1;
  if (c2 >= 0 && c2 < COLORS.length) p2Color = c2;
} catch (e) {}
if (p2Color === myColor) p2Color = (myColor + 3) % COLORS.length;
function saveColor() {
  try { localStorage.setItem('rcs.color', String(myColor)); localStorage.setItem('rcs.color2', String(p2Color)); } catch (e) {}
}
// Colour of the n-th player on this computer
const localColor = n => n === 0 ? myColor : n === 1 ? p2Color : (myColor + n * 3) % COLORS.length;

// ---------- World state ----------
let state = 'title', pausedFrom = 'play';
// Game mode: 'coop' (climb together, one falls = both lose) or 'versus' (race; fall behind = you lose)
let mode = 'coop', winner = -1;
let playerCount = 2;            // human players, 1–4 (versus with 1 adds a bot)
let onlineLocal = 1;            // players on this computer when playing online (1 or 2)
// Button menus: which page we're on, which button has keyboard focus, and the mouse
const ui = { page: 'main', focus: 0, mx: -1, my: -1, mouseMoved: false, click: null };
let localMode = 'coop';                   // Local co-op: 'coop' = same team, 'versus' = race each other
let foundT = 0;                           // "Match found" screen timer

const wins = [0, 0, 0, 0];      // versus score for this session, by player slot
let players, platforms, blades, jets, particles, fireballs, warnings, texts;
let camY, rowK, gen, time, countdown, overT, deathMsg, height, nextMilestone;
let fireTimer, shake, scrollSpeed, newBest;

function mkPlayer(i, x, isBot = false, colorIdx = localColor(i)) {
  const P = isBot ? PAL.bot : { ...COLORS[colorIdx], name: 'Player ' + (i + 1) };
  return {
    bot: isBot, speedMul: isBot ? BOT.speed : 1,
    ai: isBot ? { left: false, right: false, jump: false, jumpPressed: false, down: false, target: null, wait: 0.3, wasGround: true } : null,
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
  fireTimer = 3; newBest = false;
  particles = []; fireballs = []; warnings = []; texts = []; blades = []; jets = [];
  platforms = [{ id: 0, x: WALL, y: GROUND_Y, w: W - 2 * WALL, h: 70, type: 'ground', dx: 0, t: 0, crumbleT: -1, falling: false }];
  // Generator memory: last main-path platform, and whether the last row had a hazard
  gen = { prev: null, prevHaz: false };
  rowK = 1;
  generate();
  players = [];
  const spawnX = (i, n) => W / 2 - PS / 2 + (i - (n - 1) / 2) * 90;
  if (net.status === 'playing' && net.roster) {
    // Online: everyone in the match, in the server's order. Cubes from the other computer
    // are moved by that computer and drawn softer, so yours always stand out.
    const n = net.roster.length;
    net.roster.forEach((r, i) => {
      const p = mkPlayer(i, spawnX(i, n), false, r.color);
      p.remote = r.owner !== net.me;
      p.slot = r.slot;                         // on its own computer: 0 = WASD, 1 = arrow keys
      if (p.remote) { p.color = soften(p.color); p.dark = soften(p.dark, 0.5); }
      p.net = null;
      players.push(p);
    });
    // Names are colour names. Your cubes keep the plain name; a clashing colour from the other
    // computer gets a number ("Pink 2").
    const seen = {};
    for (const p of [...players.filter(q => !q.remote), ...players.filter(q => q.remote)]) {
      const nm = COLORS[net.roster[p.i].color].name;
      seen[nm] = (seen[nm] || 0) + 1;
      p.name = seen[nm] > 1 ? `${nm} ${seen[nm]}` : nm;
    }
    if (net.local === 1) players.find(q => !q.remote).name = 'You';
    return;
  }
  // Humans, plus a bot when playing versus alone; spread evenly across the floor
  const n = playerCount + (mode === 'versus' && playerCount === 1 ? 1 : 0);
  for (let i = 0; i < n; i++) players.push(mkPlayer(i, spawnX(i, n), i >= playerCount));
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
