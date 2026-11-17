// RCS — Music and ambience, generated with the Web Audio API (no sound files).
//
// The music is 8-bit chiptune: pulse waves (12.5%, 25% and 50% duty, like an old console's square
// channels) for melodies and arpeggios, a triangle for the bass, and short noise bursts for the drums.
// Three songs, each a long loop (an A and a B section) that keeps going for as long as you stay:
//  - LOBBY (start scene, online rooms, lobbies, wardrobe, solo results): happy and bouncy, C major, 112 bpm.
//  - GAME (a run or a race): driving, A minor, from 126 bpm up to about 168 as you climb, adding layers as
//    it goes (snare, busier hats and bass, a second arpeggio, a lead and a counter-melody).
//  - WIN (the race results): a triumphant fanfare loop, C major, 132 bpm.
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
const C = [60, 64, 67], G = [59, 62, 67], Am = [57, 60, 64], F = [57, 60, 65], Em = [59, 64, 67], E = [56, 59, 64], Dm = [57, 62, 65];
const SONGS = {
  lobby: {
    bpm: () => 112,
    bars: [   // A A B — C G Am F, twice, then F G Em Am F G C C
      [C, [72, -1, 76, 79, 76, -1, 72, 74]], [G, [74, -1, 79, 83, 81, 79, -1, 74]], [Am, [76, -1, 81, 79, 76, -1, 72, 76]], [F, [77, 76, 74, 72, -1, -1, 69, -1]],
      [C, [72, -1, 76, 79, 76, -1, 79, 84]], [G, [83, -1, 79, 74, 79, -1, 83, 86]], [Am, [84, -1, 81, 76, 81, -1, 84, 81]], [F, [77, -1, 81, 77, 72, -1, -1, -1]],
      [F, [81, -1, 79, 77, -1, 77, 79, 81]], [G, [83, -1, 81, 79, -1, 79, 81, 83]], [Em, [84, 83, 79, 76, -1, 79, 76, -1]], [Am, [76, -1, 72, 76, 81, -1, -1, -1]],
      [F, [77, -1, 81, 84, 81, -1, 77, -1]], [G, [79, -1, 83, 86, 83, -1, 79, -1]], [C, [84, -1, 79, 76, 79, -1, 84, -1]], [C, [72, -1, -1, -1, -1, -1, -1, -1]],
    ],
  },
  game: {
    bpm: I => 126 + 42 * I,
    bars: [   // A A B A' — Am F C G, twice, then F G Am E, then Am F C G again
      [Am, [81, -1, 81, 84, 81, 79, 76, -1]], [F, [77, -1, 77, 81, 77, 76, 72, -1]], [C, [76, -1, 76, 79, 76, 74, 72, 74]], [G, [74, -1, 74, 79, 83, -1, 81, 79]],
      [Am, [81, -1, 81, 84, 88, 84, 81, -1]], [F, [77, -1, 81, 84, 81, 77, 72, -1]], [C, [76, -1, 79, 84, 79, 76, 72, 76]], [G, [79, -1, 83, 86, 83, 79, 74, 79]],
      [F, [72, 77, 81, 77, 72, 77, 81, 84]], [G, [74, 79, 83, 79, 74, 79, 83, 86]], [Am, [88, -1, 84, -1, 81, -1, 76, -1]], [E, [80, 83, 88, 83, 80, 83, 88, 92]],
      [Am, [81, 84, 88, 84, 81, 84, 88, 93]], [F, [89, 88, 84, 81, 77, 81, 84, 89]], [C, [88, 84, 79, 76, 79, 84, 88, 91]], [G, [86, 83, 79, 74, 79, 83, 86, 91]],
    ],
  },
  win: {
    bpm: () => 132,
    bars: [   // a fanfare: C F G C, Am F G C
      [C, [72, 72, 72, 76, 79, -1, 76, 79]], [F, [81, -1, 77, 81, 84, -1, 81, -1]], [G, [79, -1, 83, 86, 83, 79, 74, -1]], [C, [84, -1, -1, 79, 84, -1, -1, -1]],
      [Am, [76, -1, 72, 76, 81, -1, 76, -1]], [F, [77, -1, 81, 84, 89, -1, 84, -1]], [G, [86, 84, 83, 81, 79, 77, 76, 74]], [C, [72, -1, 76, -1, 79, -1, 84, -1]],
    ],
  },
};
const lobbyBpm = () => SONGS.lobby.bpm(), gameBpm = I => SONGS.game.bpm(I);

function lobbyStep(s, t) {
  const S = 'lobby', bar = Math.floor(s / 16) % SONGS.lobby.bars.length, pos = s % 16, [ch, mel] = SONGS.lobby.bars[bar], sx = 60 / lobbyBpm() / 4;
  // hopping triangle bass: root, fifth, octave
  const hop = { 0: 0, 6: 7, 8: 12, 12: 7, 14: 0 };
  if (hop[pos] !== undefined) chip(S, 'tri', midi(ch[0] - 12 + hop[pos]), t, sx * 1.6, 0.11);
  // a quiet fast chip arpeggio through the chord (the classic 8-bit "chord")
  chip(S, 0.25, midi(ch[pos % 3] + 12), t, sx * 0.9, 0.014);
  // the tune on a 50% pulse, an echo of it on a thin 12.5% pulse an octave down
  if (pos % 2 === 0) { const n = mel[pos / 2]; if (n > 0) { chip(S, 0.5, midi(n), t, sx * 1.7, 0.026); chip(S, 0.125, midi(n - 12), t + sx, sx * 1.2, 0.01); } }
  // drums
  if (pos === 0 || pos === 8) kick(S, t, 0.12);
  if (pos === 4 || pos === 12) snare(S, t, 0.035);
  if (pos % 2 === 0) hat(S, t, 0.012);
}

