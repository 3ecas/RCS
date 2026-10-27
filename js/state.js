// RCS — Game state: saved best height, current screen, players, and starting a new tower.
'use strict';

let best = 0;
try { best = parseInt(localStorage.getItem('towerduo.best') || '0', 10) || 0; } catch (e) {}
function saveBest() { try { localStorage.setItem('towerduo.best', String(best)); } catch (e) {} }

// ---------- World state ----------
let state = 'title', pausedFrom = 'play';
// Game mode: 'coop' (climb together, one falls = both lose) or 'versus' (race; fall behind = you lose)
let mode = 'coop', winner = -1;
let playerCount = 2;            // human players, 1–4 (versus with 1 adds a bot)
// Button menus: which page we're on, which button has keyboard focus, and the mouse
const ui = { page: 'main', focus: 0, mx: -1, my: -1, mouseMoved: false, click: null };
let splitMode = 'coop', splitCount = 2;   // split-screen choices
let foundT = 0;                           // "Match found" screen timer

const wins = [0, 0, 0, 0];      // versus score for this session, by player slot
let players, platforms, blades, jets, particles, fireballs, warnings, texts;
let camY, rowK, gen, time, countdown, overT, deathMsg, height, nextMilestone;
let fireTimer, shake, scrollSpeed, newBest;

function mkPlayer(i, x, isBot = false) {
  const P = isBot ? PAL.bot : PAL.players[i];
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
  // Humans, plus a bot when playing versus alone; spread evenly across the floor
  const humans = net.status === 'playing' ? 2 : playerCount;
  const n = humans + (mode === 'versus' && humans === 1 ? 1 : 0);
  players = [];
  for (let i = 0; i < n; i++) players.push(mkPlayer(i, W / 2 - PS / 2 + (i - (n - 1) / 2) * 90, i >= humans));
  if (net.status === 'playing') {
    // Online: one cube is you, the other is your friend (moved by their computer)
    for (const p of players) {
      p.remote = p.i !== net.me;
      p.name = p.remote ? 'Your friend' : 'You';
      p.net = null;
    }
  }
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
