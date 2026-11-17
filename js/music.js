// RCS — Music and ambience, generated with the Web Audio API (no sound files).
//
// The music is 8-bit chiptune: pulse waves (12.5%, 25% and 50% duty, like an old console's square
// channels) for melodies and arpeggios, a triangle for the bass, and short noise bursts for the drums.
// Songs, each a long loop (an A and a B section) that keeps going for as long as you stay:
//  - LOBBY (start scene, online rooms, lobbies, wardrobe): sunny and bouncy, F major, 104 bpm.
//  - OVER (after a solo run): happy and easy, C major, 112 bpm.
//  - WIN (the race results): a triumphant fanfare loop, C major, 132 bpm.
//  - GAME: seven songs, each run plays the next one (PASTEL — friendly and cute, the beat coming in as you
//    climb — then CLIMB, SPRINT, SKY, NEON, GROOVE, STORM: different keys,
//    tempos, bass lines, arpeggios and beats). Each is driving from the start and builds as you climb:
//    faster (+42 bpm at the top), a snare, busier hats and bass, a second arpeggio, the tune, a counter-melody.
// Changing scene crossfades: the old song keeps playing while it fades out and the new one fades in.
// During the slow-motion finale everything fades away, then the WIN song comes in with the results.
// Notes are scheduled a little ahead with a look-ahead timer, so the beat stays steady.
//
// Ambience: a few soft loops whose volume follows what's near your cube — a clean rush of air while a water
// current carries you up, a hum near moving platforms, bubbling near water columns, a whirr near shurikens,
// crackle near flames.
'use strict';

const MUSIC_VOL = 0.38;   // (the whole band; sound effects are louder than this)
const FADE = 0.55;        // crossfade time constant (s): a song fades out / in over about two seconds
const music = { I: 0, target: 0, timer: null, tracks: {}, song: null };
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

// ---- 8-bit instruments ----
const pulseWaves = new Map();
function pulse(duty) {   // a pulse wave of this duty cycle (cached per audio context)
  const key = duty + '|' + (actx && actx.sampleRate);
  if (pulseWaves.has(key) && pulseWaves.get(key).ctx === actx) return pulseWaves.get(key).w;
  const N = 32, re = new Float32Array(N), im = new Float32Array(N);
  for (let n = 1; n < N; n++) {   // (the Fourier series of a pulse with this duty)
    re[n] = (2 / (n * Math.PI)) * Math.sin(2 * n * Math.PI * duty); im[n] = (2 / (n * Math.PI)) * (1 - Math.cos(2 * n * Math.PI * duty)); }
  const w = actx.createPeriodicWave(re, im, { disableNormalization: false });
  pulseWaves.set(key, { w, ctx: actx });
  return w;
}
function trackBus(song) {
  let tr = music.tracks[song];
  if (!tr || tr.ctx !== actx) {
    const bus = actx.createGain(); bus.gain.value = 0; bus.connect(actx.destination);
    tr = music.tracks[song] = { bus, ctx: actx, step: 0, next: 0, on: false, offAt: 0 };
  }
  return tr.bus;
}
// One chip note: instant attack, a short hold, then a quick release (no slow swells)
function chip(song, wave, freq, t, dur, vol) {
  const o = actx.createOscillator(), g = actx.createGain();
  if (wave === 'tri') o.type = 'triangle'; else o.setPeriodicWave(pulse(wave));
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol * 0.75, t + dur * 0.55);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(trackBus(song));
  o.start(t); o.stop(t + dur + 0.02);
}
function noiseSrc() {
  if (!noiseBuf || noiseBuf.sampleRate !== actx.sampleRate) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = actx.createBufferSource(); s.buffer = noiseBuf; return s;
}
function hit(t, dur, vol, ftype, freq, bus) {   // a filtered noise burst (drums, crackles)
  const s = noiseSrc(), f = actx.createBiquadFilter(), g = actx.createGain();
  f.type = ftype; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
// chip drums: a kick that drops in pitch, a noise snare with a little tone, a short tick hat
function kick(song, t, vol = 0.14) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
  g.gain.setValueAtTime(vol, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g).connect(trackBus(song)); o.start(t); o.stop(t + 0.15);
}
function snare(song, t, vol = 0.05) { hit(t, 0.11, vol, 'highpass', 1800, trackBus(song)); chip(song, 'tri', 200, t, 0.06, vol * 0.8); }
function hat(song, t, vol = 0.018) { hit(t, 0.025, vol, 'highpass', 9000, trackBus(song)); }

