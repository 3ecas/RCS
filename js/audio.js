// RCS — Sound effects, generated with the Web Audio API (no sound files).
'use strict';

let actx = null, muted = false, noiseBuf = null;
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
  crumble: () => noise(0.3, 0.07, 700),
  flame: () => noise(0.35, 0.03, 2200),
  fireball: () => tone(900, 300, 0.4, 'sine', 0.03),
  die: () => { tone(520, 60, 0.7, 'triangle', 0.1); noise(0.4, 0.12, 900); },
  beep: f => tone(f, f, 0.12, 'triangle', 0.07),
  milestone: () => { tone(660, 660, 0.1, 'triangle', 0.08); tone(990, 990, 0.18, 'triangle', 0.08, 0.1); },
};
