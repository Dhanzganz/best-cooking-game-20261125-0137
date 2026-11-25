// audio.js — all sounds are synthesized with WebAudio oscillators
// and a generated noise buffer. No audio files. The context is created
// on the first user gesture (pointerdown / keydown).

let ctx = null;
let noiseBuffer = null;
let sizzleGain = null;
let sizzleSource = null;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    // One second of white noise, reused for chop / sizzle / trash.
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  } catch (e) {
    ctx = null;
  }
}

export function audioReady() {
  return !!ctx;
}

function tone(freq, dur, type, vol, slideTo, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, vol, filterFreq, delay = 0) {
  if (!ctx || !noiseBuffer) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// --- Named game sounds -----------------------------------------------------

export function playChop() {
  noiseBurst(0.08, 0.35, 1800);
  tone(190, 0.07, 'square', 0.12, 90);
}

export function playPop() {
  tone(520, 0.09, 'sine', 0.18, 880);
}

export function playPlace() {
  tone(300, 0.08, 'triangle', 0.16, 210);
}

export function playDing() {
  tone(880, 0.18, 'sine', 0.22);
  tone(1318, 0.28, 'sine', 0.2, null, 0.09);
}

export function playError() {
  tone(140, 0.22, 'square', 0.14, 90);
}

export function playTrash() {
  noiseBurst(0.18, 0.2, 500);
  tone(220, 0.15, 'triangle', 0.1, 110);
}

export function playServe() {
  // Little rising arpeggio: C E G C.
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.2, null, i * 0.07));
}

export function playTick() {
  tone(1200, 0.05, 'sine', 0.08);
}

export function playBurn() {
  tone(90, 0.4, 'sawtooth', 0.12, 50);
  noiseBurst(0.3, 0.12, 300);
}

// Continuous sizzle while anything is on the grill or in the pot.
// Call setSizzle(true/false) from the game loop; it is cheap and guarded.
export function setSizzle(on) {
  if (!ctx || !noiseBuffer) return;
  if (on && !sizzleSource) {
    sizzleSource = ctx.createBufferSource();
    sizzleSource.buffer = noiseBuffer;
    sizzleSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 4000;
    sizzleGain = ctx.createGain();
    sizzleGain.gain.setValueAtTime(0.0, ctx.currentTime);
    sizzleGain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.3);
    sizzleSource.connect(filter);
    filter.connect(sizzleGain);
    sizzleGain.connect(ctx.destination);
    sizzleSource.start();
  } else if (!on && sizzleSource) {
    const src = sizzleSource;
    const g = sizzleGain;
    g.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.2);
    setTimeout(() => { try { src.stop(); } catch (e) { /* already stopped */ } }, 250);
    sizzleSource = null;
    sizzleGain = null;
  }
}
