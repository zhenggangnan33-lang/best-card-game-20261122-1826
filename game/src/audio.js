// Ember Tide — every sound is synthesized with WebAudio: no audio files,
// no network, nothing to load. A tiny helper builds short oscillator
// envelopes; each named sound is a few notes or a filtered noise burst.
let context = null;
let muted = false;

function audioContext() {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Toggle the mute; returns the new state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, duration, type, gain, when = 0, slideTo = null) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function noiseBurst(duration, gain, filterFreq) {
  if (muted) return;
  const ctx = audioContext();
  if (!ctx) return;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const envelope = ctx.createGain();
  envelope.gain.value = gain;
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(ctx.destination);
  source.start();
}

export const sounds = {
  click() { tone(660, 0.07, 'sine', 0.12); },
  select() { tone(520, 0.09, 'triangle', 0.14); tone(780, 0.09, 'triangle', 0.1, 0.05); },
  playCard() { tone(392, 0.12, 'triangle', 0.16); tone(523, 0.14, 'triangle', 0.16, 0.07); noiseBurst(0.08, 0.06, 2400); },
  draw() { tone(880, 0.06, 'sine', 0.08); },
  attack() { noiseBurst(0.14, 0.22, 1400); tone(180, 0.16, 'sawtooth', 0.14, 0, 90); },
  hurt() { tone(220, 0.18, 'sawtooth', 0.16, 0, 110); },
  heal() { tone(523, 0.16, 'sine', 0.12); tone(659, 0.16, 'sine', 0.12, 0.08); tone(784, 0.22, 'sine', 0.12, 0.16); },
  turn() { tone(440, 0.1, 'triangle', 0.12); tone(587, 0.12, 'triangle', 0.12, 0.08); },
  error() { tone(160, 0.14, 'square', 0.1); },
  win() {
    [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.28, 'triangle', 0.16, i * 0.13));
    tone(1319, 0.5, 'sine', 0.1, 0.55);
  },
  loss() {
    [392, 330, 262, 196].forEach((freq, i) => tone(freq, 0.3, 'triangle', 0.14, i * 0.15));
  },
};
