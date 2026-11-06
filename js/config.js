// RCS — Game settings: sizes, physics, colours and when each obstacle appears.
'use strict';

// The arena is H tall and W wide. W follows the window's shape (wider screens get a wider tower), from
// MIN_W up to MAX_W. Online everyone shares one width (ONLINE_W, 16:9) so all players race the same tower.
let W = 800;
const H = 900, WALL = 40;
const MIN_W = 800, MAX_W = 2400, ONLINE_W = 1600;
const GRAV = 2100, JUMP_V = 860, MAX_VX = 360, SPRING_V = 1400, MAX_FALL = 1300;
const PX_PER_M = 40;
const GROUND_Y = H - 70;
const ROW_GAP = 120;        // every row of platforms sits this far above the last (3 m)
const ROW_WOBBLE = 0.12;    // chance a row is nudged slightly off the grid
const PS = 34;              // player cube size
const STEP = 1 / 120;
const JET_LEN = 150;        // wall flame reach
const DIVIDER_W = 26;        // Two Paths region: the dividing wall's width
const BUBBLE_W = 64, BUBBLE_PUSH = 4600, BUBBLE_MAX = 900;   // water region: column width, upward push, top speed
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, "Helvetica Neue", Arial, sans-serif';

const PAL = {
  ink: '#5b4b6b', inkSoft: 'rgba(91,75,107,0.6)',
  wall: '#dcd2ec', wallLine: '#c7badf', nozzle: '#b4a5d1',
  ground: '#cfc3e8', groundD: '#b6a8d8',
  normal: '#c5b9e6', normalD: '#a99bd3',
  move: '#a8e6cf', moveD: '#7fcfb0',
  tilt: '#ffd3b6', tiltD: '#f0b28c',          // seesaw platforms
  spring: '#fff0a0', springD: '#ecd060',
  spike: '#ff7b9c', zap: '#ffd84a', zapPost: '#6c5b7b', water: '#7cc8ec', blade: '#6c5b7b', flame: '#ff9a76', flame2: '#ffe0a8', fire: '#ff8c69',
  good: '#4fb386',
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
const REGIONS = {
  start:   { has: [],                        bg: ['#fff4e9', '#fde3e6'] },   // just platforms
  garden:  { has: ['spring', 'move'],        bg: ['#e9f7f1', '#d6f0e7'] },   // springs and moving platforms
  spikes:  { has: ['spikes', 'move'],        bg: ['#fde8ef', '#f8d5e1'] },   // spikes on moving and still platforms
  seesaw:  { has: ['tilt', 'spring'],        bg: ['#fff7dc', '#fdeacb'] },   // seesaws that tip under your weight
  blades:  { has: ['shuriken', 'move'],      bg: ['#e8edff', '#d7e0fc'] },   // spinning shurikens
  fire:    { has: ['wallflame', 'fireball'], bg: ['#ffeee2', '#fbd8c6'] },   // flamethrowers on the walls, falling fireballs
  storm:   { has: ['zapper', 'move'],        bg: ['#f1edff', '#e2daf8'] },   // lightning beams between two posts, on and off
  water:   { has: ['bubbles'],               bg: ['#dff8f6', '#c3eeea'] },   // helper: bubble columns push you up
  split:   { has: ['divider', 'move', 'spikes'], bg: ['#f6f8e0', '#e8eec4'] }, // two paths with a wall between them
};
const REGION_POOL = Object.keys(REGIONS).filter(k => k !== 'start');

// Seesaw platforms: how strongly weight tips them, how they spring back, the most they tip,
// and how fast you slide toward the low end
const TILT = { push: 7, spring: 3.5, damp: 3.2, max: 0.5, slide: 230 };