function gameStep(s, t, I) {
  const S = 'game', bar = Math.floor(s / 16) % SONGS.game.bars.length, pos = s % 16, [ch, mel] = SONGS.game.bars[bar], sx = 60 / gameBpm(I) / 4;
  // drums: four on the floor from the start; a snare and busier hats as it builds; a fill at the end of a section
  if (pos % 4 === 0) kick(S, t, 0.13 + 0.04 * I);
  if (I > 0.15 && (pos === 4 || pos === 12)) snare(S, t, 0.045 + 0.02 * I);
  if (pos % 4 === 2) hat(S, t, 0.024); else if (I > 0.45 && pos % 2 === 1) hat(S, t, 0.013);
  if (I > 0.6 && bar % 4 === 3 && pos >= 12) snare(S, t, 0.03);
  // driving triangle bass: 8ths (root and octave), 16ths up high
  if (pos % 2 === 0 || I > 0.65) chip(S, 'tri', midi(ch[0] - 12 + (pos % 4 === 2 ? 12 : 0)), t, sx * (I > 0.65 ? 0.9 : 1.6), 0.12);
  // sixteenth arpeggio (25% pulse); a second one an octave up as it builds
  chip(S, 0.25, midi(ch[[0, 1, 2, 1][pos % 4]] + 12), t, sx * 0.9, 0.016 + 0.006 * I);
  if (I > 0.4 && pos % 2 === 1) chip(S, 0.125, midi(ch[(pos >> 1) % 3] + 24), t, sx * 0.8, 0.009);
  // the lead (from a little way up), and a counter-melody near the top
  if (I > 0.3 && pos % 2 === 0) { const n = mel[pos / 2]; if (n > 0) chip(S, 0.5, midi(n), t, sx * 1.7, 0.022 + 0.008 * I); }
  if (I > 0.75 && pos % 4 === 0) chip(S, 0.125, midi(ch[2] + 12), t, sx * 3, 0.012);
}

function winStep(s, t) {
  const S = 'win', bar = Math.floor(s / 16) % SONGS.win.bars.length, pos = s % 16, [ch, mel] = SONGS.win.bars[bar], sx = 60 / 132 / 4;
  // the fanfare on a 50% pulse, with a harmony a third below on 25%
  if (pos % 2 === 0) { const n = mel[pos / 2]; if (n > 0) { chip(S, 0.5, midi(n), t, sx * 1.8, 0.028); chip(S, 0.25, midi(n - (n % 12 === 0 || n % 12 === 5 ? 4 : 3)), t, sx * 1.6, 0.014); } }
  // marching triangle bass and a snare roll into each second bar
  if (pos % 4 === 0) chip(S, 'tri', midi(ch[0] - 12 + (pos === 8 ? 7 : 0)), t, sx * 2.5, 0.12);
  if (pos === 0 || pos === 8) kick(S, t, 0.13);
  if (pos === 4 || pos === 12) snare(S, t, 0.045);
  if (bar % 2 === 1 && pos >= 12) snare(S, t, 0.025);
  if (pos % 2 === 1) hat(S, t, 0.012);
}

// Which song should be playing (null: none — the slow-motion finale)
function songNow() {
  if (state === 'over' && mode === 'versus' && winner >= 0) return overT < 0 ? null : 'win';
  if (state === 'play' || state === 'count' || state === 'paused' || state === 'found' || state === 'lift') return 'game';
  return 'lobby';
}
function musicIntensity() {
  if (state === 'play' || state === 'count' || state === 'paused') return clamp(Math.pow(Math.max(0, height) / 380, 0.85), 0, 1);
  return 0;
}
function musicStep(s, t, I, song = 'game') { song === 'lobby' ? lobbyStep(s, t) : song === 'win' ? winStep(s, t) : gameStep(s, t, I); }
const songBpm = (song, I) => song === 'lobby' ? lobbyBpm() : song === 'win' ? 132 : gameBpm(I);

function musicTick() {
  if (!actx || actx.state !== 'running') return;
  const now = actx.currentTime, cur = muted ? null : songNow();
  music.target = musicIntensity();
  music.I += (music.target - music.I) * (music.target > music.I ? 0.02 : 0.06);   // (rises gently, calms quicker)
  for (const song of ['lobby', 'game', 'win']) {
    trackBus(song);
    const tr = music.tracks[song], want = song === cur;
    if (want && !tr.on) { tr.on = true; tr.step = 0; tr.next = now + 0.05; }   // (a song comes in from its top)
    if (!want && tr.on && !tr.offAt) tr.offAt = now;
    if (want) tr.offAt = 0;
    tr.bus.gain.setTargetAtTime(want ? MUSIC_VOL : 0, now, want ? FADE * 0.7 : FADE);
    if (tr.on && tr.offAt && now - tr.offAt > FADE * 5) tr.on = false;           // faded out: stop playing it
    if (!tr.on) continue;
    if (tr.next < now) tr.next = now + 0.05;
    while (tr.next < now + 0.15) {
      musicStep(tr.step, tr.next, music.I, song);
      tr.next += 60 / songBpm(song, music.I) / 4;
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
