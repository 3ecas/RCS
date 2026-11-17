// RCS — Music and ambience, generated with the Web Audio API (no sound files).
//
// Music: a small generative band playing over a pastel chord loop (Cmaj7 – Am7 – Fmaj7 – G6). Its
// intensity (0 … 1) follows the game: calm in the start scene and the online rooms, rising with the height
// of the climb. As it rises the tempo goes up (84 → 156 bpm) and layers come in: soft pad and a gentle
// arpeggio at first, then bass, then a kick and hats, then a four-on-the-floor beat with a snare and
// sixteenth-note arps, and near the top a bright lead line. Notes are scheduled a little ahead with a
// look-ahead timer, so the beat stays steady whatever the frame rate.
//
// Ambience: a few soft loops whose volume follows what's near your cube — a clean rush of air while a water
// current carries you up,
// a hum near moving platforms, bubbling near water columns, a whirr near shurikens, crackle near flames.
'use strict';

const MUSIC_VOL = 0.38;   // (the whole band; sound effects are louder than this)
const music = { next: 0, step: 0, I: 0, target: 0, bus: null, timer: null };
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
// The chord loop (a bar each), and a pentatonic scale for the lead
const PROG = [[48, 60, 64, 67, 71], [45, 57, 60, 64, 67], [41, 57, 60, 64, 65], [43, 55, 59, 62, 64]];
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];

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
function kick(t) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
  g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(musicBus()); o.start(t); o.stop(t + 0.22);
}

// One sixteenth-note step of the song
function musicStep(s, t, I) {
  const bar = Math.floor(s / 16), pos = s % 16, ch = PROG[bar % 4];
  const sx = 60 / (84 + 72 * I) / 4;                           // (this step's length)
  // pad: the chord, held for the bar (softer as the beat takes over)
  if (pos === 0) for (const n of ch.slice(1)) note(midi(n), t, sx * 16 * 1.05, 'sine', 0.016 * (1 - 0.35 * I), 0.25);
  // arpeggio: 8ths when calm, 16ths when it's busy
  const arpEvery = I > 0.55 ? 1 : 2;
  if (pos % arpEvery === 0 && (I > 0.1 || pos % 4 === 0)) {
    const seq = [1, 2, 3, 4, 3, 2], n = ch[seq[(pos / arpEvery) % seq.length]] + 12;
    note(midi(n), t, sx * 1.8, 'triangle', 0.016 + 0.01 * I);
  }
  // bass
  if (I > 0.2 && (pos === 0 || pos === 8 || (I > 0.6 && (pos === 4 || pos === 12)) || (I > 0.82 && pos % 2 === 0)))
    note(midi(ch[0] - 12 + (I > 0.82 && pos % 4 === 2 ? 12 : 0)), t, sx * 1.6, 'triangle', 0.07);
  // drums
  if (I > 0.35 && (pos === 0 || pos === 8 || (I > 0.55 && (pos === 4 || pos === 12)))) kick(t);
  if (I > 0.55 && (pos === 4 || pos === 12)) { hit(t, 0.14, 0.07, 'bandpass', 1900, musicBus()); note(190, t, 0.08, 'triangle', 0.03); }
  if (I > 0.35 && (pos % 4 === 2 || (I > 0.75 && pos % 2 === 1))) hit(t, 0.035, 0.03, 'highpass', 7500, musicBus());
  // lead: a bright little melody on top, near the top of the climb
  if (I > 0.8 && pos % 2 === 0 && ((s * 7919) % 5) < 3) note(midi(PENTA[(s * 31 + bar * 7) % PENTA.length]), t, sx * 1.5, 'square', 0.012);
}

// How intense the music should be right now
function musicIntensity() {
  if (state === 'play' || state === 'count' || state === 'paused') return clamp(Math.pow(Math.max(0, height) / 380, 0.85), 0, 1);
  if (state === 'lift') return 0.2;
  if (state === 'over') return 0.15;
  return 0;                                                    // start scene, online rooms, wardrobe, menus
}
function musicTick() {
  if (!actx || actx.state !== 'running') return;
  musicBus().gain.setTargetAtTime(muted ? 0 : MUSIC_VOL, actx.currentTime, 0.1);
  if (muted) { music.next = 0; return; }
  music.target = musicIntensity();
  music.I += (music.target - music.I) * (music.target > music.I ? 0.02 : 0.06);   // (rises gently, calms quicker)
  if (music.next < actx.currentTime) music.next = actx.currentTime + 0.05;
  while (music.next < actx.currentTime + 0.15) {
    musicStep(music.step, music.next, music.I);
    music.next += 60 / (84 + 72 * music.I) / 4;
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
