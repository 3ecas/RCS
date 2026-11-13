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
const sfx = {
  jump: i => tone(i ? 360 : 290, i ? 720 : 580, 0.13, 'triangle', 0.06),
  land: () => tone(170, 90, 0.06, 'triangle', 0.05),
  spring: () => tone(240, 1300, 0.3, 'sine', 0.09),
  creak: () => tone(140, 95, 0.18, 'triangle', 0.035),
  flame: () => noise(0.35, 0.03, 2200),
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
  swoosh: () => { tone(300, 1100, 0.3, 'sine', 0.04); noise(0.3, 0.025, 2500); },
  whoosh: () => tone(180, 900, 1.4, 'sine', 0.04),                                 // the spin-up rising
  chime: () => { [1568, 2093, 2637].forEach((f, k) => tone(f, f, 0.35, 'triangle', 0.04, k * 0.07)); },
  boing: () => tone(160, 620, 0.22, 'sine', 0.08),
  whistle: () => tone(1500, 600, 0.9, 'sine', 0.03),                               // the crown falling
  blip: k => tone(520 + k * 60, 820 + k * 60, 0.09, 'triangle', 0.05),             // a place pedestal popping in
};