// ---- The songs (bars of 16 sixteenth-steps; melodies are 8 eighth-notes a bar, MIDI numbers, -1 = rest) ----
const C = [60, 64, 67], G = [55, 59, 62], Am = [57, 60, 64], F = [53, 57, 60], Em = [52, 55, 59], E = [52, 56, 59], Dm = [50, 53, 57];
// A song: its bars [chord (root first), melody], its tempo (I: the game's intensity 0 … 1), and its style:
// how the bass, the arpeggio and the drums play. dynamic: layers come in with the intensity (game songs).
// (opts: lead — the tune's pulse duty, 0.5 by default; leadFrom — the intensity the tune comes in at, in a game song)
const song = (bpm, bars, bass, arp, drums, dynamic = false, opts = {}) => ({ bpm, bars, bass, arp, drums, dynamic, ...opts });

// A seeded melody for the generated game songs: a phrase per section, strong beats on chord tones, the rest
// walking up and down the scale (so each song has its own tune, the same every time it plays)
function makeTune(seed, scale, prog, rhythm) {
  let x = seed >>> 0;
  const rnd = () => { x = (x + 0x6D2B79F5) | 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const notes = []; for (let o = 0; o < 3; o++) for (const d of scale) notes.push(69 + ((d - 9 + 120) % 12) - 12 + o * 12);
  notes.sort((a, b) => a - b);
  const pool = notes.filter(n => n >= 69 && n <= 93);
  let k = Math.floor(pool.length / 2);
  return prog.map((ch, b) => rhythm[b % rhythm.length].map((on, i) => {
    if (!on) return -1;
    if (i % 4 === 0) {   // a chord tone on the strong beats, near where the tune is
      const tones = pool.map((n, j) => [n, j]).filter(([n]) => ch.some(c => (n - c) % 12 === 0));
      [, k] = tones.reduce((a, t) => Math.abs(t[1] - k) < Math.abs(a[1] - k) ? t : a, tones[0]);
    } else k = clamp(k + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)], 0, pool.length - 1);
    return pool[k];
  }));
}
// 16 bars from a progression: A A B A (the second A ends on the home note)
function arrange(A, B, tuneA, tuneB) {
  const end = tuneA[3].map((n, i) => i === 0 ? A[0][0] + 24 : i < 4 ? n : -1);
  return [...A.map((c, i) => [c, tuneA[i]]), ...A.map((c, i) => [c, i === 3 ? end : tuneA[i]]), ...B.map((c, i) => [c, tuneB[i]]), ...A.map((c, i) => [c, tuneA[i]])];
}
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
const scaleOf = (root, steps) => steps.map(s => (root + s) % 12);
const R1 = [[1, 0, 1, 1, 1, 0, 1, 0], [1, 0, 1, 0, 1, 1, 1, 0]], R2 = [[1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1, 0]], R3 = [[1, 0, 0, 1, 1, 0, 1, 0], [1, 0, 1, 0, 1, 0, 1, 1]];
function genSong(bpm0, A, B, key, mode, seed, rhythm, bass, arp, drums) {
  const sc = scaleOf(key, mode);
  return song(I => bpm0 + 42 * I, arrange(A, B, makeTune(seed, sc, A, rhythm), makeTune(seed * 7 + 3, sc, B, rhythm)), bass, arp, drums, true);
}
const Bb = [46, 50, 53], A_ = [45, 49, 52], Dm2 = [50, 53, 57], B_ = [47, 51, 54], Csm = [49, 52, 56], A2 = [45, 49, 52], E2 = [52, 56, 59];
const Fsm = [54, 57, 61], D_ = [50, 54, 57], Ab = [44, 48, 51], Eb = [51, 55, 58], Cm = [48, 51, 55], Bb2 = [46, 50, 53], Em2 = [52, 55, 59], D2 = [50, 54, 57];

