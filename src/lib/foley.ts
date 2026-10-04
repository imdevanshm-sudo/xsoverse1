import { soundOn } from '@/lib/sound';

/**
 * Small, realistic interaction sounds made from filtered noise (paper, card,
 * foil, tape) instead of oscillator beeps. One shared AudioContext and one
 * cached noise buffer keep each cue cheap enough to fire on every tap.
 */

export type FoleyCue =
  | 'flip' // card flicked off a stack
  | 'tap' // fingertip on card stock
  | 'land' // card settling onto a pile
  | 'thunk' // stamp / heavy card set down
  | 'scratch' // one grain of a coin on scratch-off foil
  | 'shuffle' // riffle of a few cards
  | 'whir' // tape rewind
  | 'crank' // projector ratchet
  | 'reel' // one claw pull-down of the film gate
  | 'crack' // wax seal snapping
  | 'slide' // a print sliding out across the desk
  | 'unwrap' // twine slipping off, then kraft paper opening
  | 'chime'; // a soft three-note bell when a scratch-off comes clean

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Two seconds of pink-ish noise, generated once. */
function getNoise(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
  }
  noise = buffer;
  return buffer;
}

interface Burst {
  at?: number;
  duration: number;
  gain: number;
  attack?: number;
  filter: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
}

/** A filtered slice of noise with a fast attack and exponential decay. */
function burst(ctx: AudioContext, out: AudioNode, b: Burst) {
  const start = ctx.currentTime + (b.at ?? 0);
  const end = start + b.duration;
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  source.playbackRate.value = 0.9 + Math.random() * 0.2;

  const filter = ctx.createBiquadFilter();
  filter.type = b.filter;
  filter.Q.value = b.q ?? 0.8;
  filter.frequency.setValueAtTime(b.freq, start);
  if (b.freqEnd) filter.frequency.exponentialRampToValueAtTime(b.freqEnd, end);

  const amp = ctx.createGain();
  const attack = b.attack ?? 0.004;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(b.gain, start + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(filter).connect(amp).connect(out);
  source.start(start, Math.random() * Math.min(1.5, 1.9 - b.duration), b.duration + 0.05);
}

/** A sine with a quiet inharmonic overtone and a long decay, like a small bell. */
function bell(ctx: AudioContext, out: AudioNode, freq: number, at: number) {
  const start = ctx.currentTime + at;
  [
    [freq, 0.09],
    [freq * 2.76, 0.02],
  ].forEach(([f, gain]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
    osc.connect(amp).connect(out);
    osc.start(start);
    osc.stop(start + 1.15);
  });
}

const jitter = (v: number, amount = 0.12) => v * (1 - amount + Math.random() * amount * 2);

export function playFoley(cue: FoleyCue, volume = 1) {
  if (!soundOn()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const out = ctx.createGain();
    out.gain.value = volume;
    out.connect(ctx.destination);

    switch (cue) {
      case 'flip':
        // Crisp edge snap, then air as the card sweeps away.
        burst(ctx, out, {
          duration: 0.035,
          gain: 0.22,
          filter: 'highpass',
          freq: jitter(2600),
          q: 0.7,
        });
        burst(ctx, out, {
          at: 0.012,
          duration: 0.16,
          gain: 0.07,
          attack: 0.03,
          filter: 'bandpass',
          freq: jitter(1800),
          freqEnd: 4200,
          q: 0.6,
        });
        break;
      case 'tap':
        burst(ctx, out, {
          duration: 0.028,
          gain: 0.16,
          filter: 'bandpass',
          freq: jitter(1400),
          q: 1.2,
        });
        break;
      case 'land':
        burst(ctx, out, {
          duration: 0.06,
          gain: 0.14,
          filter: 'lowpass',
          freq: jitter(900),
          q: 0.7,
        });
        burst(ctx, out, { duration: 0.03, gain: 0.05, filter: 'highpass', freq: 3000 });
        break;
      case 'thunk':
        burst(ctx, out, {
          duration: 0.09,
          gain: 0.3,
          filter: 'lowpass',
          freq: jitter(320),
          q: 1.1,
        });
        burst(ctx, out, { duration: 0.025, gain: 0.08, filter: 'bandpass', freq: 1800, q: 1 });
        break;
      case 'scratch':
        burst(ctx, out, {
          duration: jitter(0.05, 0.3),
          gain: jitter(0.05, 0.3),
          attack: 0.008,
          filter: 'bandpass',
          freq: jitter(3800, 0.2),
          q: 1.6,
        });
        break;
      case 'shuffle':
        for (let i = 0; i < 4; i += 1) {
          burst(ctx, out, {
            at: i * jitter(0.045),
            duration: 0.04,
            gain: 0.12,
            filter: 'highpass',
            freq: jitter(2400),
          });
        }
        break;
      case 'whir':
        burst(ctx, out, {
          duration: 0.32,
          gain: 0.08,
          attack: 0.05,
          filter: 'bandpass',
          freq: 500,
          freqEnd: 1600,
          q: 3,
        });
        burst(ctx, out, { at: 0.3, duration: 0.05, gain: 0.12, filter: 'lowpass', freq: 400 });
        break;
      case 'crank':
        for (let i = 0; i < 5; i += 1) {
          burst(ctx, out, {
            at: i * 0.035,
            duration: 0.02,
            gain: 0.1,
            filter: 'bandpass',
            freq: jitter(2200),
            q: 2,
          });
        }
        break;
      case 'crack':
        // A brittle snap, a dull knock through the paper, then a few crumbs.
        burst(ctx, out, {
          duration: 0.022,
          gain: 0.32,
          filter: 'highpass',
          freq: jitter(3200),
          q: 0.9,
        });
        burst(ctx, out, {
          at: 0.004,
          duration: 0.05,
          gain: 0.18,
          filter: 'bandpass',
          freq: jitter(1300),
          q: 1.4,
        });
        burst(ctx, out, {
          at: 0.01,
          duration: 0.09,
          gain: 0.2,
          filter: 'lowpass',
          freq: jitter(260),
          q: 1,
        });
        for (let i = 0; i < 3; i += 1) {
          burst(ctx, out, {
            at: 0.06 + i * jitter(0.035, 0.4),
            duration: 0.018,
            gain: 0.05,
            filter: 'bandpass',
            freq: jitter(4200, 0.25),
            q: 2,
          });
        }
        break;
      case 'slide':
        burst(ctx, out, {
          duration: 0.3,
          gain: 0.06,
          attack: 0.07,
          filter: 'bandpass',
          freq: jitter(900),
          freqEnd: 2600,
          q: 0.9,
        });
        break;
      case 'unwrap':
        burst(ctx, out, {
          duration: 0.12,
          gain: 0.08,
          attack: 0.02,
          filter: 'bandpass',
          freq: jitter(2400),
          q: 1.4,
        });
        burst(ctx, out, {
          at: 0.18,
          duration: 0.9,
          gain: 0.1,
          attack: 0.08,
          filter: 'bandpass',
          freq: 850,
          freqEnd: 2600,
          q: 0.65,
        });
        break;
      case 'reel':
        burst(ctx, out, {
          duration: 0.018,
          gain: 0.14,
          filter: 'bandpass',
          freq: jitter(3200),
          q: 2.4,
        });
        burst(ctx, out, {
          at: 0.01,
          duration: 0.05,
          gain: 0.08,
          filter: 'lowpass',
          freq: jitter(520),
          q: 1,
        });
        break;
      case 'chime':
        // Rising major triad of bell partials; the only cue that isn't noise.
        [1046.5, 1318.5, 1568].forEach((freq, i) => bell(ctx, out, freq, i * 0.09));
        break;
    }
  } catch {
    // Sound is progressive enhancement.
  }
}

/**
 * Low projector motor hum with an 18 Hz shutter flutter. Returns a stop
 * function that fades it out; calling it twice is harmless.
 */
export function startHum(volume = 0.05): () => void {
  if (!soundOn()) return () => {};
  try {
    const ctx = getAudioContext();
    if (!ctx) return () => {};
    const source = ctx.createBufferSource();
    source.buffer = getNoise(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 2;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.25);
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 18;
    const depth = ctx.createGain();
    depth.gain.value = volume * 0.35;
    flutter.connect(depth).connect(amp.gain);
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start();
    flutter.start();
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const end = ctx.currentTime + 0.35;
      amp.gain.cancelScheduledValues(ctx.currentTime);
      amp.gain.setValueAtTime(Math.max(amp.gain.value, 0.0001), ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      source.stop(end + 0.05);
      flutter.stop(end + 0.05);
    };
  } catch {
    return () => {};
  }
}
