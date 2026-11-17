// RCS — Music and ambience, generated with the Web Audio API (no sound files).
//
// Two songs, played by a small generative band and scheduled a little ahead with a look-ahead timer (so the
// beat stays steady whatever the frame rate):
//  - the LOBBY song (start scene, online rooms, lobbies, wardrobe, results): a happy, bouncy pop loop in
//    C major at 112 bpm — C, G, Am, F — with a hopping bass, off-beat chord stabs, a cheerful little
//    melody, claps and a soft shaker.
//  - the GAME song (a run or a race): paced and driving from the first second — A minor, F, C, G at
//    126 bpm, a four-on-the-floor kick, pumping eighth-note bass and sixteenth arpeggios — and it builds as
//    you climb (intensity 0 … 1 with the height): faster (up to 168 bpm), snare, busier hats and bass, a
//    second arpeggio, and near the top a lead line.
//
// Ambience: a few soft loops whose volume follows what's near your cube — a clean rush of air while a water
// current carries you up, a hum near moving platforms, bubbling near water columns, a whirr near shurikens,
// crackle near flames.
'use strict';

const MUSIC_VOL = 0.38;   // (the whole band; sound effects are louder than this)
const music = { next: 0, step: 0, I: 0, target: 0, bus: null, timer: null };
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
// The chord loop (a bar each), and a pentatonic scale for the lead
const LOBBY_PROG = [[48, 64, 67, 72], [43, 62, 67, 71], [45, 64, 69, 72], [41, 65, 69, 72]];   // C  G  Am  F
const GAME_PROG = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]];    // Am F  C  G
// The lobby's tune: a call and an answer over four bars (MIDI notes in C major, -1 = rest), per 8th note
const TUNE = [[76, -1, 79, 76, 74, -1, 72, 74], [76, -1, 79, 81, 79, -1, 76, -1], [76, -1, 79, 76, 74, -1, 72, 69], [72, -1, 74, 76, 72, -1, -1, -1]];
const GAME_LEAD = [81, 84, 88, 86, 84, 81, 79, 81, 84, 86, 88, 91, 88, 86, 84, 86];
const lobbyBpm = () => 112, gameBpm = I => 126 + 42 * I;