const SONGS = {
  // The lobby: sunny and bouncy, F major — F C Dm Bb, F C Bb C
  lobby: song(() => 104, [
    [[53, 57, 60], [77, -1, 81, 84, 81, -1, 77, 79]], [[48, 52, 55], [79, -1, 76, 72, 76, -1, 79, -1]], [[50, 53, 57], [77, -1, 74, 77, 81, -1, 79, 77]], [[46, 50, 53], [74, -1, 77, -1, 82, -1, 81, 79]],
    [[53, 57, 60], [77, -1, 81, 84, 86, -1, 84, 81]], [[48, 52, 55], [79, -1, 84, -1, 79, -1, 76, -1]], [[46, 50, 53], [77, 79, 81, 82, 81, 79, 77, 74]], [[48, 52, 55], [72, -1, 76, -1, 79, -1, -1, -1]],
    [[50, 53, 57], [81, -1, 77, 81, 86, -1, 84, -1]], [[46, 50, 53], [82, -1, 77, 82, 86, -1, 84, 82]], [[53, 57, 60], [81, -1, 84, 81, 77, -1, 81, -1]], [[48, 52, 55], [79, 81, 79, 76, 72, -1, 76, 79]],
    [[50, 53, 57], [81, -1, 77, 74, 77, -1, 81, -1]], [[46, 50, 53], [82, -1, 86, 82, 77, -1, 74, -1]], [[48, 52, 55], [76, -1, 79, 84, 79, -1, 76, 72]], [[53, 57, 60], [77, -1, -1, -1, -1, -1, -1, -1]],
  ], 'hop', 'updown', 'light'),
  // After a solo run (the old lobby tune): happy and easy, C major — C G Am F
  over: song(() => 112, [
    [C, [72, -1, 76, 79, 76, -1, 72, 74]], [G, [74, -1, 79, 83, 81, 79, -1, 74]], [Am, [76, -1, 81, 79, 76, -1, 72, 76]], [F, [77, 76, 74, 72, -1, -1, 69, -1]],
    [C, [72, -1, 76, 79, 76, -1, 79, 84]], [G, [83, -1, 79, 74, 79, -1, 83, 86]], [Am, [84, -1, 81, 76, 81, -1, 84, 81]], [F, [77, -1, 81, 77, 72, -1, -1, -1]],
    [F, [81, -1, 79, 77, -1, 77, 79, 81]], [G, [83, -1, 81, 79, -1, 79, 81, 83]], [Em, [84, 83, 79, 76, -1, 79, 76, -1]], [Am, [76, -1, 72, 76, 81, -1, -1, -1]],
    [F, [77, -1, 81, 84, 81, -1, 77, -1]], [G, [79, -1, 83, 86, 83, -1, 79, -1]], [C, [84, -1, 79, 76, 79, -1, 84, -1]], [C, [72, -1, -1, -1, -1, -1, -1, -1]],
  ], 'hop', 'up', 'light'),
  // The race results: a fanfare — C F G C, Am F G C
  win: song(() => 132, [
    [C, [72, 72, 72, 76, 79, -1, 76, 79]], [F, [81, -1, 77, 81, 84, -1, 81, -1]], [G, [79, -1, 83, 86, 83, 79, 74, -1]], [C, [84, -1, -1, 79, 84, -1, -1, -1]],
    [Am, [76, -1, 72, 76, 81, -1, 76, -1]], [F, [77, -1, 81, 84, 89, -1, 84, -1]], [G, [86, 84, 83, 81, 79, 77, 76, 74]], [C, [72, -1, 76, -1, 79, -1, 84, -1]],
  ], 'march', 'none', 'march'),
};
// Seven game songs; each run plays the next one
const Bm = [47, 50, 54];
const GAME_SONGS = [
  song(I => 102 + 50 * I, [   // 0 PASTEL — G major, friendly and cute: a tinkly tune over a hopping bass; the beat
    // comes in as you climb (a kick, then four on the floor and a snare) and it speeds up a lot
    [G, [79, -1, 83, -1, 86, 83, 79, -1]], [Em, [79, -1, 83, 81, 79, -1, 76, -1]], [C, [76, -1, 79, -1, 84, 83, 81, -1]], [D2, [81, 79, 78, -1, 74, -1, -1, -1]],
    [G, [79, -1, 83, -1, 86, -1, 88, 86]], [Em, [83, -1, 79, -1, 76, 79, 83, -1]], [C, [84, -1, 83, 81, 79, -1, 76, 79]], [D2, [78, -1, 81, -1, 79, -1, -1, -1]],
    [C, [84, -1, 84, 86, 88, -1, 84, -1]], [D2, [86, -1, 86, 88, 90, -1, 86, -1]], [Bm, [86, -1, 83, -1, 79, -1, 83, -1]], [Em, [83, 81, 79, 76, -1, 79, -1, -1]],
    [C, [84, -1, 88, -1, 91, -1, 88, 84]], [D2, [86, -1, 90, -1, 93, -1, 90, 86]], [G, [91, -1, 86, -1, 83, -1, 79, -1]], [G, [79, -1, -1, -1, -1, -1, -1, -1]],
  ], 'hop', 'spread', 'cute', true, { lead: 0.125, leadFrom: -1 }),
  song(I => 126 + 42 * I, [   // 1 CLIMB — A minor, driving
    [Am, [81, -1, 81, 84, 81, 79, 76, -1]], [F, [77, -1, 77, 81, 77, 76, 72, -1]], [C, [76, -1, 76, 79, 76, 74, 72, 74]], [G, [74, -1, 74, 79, 83, -1, 81, 79]],
    [Am, [81, -1, 81, 84, 88, 84, 81, -1]], [F, [77, -1, 81, 84, 81, 77, 72, -1]], [C, [76, -1, 79, 84, 79, 76, 72, 76]], [G, [79, -1, 83, 86, 83, 79, 74, 79]],
    [F, [72, 77, 81, 77, 72, 77, 81, 84]], [G, [74, 79, 83, 79, 74, 79, 83, 86]], [Am, [88, -1, 84, -1, 81, -1, 76, -1]], [E, [80, 83, 88, 83, 80, 83, 88, 92]],
    [Am, [81, 84, 88, 84, 81, 84, 88, 93]], [F, [89, 88, 84, 81, 77, 81, 84, 89]], [C, [88, 84, 79, 76, 79, 84, 88, 91]], [G, [86, 83, 79, 74, 79, 83, 86, 91]],
  ], 'pump', 'up', 'four', true),
  genSong(132, [Dm2, Bb, C, A_], [Bb, C, Dm2, A_], 2, MIN, 11, R2, 'gallop', 'updown', 'rock'),       // 2 SPRINT — D minor, galloping
  genSong(124, [E2, B_, Csm, A2], [A2, B_, Csm, B_], 4, MAJ, 23, R1, 'off', 'broken', 'four'),         // 3 SKY — E major, bright
  genSong(128, [Fsm, D_, A2, E2], [D_, E2, Fsm, E2], 6, MIN, 37, R3, 'drive', 'up', 'break'),          // 4 NEON — F# minor, pulsing
  genSong(120, [G, Em2, C, D2], [C, D2, Em2, D2], 7, MAJ, 41, R1, 'walk', 'spread', 'rock'),           // 5 GROOVE — G major, walking bass
  genSong(130, [Cm, Ab, Eb, Bb2], [Ab, Bb2, Cm, Bb2], 0, MIN, 53, R2, 'pump', 'updown', 'four'),        // 6 STORM — C minor, epic
];
const lobbyBpm = () => SONGS.lobby.bpm(0), gameBpm = I => GAME_SONGS[music.gameIdx || 0].bpm(I);

