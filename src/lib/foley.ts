/**
 * Synthesized stand-ins for every sound event, used until (or whenever) a recorded file isn't
 * available. Each recipe is rendered once, offline, into a buffer that `lib/sound` then levels and
 * plays like any recording. Only `lib/sound` imports this.
 *
 * Style: soft, warm, analog. Filtered noise for paper, tape and film; sine partials for chimes.
 * Everything runs through a 6.5 kHz low-pass so nothing is shrill.
 */

interface Synth {
  ctx: BaseAudioContext;
  out: AudioNode;
  noise: AudioBuffer;
  /** Length of the render in seconds; loops fill it exactly. */
  length: number;
}

type Recipe = (s: Synth) => void;

const noiseCache = new Map<number, Float32Array<ArrayBuffer>>();

/** Three seconds of pink-ish noise per sample rate, generated once. */
function pinkNoise(sampleRate: number): Float32Array<ArrayBuffer> {
  const cached = noiseCache.get(sampleRate);
  if (cached) return cached;
  const data = new Float32Array(sampleRate * 3);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
  }
  noiseCache.set(sampleRate, data);
  return data;
}

const jitter = (v: number, amount = 0.12) => v * (1 - amount + Math.random() * amount * 2);

interface Burst {
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  filter: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
}

/** A filtered slice of noise with a soft attack and exponential decay. */
function burst({ ctx, out, noise }: Synth, b: Burst) {
  const start = b.at ?? 0;
  const end = start + b.dur;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = b.filter;
  filter.Q.value = b.q ?? 0.8;
  filter.frequency.setValueAtTime(b.freq, start);
  if (b.freqEnd) filter.frequency.exponentialRampToValueAtTime(b.freqEnd, end);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(b.gain, start + (b.attack ?? 0.004));
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(filter).connect(amp).connect(out);
  source.start(start, Math.random() * 1.5, b.dur + 0.05);
}

interface Tone {
  at?: number;
  dur: number;
  gain: number;
  freq: number;
  freqEnd?: number;
  attack?: number;
  type?: OscillatorType;
}

function tone({ ctx, out }: Synth, t: Tone) {
  const start = t.at ?? 0;
  const end = start + t.dur;
  const osc = ctx.createOscillator();
  osc.type = t.type ?? 'sine';
  osc.frequency.setValueAtTime(t.freq, start);
  if (t.freqEnd) osc.frequency.exponentialRampToValueAtTime(t.freqEnd, end);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(t.gain, start + (t.attack ?? 0.006));
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(amp).connect(out);
  osc.start(start);
  osc.stop(end + 0.02);
}

/** A small bell: a sine with a quiet inharmonic overtone. */
function bell(s: Synth, freq: number, at: number, dur: number, gain = 0.09) {
  tone(s, { at, dur, gain, freq });
  tone(s, { at, dur: dur * 0.6, gain: gain * 0.22, freq: freq * 2.76 });
}

/** Steady filtered noise across the whole render, for seamless loops. */
function bed(s: Synth, filter: BiquadFilterType, freq: number, gain: number, q = 0.7) {
  const { ctx, out, noise, length } = s;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(f).connect(amp).connect(out);
  source.start(0, 0, length);
}

/** A soft wooden/plastic click: a short band of noise over a tiny low body. */
function click(s: Synth, at: number, gain = 0.2, freq = 1800) {
  burst(s, { at, dur: 0.018, gain, filter: 'bandpass', freq: jitter(freq), q: 1.6 });
  burst(s, { at, dur: 0.04, gain: gain * 0.6, filter: 'lowpass', freq: 500, q: 0.9 });
}

/** Paper moving: a band of noise sweeping up as it slides. */
function slide(s: Synth, at: number, dur: number, gain: number, from = 700, to = 1900) {
  burst(s, {
    at,
    dur,
    gain,
    attack: dur * 0.25,
    filter: 'bandpass',
    freq: jitter(from),
    freqEnd: to,
    q: 0.8,
  });
}

/** Little crackles scattered over a stretch of time, like creased paper. */
function crackles(s: Synth, from: number, to: number, count: number, gain: number, freq = 2400) {
  for (let i = 0; i < count; i += 1) {
    burst(s, {
      at: from + Math.random() * (to - from),
      dur: jitter(0.02, 0.4),
      gain: jitter(gain, 0.4),
      filter: 'bandpass',
      freq: jitter(freq, 0.3),
      q: 1.8,
    });
  }
}

