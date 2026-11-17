// RCS — Sound effects, generated with the Web Audio API (no sound files).
'use strict';

let actx = null, muted = false, noiseBuf = null;
try { muted = localStorage.getItem('rcs.muted') === '1'; } catch (e) {}
// Sound on/off (speaker icon or M key), remembered by the browser
function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('rcs.muted', muted ? '1' : '0'); } catch (e) {}
}
function audioInit() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  if (actx && typeof musicStart === 'function') musicStart();   // the music and ambience (js/music.js)
}
function tone(f0, f1, dur, type = 'square', vol = 0.06, delay = 0) {
  if (!actx || muted) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.1, freq = 1200) {
  if (!actx || muted) return;
  if (!noiseBuf) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = actx.createGain(); const t = actx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(actx.destination);
  s.start(t); s.stop(t + dur);
}
// Filtered noise whose filter sweeps from f0 to f1 (whooshes)
function sweep(dur, vol, f0, f1, type = 'bandpass', q = 1.2, delay = 0) {
  if (!actx || muted) return;
  noise(0.001, 0);                                             // (makes sure the noise buffer exists)
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type; f.Q.value = q;
  const g = actx.createGain(), t = actx.currentTime + delay;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(actx.destination);
  s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02);
}
let lastPortal = 0, loader = null;
const sfx = {
  // Standing in a portal: a chip tone climbing step by step from low to high over the hold (0 … 100%),
  // stopped if you step out; going through: a bright pling
  loadStart: dur => {
    if (!actx || muted) return;
    sfx.loadStop();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(), steps = 16;
    o.type = 'triangle';   // (a round, soft tone)
    for (let k = 0; k < steps; k++) o.frequency.setValueAtTime(330 * Math.pow(2, 2 * k / (steps - 1)), t + k * dur / steps);   // two octaves up, in little steps
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 0.06); g.gain.linearRampToValueAtTime(0.03, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.2);
    loader = { o, g };
  },
  loadStop: () => {
    if (!loader || !actx) return;
    const t = actx.currentTime;
    try { loader.g.gain.cancelScheduledValues(t); loader.g.gain.setTargetAtTime(0.0001, t, 0.015); loader.o.stop(t + 0.08); } catch (e) {}
    loader = null;
  },
  pling: () => {
    if (actx) lastPortal = actx.currentTime;   // (no whoosh on top of it)
    tone(1568, 1568, 0.12, 'square', 0.025); tone(2093, 2093, 0.35, 'triangle', 0.05, 0.05); tone(3136, 3136, 0.25, 'sine', 0.02, 0.05);
  },
  // Going through a portal: a deep airy woooosh rising, with a soft rising tone under it
  portal: () => {   // (going through with Esc etc.: a whoosh)
    if (!actx || actx.currentTime - lastPortal < 0.4) return;
    lastPortal = actx.currentTime;
    sweep(0.9, 0.11, 220, 3200, 'bandpass', 0.9); tone(160, 620, 0.8, 'sine', 0.045);
  },
  // A new best height: a quick happy chip arpeggio up, then a little trill
  record: () => {
    [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, f, 0.09, 'square', 0.03, k * 0.065));
    [1568, 1319, 1568, 1319, 1568].forEach((f, k) => tone(f, f, 0.06, 'square', 0.022, 0.36 + k * 0.055));
    tone(2093, 2093, 0.3, 'triangle', 0.03, 0.65);
  },
  // An obstacle got you (solo): a short hit and a ringing tone while everything freezes
  impact: () => { tone(180, 60, 0.25, 'square', 0.05); noise(0.12, 0.06, 1800); tone(1320, 1240, 0.8, 'sine', 0.02, 0.05); },
  // Race start: three soft beeps (3, 2, 1) and a trumpet ta-ra on GO
  count: () => { tone(660, 660, 0.14, 'triangle', 0.035); tone(1320, 1320, 0.08, 'sine', 0.012); },   // a soft clean beep
  // GO: a clean little trumpet call, "ta-RA!" — a short note, then the fourth above it held
  horn: () => {
    if (!actx || muted) return;
    const brass = (fr, t0, dur, vol) => {
      const t = actx.currentTime + t0, f = actx.createBiquadFilter(), g = actx.createGain();
      f.type = 'lowpass'; f.Q.value = 0.7;
      f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(2200, t + 0.05); f.frequency.linearRampToValueAtTime(1500, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.025);
      g.gain.setValueAtTime(vol * 0.85, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      f.connect(g).connect(actx.destination);
      const o = actx.createOscillator(), o2 = actx.createOscillator();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(fr * 0.985, t); o.frequency.linearRampToValueAtTime(fr, t + 0.04);
      o2.type = 'sine'; o2.frequency.value = fr;                // (a round body under the brassy edge)
      const g2 = actx.createGain(); g2.gain.value = 0.6; o2.connect(g2).connect(f);
      o.connect(f); o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    };
    brass(392, 0, 0.13, 0.035);          // ta (G)
    brass(523.3, 0.15, 0.55, 0.04);      // RA! (C)
  },
  // a short, solid bop: a quick rising sine with a little low body under it (player 2 a bit higher)
  jump: i => { const f = i ? 300 : 250; tone(f, f * 1.9, 0.08, 'sine', 0.035); tone(f * 0.5, f * 0.42, 0.05, 'sine', 0.025); },
  // a soft, low pat (a little fuller after a long fall; no noise)
  land: (k = 0.5) => tone(130, 75, 0.07 + 0.04 * k, 'sine', 0.02 + 0.025 * k),
  // A springy BOING: a rising tone with a wobble that settles
  spring: () => {
    if (!actx || muted) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(), lfo = actx.createOscillator(), lg = actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(820, t + 0.35);
    lfo.frequency.value = 16; lg.gain.setValueAtTime(70, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.5);
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.11, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(actx.destination); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
  },
  creak: () => tone(140, 95, 0.18, 'triangle', 0.035),
  flame: () => { sweep(0.45, 0.07, 300, 2600, 'lowpass', 0.7); tone(95, 55, 0.4, 'sawtooth', 0.02); },   // a flame bursting out
  gem: () => { tone(1320, 1320, 0.07, 'triangle', 0.06); tone(1760, 1760, 0.12, 'triangle', 0.06, 0.06); },
  zap: () => { noise(0.25, 0.035, 5000); tone(1400, 700, 0.2, 'sawtooth', 0.02); },
  fireball: () => tone(900, 300, 0.4, 'sine', 0.03),
  die: () => { tone(520, 60, 0.7, 'triangle', 0.1); noise(0.4, 0.12, 900); },
  beep: f => tone(f, f, 0.12, 'triangle', 0.07),
  milestone: () => { tone(660, 660, 0.1, 'triangle', 0.08); tone(990, 990, 0.18, 'triangle', 0.08, 0.1); },
  // The winner reveal
  fanfare: () => {                       // a bright rising arpeggio, then a held major chord
    [523, 659, 784, 1047].forEach((f, k) => tone(f, f, 0.14, 'square', 0.035, k * 0.11));
    [523, 659, 784, 1047].forEach(f => tone(f, f * 1.003, 0.75, 'triangle', 0.045, 0.46));
  },
  popper: () => { noise(0.18, 0.09, 4000); tone(300, 1200, 0.12, 'sine', 0.04); },   // confetti
  bloop: k => tone(k % 2 ? 330 : 392, 220, 0.09, 'triangle', 0.05),               // a dance hop
  slowmo: () => { tone(620, 110, 1.4, 'sine', 0.06); tone(310, 70, 1.4, 'triangle', 0.04); },   // time slowing down
  swoosh: () => { tone(300, 1100, 0.3, 'sine', 0.04); noise(0.3, 0.025, 2500); },
  whoosh: () => tone(180, 900, 1.4, 'sine', 0.04),                                 // the spin-up rising
  chime: () => { [1568, 2093, 2637].forEach((f, k) => tone(f, f, 0.35, 'triangle', 0.04, k * 0.07)); },
  boing: () => tone(160, 620, 0.22, 'sine', 0.08),
  whistle: () => tone(1500, 600, 0.9, 'sine', 0.03),                               // the crown falling
  blip: k => tone(520 + k * 60, 820 + k * 60, 0.09, 'triangle', 0.05),             // a place pedestal popping in
};
