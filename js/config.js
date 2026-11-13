// RCS — Game settings: sizes, physics, colours and when each obstacle appears.
'use strict';

// The arena is H tall and ARENA_W wide, the same for everyone (offline and online). A wider window shows
// more of the tower's side walls around it.
const ARENA_W = 880;
let W = ARENA_W;
const H = 900, WALL = 40;
const GRAV = 2100, JUMP_V = 860, MAX_VX = 360, SPRING_V = 1400, MAX_FALL = 1300;
const PX_PER_M = 40;
const GROUND_Y = H - 70;
const ROW_GAP = 120;        // every row of platforms sits this far above the last (3 m)
const ROW_WOBBLE = 0.12;    // chance a row is nudged slightly off the grid
const PS = 34;              // player cube size
const STEP = 1 / 120;
const JET_LEN = 330, JET_THICK = 38;   // wall flamethrowers: reach and flame thickness
const PJET_LEN = 250, PJET_THICK = 32; // flamethrowers on platforms
const DIVIDER_W = 26;        // Two Paths region: the dividing wall's width
// Wall jumping: push into a wall in mid-air to hang on it (sliding down slowly); press the other way to jump
// up and off it toward that side
const WALLJUMP_V = 820, WALLJUMP_PUSH = 400, WALL_SLIDE = 90;
// How forgiving the wall jump is: how close to a wall counts (px), how long after leaving it, and how long a
// press made just before reaching it is remembered (seconds)
const WALL_REACH = 26, WALL_COYOTE = 0.14, WALL_BUFFER = 0.16;
const GEMS_ON = false;       // gems are switched off for now (true brings them back, with wardrobe unlocks)
const GEM_R = 12;            // gems: pick-up radius
const BUBBLE_W = 64, BUBBLE_PUSH = 4600, BUBBLE_MAX = 900;   // water region: column width, upward push, top speed
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, "Helvetica Neue", Arial, sans-serif';

// The "Soft Ascent" style (design/soft-ascent.md): pastel pairs, a soft face and a deeper edge
const PAL = {
  ink: '#4a3b63', inkSoft: 'rgba(74,59,99,0.58)',
  wall: '#ece4f7', wallLine: '#d3c5ec', nozzle: '#b3a1dd',
  ground: '#d9cbf5', groundD: '#9a84d6',
  normal: '#c8b6f2', normalD: '#9a84d6',       // lilac
  move: '#a8e6cf', moveD: '#6cbf9f',           // mint
  tilt: '#ffc7a1', tiltD: '#e39a6c',           // apricot: seesaw platforms
  spring: '#ffe7a0', springD: '#d9b85c',       // butter
  spike: '#e86a98', zap: '#f5c542', zapPost: '#4a3b63', water: '#a8d4f5', blade: '#4a3b63', flame: '#ff9d7a', flame2: '#ffe2b0', fire: '#f98b6c',
  good: '#4cb38a',
};
// The 10 cube colours players can pick from (c = body, d = darker outline)
const COLORS = [
  { name: 'Pink',   c: '#ff4fa3', d: '#c21f72' },
  { name: 'Red',    c: '#ff5a4e', d: '#c42a20' },
  { name: 'Orange', c: '#ff9a1f', d: '#cc6a00' },
  { name: 'Yellow', c: '#ffd60a', d: '#c9a200' },
  { name: 'Lime',   c: '#8be22b', d: '#559e0c' },
  { name: 'Green',  c: '#1fcf7a', d: '#0c9152' },
  { name: 'Teal',   c: '#14c8d4', d: '#088d97' },
  { name: 'Blue',   c: '#3d8bff', d: '#1b5bc4' },
  { name: 'Purple', c: '#9b5cff', d: '#6a2fd1' },
  { name: 'Brown',  c: '#b8743d', d: '#7f4a1f' },
];
// The tower is split into regions, each with its own hazards and background colours [top, bottom].
// You start in a plain region (just platforms) for the first START_REGION metres; after that a new region
// begins every REGION_LEN metres, picked at random (never the same twice in a row). Hazards inside a region
// get harder the higher you are (see heat() in js/level.js).
const START_REGION = 100, REGION_LEN = 200;
// plat: [face, edge] colours of plain platforms there; shapes: the geometric shapes drifting in the background
const REGIONS = {
  start:   { has: [],                        bg: ['#fff8f1', '#fde9ee'], plat: ['#c8b6f2', '#9a84d6'], shapes: ['dot', 'ring'] },          // just platforms
  garden:  { has: ['spring', 'move'],        bg: ['#f0faf3', '#e0f4e8'], plat: ['#bfe3a8', '#86bd6c'], shapes: ['dot', 'ring', 'dot'] },   // springs and moving platforms
  spikes:  { has: ['spikes', 'move'],        bg: ['#fff1f5', '#fde2eb'], plat: ['#f7a8c4', '#d97a9f'], shapes: ['tri'] },                 // spikes on moving and still platforms
  seesaw:  { has: ['tilt', 'spring'],        bg: ['#fffaea', '#fff0cf'], plat: ['#ffe7a0', '#d9b85c'], shapes: ['bar', 'dot'] },          // seesaws that tip under your weight
  blades:  { has: ['shuriken', 'move'],      bg: ['#f1f6ff', '#e2edfc'], plat: ['#a8d4f5', '#6fa5d6'], shapes: ['plus', 'sq'] },          // spinning shurikens
  fire:    { has: ['wallflame', 'fireball'], bg: ['#fff4ec', '#ffe5d6'], plat: ['#ffc7a1', '#e39a6c'], shapes: ['tri', 'dot'] },          // flamethrowers on the walls, falling fireballs
  storm:   { has: ['zapper', 'move'],        bg: ['#f6f1ff', '#ebe2fc'], plat: ['#d4c2f7', '#8e74d0'], shapes: ['plus', 'ring'] },        // lightning beams between two posts, on and off
  water:   { has: ['bubbles'],               bg: ['#effbfb', '#dcf4f4'], plat: ['#a6e3e3', '#5fb7b9'], shapes: ['ring', 'dot'] },         // helper: bubble columns push you up
  split:   { has: ['divider', 'move', 'spikes'], bg: ['#fafbea', '#f0f3d4'], plat: ['#dbe4a6', '#a6b45e'], shapes: ['sq', 'bar'] }, // two paths with a wall between them
};
const REGION_POOL = Object.keys(REGIONS).filter(k => k !== 'start');

// Seesaw platforms: how strongly weight tips them, how they spring back, the most they tip,
// and how fast you slide toward the low end
const TILT = { push: 7, spring: 3.5, damp: 3.2, max: 0.5, slide: 230 };