function thud(s: Synth, at = 0, gain = 0.5) {
  burst(s, { at, dur: 0.14, gain, filter: 'lowpass', freq: jitter(220), q: 1 });
  tone(s, { at, dur: 0.2, gain: gain * 0.5, freq: 78, freqEnd: 52 });
}

export const RECIPES = {
  // Shared
  twine: (s) => {
    for (let i = 0; i < 6; i += 1) {
      burst(s, {
        at: i * 0.07 + Math.random() * 0.02,
        dur: 0.09,
        gain: 0.16 - i * 0.018,
        attack: 0.02,
        filter: 'bandpass',
        freq: jitter(1300 - i * 90),
        q: 2.2,
      });
    }
    burst(s, { at: 0.42, dur: 0.06, gain: 0.08, filter: 'lowpass', freq: 400 });
  },
  rip: (s) => {
    slide(s, 0, 0.58, 0.16, 800, 2600);
    crackles(s, 0.04, 0.5, 14, 0.07, 2200);
  },
  thud: (s) => thud(s, 0, 0.5),
  pop: (s) => {
    burst(s, { dur: 0.05, gain: 0.3, filter: 'lowpass', freq: 900, q: 1.2 });
    tone(s, { dur: 0.09, gain: 0.18, freq: 240, freqEnd: 150 });
    slide(s, 0.02, 0.16, 0.06, 1100, 2000);
  },
  whoosh: (s) =>
    burst(s, {
      dur: 0.3,
      gain: 0.14,
      attack: 0.12,
      filter: 'bandpass',
      freq: 1500,
      freqEnd: 450,
      q: 0.7,
    }),
  scratch: (s) => {
    const grains = Math.floor(s.length / 0.02);
    for (let i = 0; i < grains; i += 1) {
      burst(s, {
        at: i * 0.02 + Math.random() * 0.008,
        dur: jitter(0.03, 0.3),
        gain: jitter(0.06, 0.4),
        attack: 0.006,
        filter: 'bandpass',
        freq: jitter(3000, 0.2),
        q: 1.4,
      });
    }
  },
  chime: (s) => [784, 988, 1175].forEach((f, i) => bell(s, f, i * 0.07, 0.6)),
  stamp: (s) => {
    thud(s, 0, 0.45);
    burst(s, { dur: 0.03, gain: 0.12, filter: 'bandpass', freq: 1200, q: 1 });
  },
  tick: (s) => tone(s, { dur: 0.05, gain: 0.12, freq: jitter(1050, 0.04) }),
  page: (s) => {
    slide(s, 0, 0.32, 0.12, 600, 1700);
    crackles(s, 0.05, 0.3, 4, 0.04, 2000);
  },
  pen: (s) => {
    let t = 0;
    while (t < s.length - 0.25) {
      const stroke = jitter(0.18, 0.4);
      for (let g = 0; g < stroke; g += 0.016) {
        burst(s, {
          at: t + g,
          dur: 0.03,
          gain: jitter(0.035, 0.5),
          filter: 'bandpass',
          freq: jitter(3000, 0.25),
          q: 3,
        });
      }
      t += stroke + jitter(0.12, 0.6);
    }
  },
  typewriter: (s) => {
    let t = 0.02;
    while (t < s.length - 0.08) {
      click(s, t, jitter(0.16, 0.3), 2200);
      t += jitter(0.13, 0.35);
    }
  },
  // Loop
  slide: (s) => slide(s, 0, 0.25, 0.14),
  blip: (s) => {
    click(s, 0, 0.14);
    burst(s, {
      at: 0.03,
      dur: 0.26,
      gain: 0.05,
      attack: 0.05,
      filter: 'bandpass',
      freq: 500,
      freqEnd: 1400,
      q: 3,
    });
    click(s, 0.3, 0.1, 1500);
  },
  rewind: (s) => {
    burst(s, {
      dur: 0.46,
      gain: 0.1,
      attack: 0.08,
      filter: 'bandpass',
      freq: 420,
      freqEnd: 2200,
      q: 3,
    });
    tone(s, { dur: 0.44, gain: 0.025, freq: 260, freqEnd: 900, attack: 0.08, type: 'triangle' });
    click(s, 0.45, 0.12, 1400);
  },
  // Rewind
  cassette: (s) => {
    click(s, 0, 0.22, 1600);
    thud(s, 0.025, 0.4);
    click(s, 0.2, 0.08, 1200);
  },
  hiss: (s) => bed(s, 'bandpass', 4200, 0.12, 0.5),
  stopstart: (s) => {
    click(s, 0, 0.16, 1500);
    burst(s, { at: 0.03, dur: 0.14, gain: 0.04, filter: 'bandpass', freq: 700, q: 3 });
    click(s, 0.22, 0.12, 1700);
  },
  // Scrapbook
  liftReceipt: (s) => {
    slide(s, 0, 0.26, 0.09, 1200, 2600);
    crackles(s, 0.02, 0.24, 6, 0.05, 2800);
  },
  liftPhoto: (s) =>
    burst(s, {
      dur: 0.28,
      gain: 0.11,
      attack: 0.07,
      filter: 'bandpass',
      freq: 900,
      freqEnd: 2200,
      q: 1.6,
    }),
  liftNote: (s) => {
    slide(s, 0, 0.24, 0.1, 600, 1500);
    burst(s, { dur: 0.04, gain: 0.06, filter: 'lowpass', freq: 600 });
  },
  settle: (s) => {
    burst(s, { dur: 0.08, gain: 0.18, filter: 'lowpass', freq: jitter(650), q: 0.8 });
    slide(s, 0, 0.14, 0.04, 900, 1400);
  },
  softTick: (s) => tone(s, { dur: 0.06, gain: 0.08, freq: 880 }),
  crack: (s) => {
    burst(s, { dur: 0.025, gain: 0.26, filter: 'bandpass', freq: jitter(2400), q: 1 });
    burst(s, { at: 0.004, dur: 0.06, gain: 0.18, filter: 'bandpass', freq: 1100, q: 1.4 });
    thud(s, 0.01, 0.3);
    crackles(s, 0.06, 0.2, 3, 0.05, 3200);
  },
  unfold: (s) => {
    slide(s, 0, 0.56, 0.13, 600, 2000);
    crackles(s, 0.05, 0.5, 9, 0.05, 2200);
  },
  shuffle: (s) => {
    for (let i = 0; i < 7; i += 1) slide(s, i * 0.075, 0.1, 0.09, 1200, 2200);
    burst(s, { at: 0.52, dur: 0.07, gain: 0.12, filter: 'lowpass', freq: 600 });
  },
  scatter: (s) => {
    for (let i = 0; i < 3; i += 1) slide(s, i * 0.09 + Math.random() * 0.03, 0.12, 0.07);
  },
  peel: (s) =>
    burst(s, {
      dur: 0.2,
      gain: 0.09,
      attack: 0.05,
      filter: 'bandpass',
      freq: 1400,
      freqEnd: 3200,
      q: 1.5,
    }),
  tear: (s) => {
    slide(s, 0, 0.32, 0.12, 1000, 2600);
    crackles(s, 0.02, 0.3, 10, 0.06, 2600);
  },
  room: (s) => bed(s, 'lowpass', 280, 0.25, 0.5),
  // Accordion
  creak: (s) => {
    burst(s, {
      dur: 0.34,
      gain: 0.12,
      attack: 0.06,
      filter: 'bandpass',
      freq: 520,
      freqEnd: 900,
      q: 5,
    });
    crackles(s, 0.04, 0.3, 6, 0.04, 1900);
  },
  closing: (s) => [523, 659, 784, 1047].forEach((f, i) => bell(s, f, i * 0.09, 0.7, 0.07)),
  // Movie Box
  flutter: (s) => {
    click(s, 0, 0.14, 1500);
    const { ctx, out, noise } = s;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, 0.04);
    amp.gain.exponentialRampToValueAtTime(0.18, 0.14);
    amp.gain.setValueAtTime(0.18, 0.42);
    amp.gain.exponentialRampToValueAtTime(0.0001, 0.6);
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 18;
    const depth = ctx.createGain();
    depth.gain.value = 0.08;
    flutter.connect(depth).connect(amp.gain);
    source.connect(filter).connect(amp).connect(out);
    source.start(0.04, 0, 0.6);
    flutter.start(0.04);
    flutter.stop(0.62);
  },
  splice: (s) => {
    click(s, 0, 0.18, 1700);
    burst(s, { at: 0.02, dur: 0.08, gain: 0.08, filter: 'lowpass', freq: 380 });
  },
  shutter: (s) => {
    click(s, 0, 0.12, 2000);
    click(s, 0.045, 0.08, 1600);
  },
  bar: (s) => tone(s, { dur: 0.05, gain: 0.08, freq: jitter(820, 0.04), type: 'triangle' }),
  star: (s) => [659, 880, 1109].forEach((f, i) => bell(s, f, i * 0.08, 0.65, 0.08)),
  fin: (s) => {
    bell(s, 392, 0, 0.85, 0.09);
    bell(s, 523, 0.14, 0.75, 0.08);
  },
  hum: (s) => {
    const { ctx, out, noise, length } = s;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 2;
    const amp = ctx.createGain();
    amp.gain.value = 0.2;
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 18;
    const depth = ctx.createGain();
    depth.gain.value = 0.07;
    flutter.connect(depth).connect(amp.gain);
    source.connect(filter).connect(amp).connect(out);
    source.start(0, 0, length);
    flutter.start(0);
  },
  ratchet: (s) => click(s, 0, 0.1, 2000),
  reel: (s) => {
    burst(s, { dur: 0.018, gain: 0.14, filter: 'bandpass', freq: jitter(2600), q: 2 });
    burst(s, { at: 0.01, dur: 0.05, gain: 0.08, filter: 'lowpass', freq: jitter(520), q: 1 });
  },
  note: (s) => slide(s, 0, 0.18, 0.08, 900, 1700),
  // Wizard
  confirm: (s) => {
    tone(s, { dur: 0.09, gain: 0.07, freq: 660 });
    tone(s, { at: 0.07, dur: 0.14, gain: 0.07, freq: 880 });
  },
  success: (s) =>
    [523, 659, 784].forEach((f, i) => {
      bell(s, f, i * 0.11, 0.75, 0.08);
      tone(s, { at: i * 0.11, dur: 0.6, gain: 0.03, freq: f / 2, type: 'triangle' });
    }),
} satisfies Record<string, Recipe>;