// One sixteenth-note step of a song. Dynamic (game) songs bring their layers in with the intensity I.
function playStep(spec, S, s, t, I) {
  const bar = Math.floor(s / 16) % spec.bars.length, pos = s % 16, [ch, mel] = spec.bars[bar], sx = 60 / spec.bpm(I) / 4;
  const on = th => !spec.dynamic || I > th, lift = spec.dynamic ? I : 0.5;
  // drums
  const D = spec.drums;
  if (D === 'four') { if (pos % 4 === 0) kick(S, t, 0.13 + 0.04 * lift); if (on(0.15) && (pos === 4 || pos === 12)) snare(S, t, 0.045 + 0.02 * lift); }
  else if (D === 'rock') { if ([0, 6, 8, 11].includes(pos)) kick(S, t, 0.14); if (pos === 4 || pos === 12) snare(S, t, 0.05); }
  else if (D === 'break') { if ([0, 7, 10].includes(pos)) kick(S, t, 0.14); if (pos === 4 || pos === 12) snare(S, t, 0.05); if (on(0.3) && pos === 15) snare(S, t, 0.025); }
  else if (D === 'light') { if (pos === 0 || pos === 8) kick(S, t, 0.11); if (pos === 4 || pos === 12) snare(S, t, 0.03); }
  else if (D === 'cute') { if (on(0.25) && (pos === 0 || pos === 8 || (on(0.55) && pos % 4 === 0))) kick(S, t, 0.1 + 0.05 * I); if (on(0.45) && (pos === 4 || pos === 12)) snare(S, t, 0.04); }
  else if (D === 'march') { if (pos === 0 || pos === 8) kick(S, t, 0.13); if (pos === 4 || pos === 12) snare(S, t, 0.045); if (bar % 2 === 1 && pos >= 12) snare(S, t, 0.025); }
  if (pos % 4 === 2) hat(S, t, D === 'light' ? 0.012 : 0.022); else if (on(0.45) && pos % 2 === 1) hat(S, t, 0.012);
  if (spec.dynamic && I > 0.6 && bar % 4 === 3 && pos >= 12) snare(S, t, 0.03);   // a fill before each section
  // triangle bass
  const root = ch[0] - 12, B = spec.bass, busy = spec.dynamic && I > 0.65;
  let b = null, len = 1.6;
  if (B === 'hop') b = { 0: 0, 6: 7, 8: 12, 12: 7, 14: 0 }[pos];
  else if (B === 'pump') { if (pos % 2 === 0 || busy) b = pos % 4 === 2 ? 12 : 0; if (busy) len = 0.9; }
  else if (B === 'gallop') { if ([0, 2, 3].includes(pos % 4)) b = pos % 4 === 0 ? 0 : 12; len = 0.9; }
  else if (B === 'off') { if (pos === 0) b = 0; else if (pos % 4 === 2) b = 12; }
  else if (B === 'drive') { b = pos % 8 === 6 ? 7 : 0; len = 0.8; }
  else if (B === 'walk') { if (pos % 4 === 0) b = [0, ch[1] - ch[0], ch[2] - ch[0], 12][pos / 4]; len = 3.2; }
  else if (B === 'march') { if (pos % 4 === 0) b = pos === 8 ? 7 : 0; len = 2.5; }
  if (b !== undefined && b !== null) chip(S, 'tri', midi(root + b), t, sx * len, 0.12);
  // arpeggio (25% pulse), and a second, thinner one up an octave as it builds
  const ARP = { up: [0, 1, 2, 1], updown: [0, 1, 2, 1, 0, 2], broken: [0, 2, 1, 2], spread: [0, 1, 2, 3] }[spec.arp];
  if (ARP) {
    const i = ARP[pos % ARP.length];
    chip(S, 0.25, midi((i === 3 ? ch[0] + 12 : ch[i]) + 12), t, sx * 0.9, spec.dynamic ? 0.016 + 0.006 * I : 0.013);
    if (spec.dynamic && I > 0.4 && pos % 2 === 1) chip(S, 0.125, midi(ch[(pos >> 1) % 3] + 24), t, sx * 0.8, 0.009);
  }
  // the tune (50% pulse; in a game song it comes in a little way up), with a thin echo / harmony
  if (pos % 2 === 0 && on(spec.leadFrom !== undefined ? spec.leadFrom : 0.3)) {
    const n = mel[pos / 2];
    if (n > 0) {
      chip(S, spec.lead || 0.5, midi(n), t, sx * 1.7, spec.dynamic ? 0.022 + 0.008 * I : 0.026);
      if (S === 'win') chip(S, 0.25, midi(n - (n % 12 === 0 || n % 12 === 5 ? 4 : 3)), t, sx * 1.6, 0.014);
      else if (!spec.dynamic) chip(S, 0.125, midi(n - 12), t + sx, sx * 1.2, 0.01);
    }
  }
  if (spec.dynamic && I > 0.75 && pos % 4 === 0) chip(S, 0.125, midi(ch[2] + 24), t, sx * 3, 0.011);   // counter-melody near the top
}

