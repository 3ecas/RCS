// RCS — Game settings: sizes, physics, colours and when each obstacle appears.
'use strict';

const W = 800, H = 900, WALL = 40;
const GRAV = 2100, JUMP_V = 860, MAX_VX = 360, SPRING_V = 1400, MAX_FALL = 1300;
const PX_PER_M = 40;
const GROUND_Y = H - 70;
const ROW_GAP = 120;        // every row of platforms sits this far above the last (3 m)
const ROW_WOBBLE = 0.12;    // chance a row is nudged slightly off the grid
const PS = 34;              // player cube size
const STEP = 1 / 120;
const JET_LEN = 150;        // wall flame reach
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, "Helvetica Neue", Arial, sans-serif';

const PAL = {
  ink: '#5b4b6b', inkSoft: 'rgba(91,75,107,0.6)',
  wall: '#dcd2ec', wallLine: '#c7badf', nozzle: '#b4a5d1',
  ground: '#cfc3e8', groundD: '#b6a8d8',
  normal: '#c5b9e6', normalD: '#a99bd3',
  move: '#a8e6cf', moveD: '#7fcfb0',
  crumble: '#ffd3b6', crumbleD: '#f0b28c',
  spring: '#fff0a0', springD: '#ecd060',
  spike: '#ff7b9c', blade: '#6c5b7b', flame: '#ff9a76', flame2: '#ffe0a8', fire: '#ff8c69',
  good: '#4fb386',
  bot: { c: '#d4cde3', d: '#9d93b5', name: 'Bot' },
};

// The 10 cube colours players can pick from (c = body, d = darker outline)
const COLORS = [
  { name: 'Pink',   c: '#ff9ac4', d: '#e0609b' },
  { name: 'Coral',  c: '#ff8a7a', d: '#e0574a' },
  { name: 'Orange', c: '#ffb066', d: '#e3842f' },
  { name: 'Lemon',  c: '#ffe066', d: '#d4b12c' },
  { name: 'Lime',   c: '#b4e46a', d: '#7fb535' },
  { name: 'Mint',   c: '#6fdcaa', d: '#36ad78' },
  { name: 'Teal',   c: '#5fd2d6', d: '#2aa3a8' },
  { name: 'Sky',    c: '#7fbcff', d: '#4689dd' },
  { name: 'Violet', c: '#b49aff', d: '#8164e0' },
  { name: 'Mocha',  c: '#cfa98a', d: '#9e7656' },
];
// Background colour bands [top, bottom] that drift as you climb
const BG = [
  ['#fff4e9', '#fde3e6'], ['#e9f7f1', '#d6f0e7'], ['#e8edff', '#d7e0fc'],
  ['#f7e9f6', '#ecd8f1'], ['#fff7dc', '#fdeacb'],
];


// When each obstacle first appears (metres) — the difficulty curve
const STAGES = [
  { m: 15,  key: 'spring' },     // springs
  { m: 30,  key: 'move' },       // moving platforms
  { m: 50,  key: 'spikes' },
  { m: 90,  key: 'crumble' },    // crumbling floors
  { m: 120, key: 'shuriken' },
  { m: 160, key: 'wallflame' },  // flames from the side walls
  { m: 230, key: 'fireball' },   // falling fireballs
];
const unlock = Object.fromEntries(STAGES.map(s => [s.key, s.m]));
