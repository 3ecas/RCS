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

const PAL = {
  ink: '#2d1b4e', inkSoft: 'rgba(45,27,78,0.62)',
  wall: '#c3b2f0', wallLine: '#9a82e0', nozzle: '#7d63c9',
  ground: '#a68cf0', groundD: '#7457d8',
  normal: '#9b7bff', normalD: '#5b3fd1',
  move: '#22dfa0', moveD: '#0f9c6c',
  tilt: '#ff9a4d', tiltD: '#d2601a',          // seesaw platforms
  spring: '#ffd52e', springD: '#d99a00',
  spike: '#ff2d6f', zap: '#ffd000', zapPost: '#3b2a5e', water: '#2fb5ff', blade: '#3b2a5e', flame: '#ff6233', flame2: '#ffd36b', fire: '#ff4a2a',
  good: '#12a865',
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
// plat: [body, underside] colours of plain platforms there; deco: the platforms' decoration;
// scenery: the shapes drifting in the background
const REGIONS = {
  start:   { has: [],                        bg: ['#ffeedd', '#ffd9e4'], plat: ['#9b7bff', '#5b3fd1'], deco: 'none',    scenery: 'cloud' },   // just platforms
  garden:  { has: ['spring', 'move'],        bg: ['#dcf8ea', '#bff0d8'], plat: ['#5fcf4f', '#2c8f22'], deco: 'grass',   scenery: 'tree' },    // springs and moving platforms
  spikes:  { has: ['spikes', 'move'],        bg: ['#ffe3ee', '#ffc9dd'], plat: ['#ff6fa3', '#c92f6a'], deco: 'crystal', scenery: 'crystal' }, // spikes on moving and still platforms
  seesaw:  { has: ['tilt', 'spring'],        bg: ['#fff4cf', '#ffe2a8'], plat: ['#e9a94a', '#a8691a'], deco: 'planks',  scenery: 'hill' },    // seesaws that tip under your weight
  blades:  { has: ['shuriken', 'move'],      bg: ['#e2e8ff', '#c9d5ff'], plat: ['#6f88e0', '#3a52a8'], deco: 'rivets',  scenery: 'gear' },    // spinning shurikens
  fire:    { has: ['wallflame', 'fireball'], bg: ['#ffe6d6', '#ffcbb0'], plat: ['#df6f4c', '#9e3a1f'], deco: 'embers',  scenery: 'flame' },   // flamethrowers on the walls, falling fireballs
  storm:   { has: ['zapper', 'move'],        bg: ['#ece4ff', '#d7c8ff'], plat: ['#8a63f0', '#552bc2'], deco: 'stripe',  scenery: 'storm' },   // lightning beams between two posts, on and off
  water:   { has: ['bubbles'],               bg: ['#d6f8f6', '#b0eeea'], plat: ['#22bdb8', '#0f8681'], deco: 'drips',   scenery: 'weed' },    // helper: bubble columns push you up
  split:   { has: ['divider', 'move', 'spikes'], bg: ['#f3f7d2', '#e3eca8'], plat: ['#adbd3a', '#71801a'], deco: 'bricks', scenery: 'column' }, // two paths with a wall between them
};
const REGION_POOL = Object.keys(REGIONS).filter(k => k !== 'start');

// Seesaw platforms: how strongly weight tips them, how they spring back, the most they tip,
// and how fast you slide toward the low end
const TILT = { push: 7, spring: 3.5, damp: 3.2, max: 0.5, slide: 230 };