// Which song should be playing (null: none — the slow-motion finale)
function songNow() {
  if (state === 'over' && mode === 'versus' && winner >= 0) return overT < 0 ? null : 'win';
  if (state === 'over') return 'over';
  if (state === 'play' || state === 'count' || state === 'paused' || state === 'found' || state === 'lift') return 'game';
  return 'lobby';
}
function musicIntensity() {
  if (state === 'play' || state === 'count' || state === 'paused') return clamp(Math.pow(Math.max(0, height) / 380, 0.85), 0, 1);
  return 0;
}
const specOf = name => name === 'game' ? GAME_SONGS[music.gameIdx || 0] : SONGS[name];
function musicStep(s, t, I, name = 'game') { playStep(specOf(name), name, s, t, I); }
const songBpm = (name, I) => specOf(name).bpm(I);
// Each run plays the next game song (remembered, so it carries on from where you left off)
function nextGameSong() {
  let k = 0; try { k = (parseInt(localStorage.getItem('rcs.song7') || '-1', 10) + 1) % GAME_SONGS.length; } catch (e) {}
  if (!(k >= 0)) k = 0;
  music.gameIdx = k;
  try { localStorage.setItem('rcs.song7', String(k)); } catch (e) {}
}

const TRACKS = ['lobby', 'over', 'win', 'game'];
function musicTick() {
  if (!actx || actx.state !== 'running') return;
  const now = actx.currentTime, cur = muted ? null : songNow();
  music.target = musicIntensity();
  music.I += (music.target - music.I) * (music.target > music.I ? 0.02 : 0.06);   // (rises gently, calms quicker)
  for (const name of TRACKS) {
    trackBus(name);
    const tr = music.tracks[name], want = name === cur;
    if (want && !tr.on) { tr.on = true; tr.step = 0; tr.next = now + 0.05; if (name === 'game') nextGameSong(); }   // (a song comes in from its top)
    if (!want && tr.on && !tr.offAt) tr.offAt = now;
    if (want) tr.offAt = 0;
    tr.bus.gain.setTargetAtTime(want ? MUSIC_VOL : 0, now, want ? FADE * 0.7 : FADE);
    if (tr.on && tr.offAt && now - tr.offAt > FADE * 5) tr.on = false;           // faded out: stop playing it
    if (!tr.on) continue;
    if (tr.next < now) tr.next = now + 0.05;
    while (tr.next < now + 0.15) {
      musicStep(tr.step, tr.next, music.I, name);
      tr.next += 60 / songBpm(name, music.I) / 4;
      tr.step++;
    }
  }
}
function musicStart() { if (!music.timer) music.timer = setInterval(musicTick, 25); }