export type SynthId = keyof typeof RECIPES;

/** Renders one recipe to a mono buffer of `seconds`, at the playback context's sample rate. */
export async function renderSynth(
  id: SynthId,
  sampleRate: number,
  seconds: number,
): Promise<AudioBuffer> {
  const length = Math.max(1, Math.round(sampleRate * seconds));
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  const noise = ctx.createBuffer(1, sampleRate * 3, sampleRate);
  noise.copyToChannel(pinkNoise(sampleRate), 0);
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.value = 6500;
  warmth.Q.value = 0.5;
  warmth.connect(ctx.destination);
  RECIPES[id]({ ctx, out: warmth, noise, length: seconds });
  const buffer = await ctx.startRendering();
  saturate(buffer.getChannelData(0), DRIVE[id] ?? 1.4);
  return buffer;
}

/**
 * Tape-style soft saturation: brings each render to a common peak and rounds off its transients,
 * so a short knock can sit as loud as a long rustle without spiking. Bells stay clean.
 */
const DRIVE: Partial<Record<SynthId, number>> = {
  thud: 3,
  stamp: 3,
  cassette: 3,
  crack: 2.5,
  splice: 2.5,
  pop: 2.5,
  settle: 5,
  typewriter: 2.5,
  stopstart: 2.5,
  reel: 2.5,
  ratchet: 2.5,
  shutter: 2.5,
  blip: 2,
  chime: 0,
  closing: 0,
  star: 0,
  fin: 0,
  success: 0,
  confirm: 0,
  tick: 0,
  bar: 0,
  softTick: 0,
};

function saturate(data: Float32Array, drive: number) {
  let max = 0;
  for (let i = 0; i < data.length; i += 1) max = Math.max(max, Math.abs(data[i]));
  if (max === 0) return;
  const scale = 0.9 / max;
  const curve = drive > 0 ? Math.tanh(drive) : 1;
  for (let i = 0; i < data.length; i += 1) {
    const x = data[i] * scale;
    data[i] = drive > 0 ? (Math.tanh(drive * x) / curve) * 0.9 : x;
  }
}