function musicBus() {
  if (!music.bus) { music.bus = actx.createGain(); music.bus.gain.value = MUSIC_VOL; music.bus.connect(actx.destination); }
  return music.bus;
}
// One note into the music bus at time t
function note(freq, t, dur, type = 'triangle', vol = 0.03, attack = 0.005) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicBus());
  o.start(t); o.stop(t + dur + 0.05);
}
function noiseSrc() {
  if (!noiseBuf) {
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
function kick(t, vol = 0.16) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(musicBus()); o.start(t); o.stop(t + 0.22);
}

function clap(t, vol = 0.05) { hit(t, 0.09, vol, 'bandpass', 1500, musicBus()); hit(t + 0.012, 0.07, vol * 0.7, 'bandpass', 1700, musicBus()); }

// The lobby song, one sixteenth-note step
function lobbyStep(s, t) {
  const bar = Math.floor(s / 16), pos = s % 16, ch = LOBBY_PROG[bar % 4], sx = 60 / lobbyBpm() / 4;
  // hopping bass: root, fifth, octave
  const bassPat = { 0: 0, 6: 7, 8: 12, 12: 7, 14: 0 };
  if (bassPat[pos] !== undefined) note(midi(ch[0] - 12 + bassPat[pos]), t, sx * 1.7, 'triangle', 0.075);
  // chord stabs on the off-beats, and a soft pad under the bar
  if (pos % 4 === 2) for (const n of ch.slice(1)) note(midi(n), t, sx * 1.1, 'triangle', 0.012);
  if (pos === 0) for (const n of ch.slice(1)) note(midi(n - 12), t, sx * 16, 'sine', 0.008, 0.2);
  // the tune, on 8th notes (it rests every fourth bar's second half, so it breathes)
  if (pos % 2 === 0) { const n = TUNE[bar % 4][pos / 2]; if (n > 0) note(midi(n), t, sx * 1.6, 'square', 0.011); }
  // kick, clap, shaker
  if (pos === 0 || pos === 8) kick(t, 0.09);
  if (pos === 4 || pos === 12) clap(t, 0.04);
  hit(t, 0.025, pos % 2 ? 0.012 : 0.02, 'highpass', 8000, musicBus());
}

// The game song, one sixteenth-note step (I: intensity 0 … 1)
function gameStep(s, t, I) {
  const bar = Math.floor(s / 16), pos = s % 16, ch = GAME_PROG[bar % 4], sx = 60 / gameBpm(I) / 4;
  // drums: four on the floor from the start, a snare and busier hats as it builds
  if (pos % 4 === 0) kick(t, 0.11 + 0.05 * I);
  if (I > 0.2 && (pos === 4 || pos === 12)) clap(t, 0.05 + 0.03 * I);
  if (pos % 4 === 2) hit(t, 0.04, 0.03, 'highpass', 7000, musicBus());                 // open-ish off-beat hat
  else if (I > 0.45 && pos % 2 === 1) hit(t, 0.02, 0.016, 'highpass', 9000, musicBus());
  if (I > 0.75 && bar % 4 === 3 && pos >= 12) clap(t, 0.03);                            // a little fill
  // pumping bass: 8ths (root and octave), 16ths up high
  if (pos % 2 === 0 || I > 0.65) note(midi(ch[0] - 12 + (pos % 4 === 2 ? 12 : 0)), t, sx * (I > 0.65 ? 0.9 : 1.6), 'sawtooth', 0.03 + 0.015 * I);
  // sixteenth arpeggio from the start; a second one an octave up as it builds
  const arp = [1, 2, 3, 2, 1, 3, 2, 3];
  note(midi(ch[arp[pos % 8]] + 12), t, sx * 1.4, 'triangle', 0.013 + 0.008 * I);
  if (I > 0.4 && pos % 2 === 1) note(midi(ch[arp[(pos + 3) % 8]] + 24), t, sx * 1.2, 'triangle', 0.008);
  // a soft pad, and near the top a lead line
  if (pos === 0) for (const n of ch.slice(1)) note(midi(n), t, sx * 16, 'sine', 0.008, 0.15);
  if (I > 0.65 && pos % 2 === 0) note(midi(GAME_LEAD[(bar % 2) * 8 + pos / 2]), t, sx * 1.6, 'square', 0.011);
}

// Which song, and how intense
const songNow = () => (state === 'play' || state === 'count' || state === 'paused' || state === 'found' || state === 'lift') ? 'game' : 'lobby';
function musicIntensity() {
  if (state === 'play' || state === 'count' || state === 'paused') return clamp(Math.pow(Math.max(0, height) / 380, 0.85), 0, 1);
  return 0;
}
function musicStep(s, t, I, song = 'game') { song === 'lobby' ? lobbyStep(s, t) : gameStep(s, t, I); }
function musicTick() {
  if (!actx || actx.state !== 'running') return;
  musicBus().gain.setTargetAtTime(muted ? 0 : MUSIC_VOL, actx.currentTime, 0.1);
  if (muted) { music.next = 0; return; }
  const song = songNow();
  if (song !== music.song) { music.song = song; music.step = 0; music.next = actx.currentTime + 0.08; }   // (each song from its top)
  music.target = musicIntensity();
  music.I += (music.target - music.I) * (music.target > music.I ? 0.02 : 0.06);   // (rises gently, calms quicker)
  if (music.next < actx.currentTime) music.next = actx.currentTime + 0.05;
  while (music.next < actx.currentTime + 0.15) {
    musicStep(music.step, music.next, music.I, song);
    music.next += 60 / (song === 'lobby' ? lobbyBpm() : gameBpm(music.I)) / 4;
    music.step++;
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