// ---- Ambience ----
const amb = { ready: false };
function ambLoop(build) {   // a looping source → its own gain (silent until set), into the sound effects
  const g = actx.createGain(); g.gain.value = 0;
  build(g); g.connect(actx.destination);
  return g;
}
function ambInit() {
  if (amb.ready || !actx) return;
  amb.ready = true;
  // riding a water current up: a clean, soft rush of air (noise smoothed twice, low, no hiss)
  amb.windF = actx.createBiquadFilter(); amb.windF.type = 'lowpass'; amb.windF.Q.value = 0.5; amb.windF.frequency.value = 500;
  const smooth = actx.createBiquadFilter(); smooth.type = 'lowpass'; smooth.frequency.value = 900;
  amb.wind = ambLoop(g => { const s = noiseSrc(); s.loop = true; s.connect(amb.windF).connect(smooth).connect(g); s.start(); });
  // moving platforms: a low hum with a slow wobble
  amb.hum = ambLoop(g => {
    const o = actx.createOscillator(), o2 = actx.createOscillator(), lfo = actx.createOscillator(), lg = actx.createGain(), m = actx.createGain();
    o.type = 'triangle'; o.frequency.value = 82; o2.type = 'sine'; o2.frequency.value = 164.5;
    lfo.frequency.value = 3.2; lg.gain.value = 0.5; m.gain.value = 0.5;
    lfo.connect(lg).connect(m.gain); o.connect(m); o2.connect(m); m.connect(g);
    o.start(); o2.start(); lfo.start();
  });
  // shurikens: a fast whirr (noise through a narrow band, chopped quickly)
  amb.whirr = ambLoop(g => {
    const s = noiseSrc(); s.loop = true;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 5;
    const chop = actx.createGain(), lfo = actx.createOscillator(), lg = actx.createGain();
    chop.gain.value = 0.5; lfo.frequency.value = 22; lg.gain.value = 0.5;
    lfo.connect(lg).connect(chop.gain); s.connect(f).connect(chop).connect(g);
    s.start(); lfo.start();
  });
  // water columns: a soft low wash (the bubbles themselves are little blips, see ambTick)
  amb.water = ambLoop(g => { const s = noiseSrc(); s.loop = true; const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; s.connect(f).connect(g); s.start(); });
}
// Each frame: how near each kind of thing is to your cube (0 far … 1 right there), and the volumes from it
function ambTick(dt) {
  if (!actx || actx.state !== 'running') return;
  ambInit();
  const live = !muted && (state === 'play' || state === 'count' || state === 'lobby' || state === 'room' || state === 'hub');
  const me = live && players && players.find(p => !p.remote && !p.dead);
  const set = (g, v) => g.gain.setTargetAtTime(me ? v : 0, actx.currentTime, 0.08);
  if (!me) { for (const g of [amb.wind, amb.hum, amb.whirr, amb.water]) set(g, 0); return; }
  const cx = me.x + me.w / 2, cy = me.y + me.h / 2;
  const near = (x, y, R) => clamp(1 - Math.hypot(x - cx, y - cy) / R, 0, 1);
  const onScreen = y => y > camY - 40 && y < camY + H + 40;
  // a water current carrying you up: the rush rises a little with your speed (nothing otherwise)
  const w = me.inBubbles ? clamp(0.5 + -me.vy / 1200, 0.3, 1) : 0;
  amb.windF.frequency.setTargetAtTime(350 + 350 * w, actx.currentTime, 0.15);
  set(amb.wind, 0.035 * w);
  // moving platforms
  let mv = 0; for (const p of platforms) if (p.type === 'move' && onScreen(p.y)) mv = Math.max(mv, near(p.x + p.w / 2, p.y, 380));
  set(amb.hum, 0.05 * mv);
  // shurikens
  let bl = 0; for (const b of blades) if (onScreen(b.y)) bl = Math.max(bl, near(b.x, b.y, 360));
  set(amb.whirr, 0.035 * bl);
  // water columns: the wash, and bubbles popping now and then
  let wa = 0; for (const b of bubbles) if (b.bot > camY && b.top < camY + H) wa = Math.max(wa, near(clamp(cx, b.x, b.x + b.w), clamp(cy, b.top, b.bot), 320));
  set(amb.water, 0.05 * wa);
  if (wa > 0 && Math.random() < dt * 10 * wa) { const f = 280 + Math.random() * 380; tone(f, f * 2.2, 0.07 + Math.random() * 0.05, 'sine', 0.025 * wa); }
  // flames: crackles while a jet near you is burning
  let fl = 0;
  for (const j of jets) if (jetState(j) === 2 && onScreen(j.oy)) fl = Math.max(fl, near(j.ox + j.dx * j.len / 2, j.oy + j.dy * j.len / 2, 340));
  if (fl > 0 && Math.random() < dt * 22 * fl) hit(actx.currentTime, 0.03 + Math.random() * 0.04, 0.05 * fl, 'highpass', 1500 + Math.random() * 2500, actx.destination);
}
