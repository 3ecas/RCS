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
  ink: '#3d2c5c', inkSoft: 'rgba(61,44,92,0.6)',
  wall: '#d2c6f0', wallLine: '#ab98e0', nozzle: '#9580cf',
  ground: '#b9a6ee', groundD: '#8f78dc',
  normal: '#b29df5', normalD: '#7a62d6',
  move: '#6fe0b8', moveD: '#2fae84',
  tilt: '#ffb98a', tiltD: '#e0844a',          // seesaw platforms
  spring: '#ffe066', springD: '#e0b020',
  spike: '#ff4f86', zap: '#ffd633', zapPost: '#4a3a6e', water: '#5ec2f2', blade: '#4a3a6e', flame: '#ff7f57', flame2: '#ffdc95', fire: '#ff6845',
  good: '#22a970',
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
  start:   { has: [],                        bg: ['#fff1e3', '#ffdfe8'], plat: ['#b29df5', '#7a62d6'], deco: 'none',    scenery: 'cloud' },   // just platforms
  garden:  { has: ['spring', 'move'],        bg: ['#e3f7ec', '#cdf1de'], plat: ['#8fd67e', '#4fa043'], deco: 'grass',   scenery: 'tree' },    // springs and moving platforms
  spikes:  { has: ['spikes', 'move'],        bg: ['#ffe8f0', '#ffd3e3'], plat: ['#ff9cbf', '#d9558a'], deco: 'crystal', scenery: 'crystal' }, // spikes on moving and still platforms
  seesaw:  { has: ['tilt', 'spring'],        bg: ['#fff6d8', '#ffe8bb'], plat: ['#f0c27a', '#bd8a3c'], deco: 'planks',  scenery: 'hill' },    // seesaws that tip under your weight
  blades:  { has: ['shuriken', 'move'],      bg: ['#e6ebff', '#d2dcff'], plat: ['#9aaee8', '#5b72bd'], deco: 'rivets',  scenery: 'gear' },    // spinning shurikens
  fire:    { has: ['wallflame', 'fireball'], bg: ['#ffebdf', '#ffd4bf'], plat: ['#ea9878', '#b55a3c'], deco: 'embers',  scenery: 'flame' },   // flamethrowers on the walls, falling fireballs
  storm:   { has: ['zapper', 'move'],        bg: ['#efe8ff', '#ded2ff'], plat: ['#ae92f2', '#7653d0'], deco: 'stripe',  scenery: 'storm' },   // lightning beams between two posts, on and off
  water:   { has: ['bubbles'],               bg: ['#dbf8f6', '#bff0ec'], plat: ['#6fd3cf', '#2fa29d'], deco: 'drips',   scenery: 'weed' },    // helper: bubble columns push you up
  split:   { has: ['divider', 'move', 'spikes'], bg: ['#f5f8db', '#e8eeb8'], plat: ['#c6d16e', '#8c9a35'], deco: 'bricks', scenery: 'column' }, // two paths with a wall between them
};
const REGION_POOL = Object.keys(REGIONS).filter(k => k !== 'start');

// Seesaw platforms: how strongly weight tips them, how they spring back, the most they tip,
// and how fast you slide toward the low end
const TILT = { push: 7, spring: 3.5, damp: 3.2, max: 0.5, slide: 230 };
