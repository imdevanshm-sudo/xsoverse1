import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { renderSynth, type SynthId } from '@/lib/foley';

/**
 * The one place sound happens. Components name an event (`playSound('loop.slide')`) or hand over a
 * media element (`attachMedia`); levels, voice limits, pitch variation, ducking, mute and stopping
 * all live here. See SOUND_AUDIT.md for the asset list.
 *
 * Rules:
 * - Silent until opted in: the Sound toggle, or a Play / Unwrap / Open press (`optIn`). An explicit
 *   "off" on the toggle is remembered on the device and wins over opt-ins.
 * - Only plays while a keepsake or the wizard is mounted (`useSoundSurface`), so the landing page
 *   is always silent.
 * - Everything stops when the tab is hidden, the page is left, or the last surface unmounts.
 */

export type SoundFormat =
  'shared' | 'loop' | 'rewind' | 'scrapbook' | 'accordion' | 'moviebox' | 'wizard';
type Level = 'tick' | 'paper' | 'impact' | 'chime' | 'bed';
export type MediaKind = 'music' | 'voice';

/** Effects are levelled against this (momentary loudness, BS.1770 K-weighted). */
export const REFERENCE_LUFS = -20;
/** Offsets from the reference, in dB. Voice notes land at −16 LUFS and are never ducked. */
export const LEVELS: Record<Level | MediaKind, number> = {
  tick: -6,
  paper: -2,
  impact: 0,
  chime: 0,
  bed: -20,
  music: 2,
  voice: 4,
};
/** Music dips this far under effects and voice. */
export const DUCK_DB = -8;
/** Overlapping copies of one event; the oldest is faded out to make room. */
const MAX_VOICES = 2;
/** Random playback-rate spread per trigger, ±3%. */
const PITCH_SPREAD = 0.03;
/** The same event fired again within this window is a double trigger and is dropped. */
const REPEAT_GUARD_MS = 45;
/** Highest sample peak any levelled effect may reach (dBFS). */
const PEAK_CEILING = -1.5;

interface EventSpec {
  format: SoundFormat;
  /** What it should sound like, for the audit and the test page. */
  style: string;
  ms: number;
  level: Level;
  synth: SynthId;
  /** File name under /audio/sfx/; fetched only once `recorded` is true. */
  file: string;
  recorded?: boolean;
  /** Trim on top of the level, in dB. */
  gainDb?: number;
  /** Fixed playback rate, e.g. a lower pitch for the reverse direction. */
  pitch?: number;
  /** Pitch spread for this event; defaults to ±3%. */
  vary?: number;
  /** Plays as a seamless loop until stopped (textures and beds). */
  loop?: boolean;
  /** A loop that fades out by itself this long after its last `touch()`. */
  idleMs?: number;
  fadeInMs?: number;
  /** Music dips under it (default for everything but beds). */
  duck?: boolean;
}

const e = (spec: EventSpec) => spec;

export const SOUND_EVENTS = {
  // Shared: the parcel, photos, scratch-offs, the audit card and letters.
  'unwrap.twine': e({
    format: 'shared',
    style: 'Twine slipping off a parcel',
    ms: 500,
    level: 'paper',
    synth: 'twine',
    file: 'unwrap-twine.mp3',
  }),
  'unwrap.rip': e({
    format: 'shared',
    style: 'Kraft paper tearing open',
    ms: 600,
    level: 'paper',
    synth: 'rip',
    file: 'unwrap-rip.mp3',
  }),
  'unwrap.thud': e({
    format: 'shared',
    style: 'Soft thud as the gift settles',
    ms: 250,
    level: 'impact',
    synth: 'thud',
    file: 'unwrap-thud.mp3',
  }),
  'photo.pop': e({
    format: 'shared',
    style: 'Polaroid sliding out, soft pop',
    ms: 250,
    level: 'impact',
    synth: 'pop',
    file: 'photo-pop.mp3',
    gainDb: -2,
  }),
  'photo.close': e({
    format: 'shared',
    style: 'Soft whoosh back to the pile',
    ms: 300,
    level: 'paper',
    synth: 'whoosh',
    file: 'photo-close.mp3',
    gainDb: -2,
  }),
  'scratch.texture': e({
    format: 'shared',
    style: 'Coin on scratch-off foil (loop)',
    ms: 1500,
    level: 'paper',
    synth: 'scratch',
    file: 'scratch-texture.mp3',
    loop: true,
    idleMs: 50,
    fadeInMs: 20,
  }),
  'scratch.reveal': e({
    format: 'shared',
    style: 'Warm three-note reveal chime',
    ms: 700,
    level: 'chime',
    synth: 'chime',
    file: 'scratch-reveal.mp3',
  }),
  'audit.stamp': e({
    format: 'shared',
    style: 'Rubber stamp thud',
    ms: 250,
    level: 'impact',
    synth: 'stamp',
    file: 'audit-stamp.mp3',
  }),
  'audit.tick': e({
    format: 'shared',
    style: 'Soft radar tick',
    ms: 60,
    level: 'tick',
    synth: 'tick',
    file: 'audit-tick.mp3',
    gainDb: -2,
  }),
  'letter.pen': e({
    format: 'shared',
    style: 'Pen scratching paper (loop)',
    ms: 2000,
    level: 'paper',
    synth: 'pen',
    file: 'letter-pen.mp3',
    loop: true,
    gainDb: -4,
    fadeInMs: 120,
  }),
  'letter.type': e({
    format: 'shared',
    style: 'Typewriter keys (loop)',
    ms: 2000,
    level: 'paper',
    synth: 'typewriter',
    file: 'letter-type.mp3',
    loop: true,
    gainDb: -4,
    fadeInMs: 60,
  }),
  // Loop
  'loop.slide': e({
    format: 'loop',
    style: 'Card sliding off the pile',
    ms: 250,
    level: 'paper',
    synth: 'slide',
    file: 'loop-slide.mp3',
  }),
  'loop.round': e({
    format: 'loop',
    style: 'Tape blip as the loop comes round',
    ms: 400,
    level: 'tick',
    synth: 'blip',
    file: 'loop-round.mp3',
  }),
  'loop.restart': e({
    format: 'loop',
    style: 'Tape rewind sweep',
    ms: 500,
    level: 'paper',
    synth: 'rewind',
    file: 'loop-restart.mp3',
  }),
  // Rewind
  'rewind.play': e({
    format: 'rewind',
    style: 'Cassette deck thunk',
    ms: 300,
    level: 'impact',
    synth: 'cassette',
    file: 'rewind-play.mp3',
  }),
  'rewind.hiss': e({
    format: 'rewind',
    style: 'Tape hiss bed under the track (loop)',
    ms: 2000,
    level: 'bed',
    synth: 'hiss',
    file: 'rewind-hiss.mp3',
    loop: true,
    fadeInMs: 500,
    duck: false,
  }),
  'rewind.track': e({
    format: 'rewind',
    style: 'Tape stop-start tick',
    ms: 300,
    level: 'tick',
    synth: 'stopstart',
    file: 'rewind-track.mp3',
  }),
  'rewind.liner': e({
    format: 'rewind',
    style: 'Page turn of the J-card',
    ms: 350,
    level: 'paper',
    synth: 'page',
    file: 'rewind-liner.mp3',
  }),
  // Scrapbook
  'scrap.lift.receipt': e({
    format: 'scrapbook',
    style: 'Thin receipt lifted, crinkle',
    ms: 300,
    level: 'paper',
    synth: 'liftReceipt',
    file: 'scrap-lift-receipt.mp3',
  }),
  'scrap.lift.photo': e({
    format: 'scrapbook',
    style: 'Glossy print lifted',
    ms: 300,
    level: 'paper',
    synth: 'liftPhoto',
    file: 'scrap-lift-photo.mp3',
  }),
  'scrap.lift.note': e({
    format: 'scrapbook',
    style: 'Card or note lifted, rustle',
    ms: 300,
    level: 'paper',
    synth: 'liftNote',
    file: 'scrap-lift-note.mp3',
  }),
  'scrap.settle': e({
    format: 'scrapbook',
    style: 'Piece set back on the desk',
    ms: 250,
    level: 'paper',
    synth: 'settle',
    file: 'scrap-settle.mp3',
  }),
  'scrap.first': e({
    format: 'scrapbook',
    style: 'Soft tick, first time a piece opens',
    ms: 70,
    level: 'tick',
    synth: 'softTick',
    file: 'scrap-first.mp3',
  }),
  'scrap.seal': e({
    format: 'scrapbook',
    style: 'Wax seal cracking',
    ms: 300,
    level: 'impact',
    synth: 'crack',
    file: 'scrap-seal.mp3',
  }),
  'scrap.unfold': e({
    format: 'scrapbook',
    style: 'Letter unfolding',
    ms: 600,
    level: 'paper',
    synth: 'unfold',
    file: 'scrap-unfold.mp3',
  }),
  'scrap.tidy': e({
    format: 'scrapbook',
    style: 'Pieces swept into a neat pile',
    ms: 600,
    level: 'paper',
    synth: 'shuffle',
    file: 'scrap-tidy.mp3',
  }),
  'scrap.scatter': e({
    format: 'scrapbook',
    style: 'Pieces spread back out, lighter',
    ms: 400,
    level: 'paper',
    synth: 'scatter',
    file: 'scrap-scatter.mp3',
    gainDb: -3,
  }),
  'scrap.peel': e({
    format: 'scrapbook',
    style: 'Sticky note corner peeling',
    ms: 200,
    level: 'paper',
    synth: 'peel',
    file: 'scrap-peel.mp3',
  }),
  'scrap.tear': e({
    format: 'scrapbook',
    style: 'Ticket torn along the dots',
    ms: 350,
    level: 'paper',
    synth: 'tear',
    file: 'scrap-tear.mp3',
  }),
  'scrap.pick': e({
    format: 'scrapbook',
    style: 'Fingertip picking a piece up',
    ms: 60,
    level: 'tick',
    synth: 'softTick',
    file: 'scrap-pick.mp3',
    gainDb: -3,
  }),
  'scrap.room': e({
    format: 'scrapbook',
    style: 'Quiet room tone (loop, off by default)',
    ms: 2000,
    level: 'bed',
    synth: 'room',
    file: 'scrap-room.mp3',
    loop: true,
    fadeInMs: 1500,
    duck: false,
  }),
  // Accordion
  'fold.open': e({
    format: 'accordion',
    style: 'Paper fold creaking open',
    ms: 350,
    level: 'paper',
    synth: 'creak',
    file: 'fold-creak.mp3',
    pitch: 1.06,
  }),
  'fold.close': e({
    format: 'accordion',
    style: 'Same creak, lower, folding shut',
    ms: 350,
    level: 'paper',
    synth: 'creak',
    file: 'fold-creak.mp3',
    pitch: 0.86,
  }),
  'fold.shut': e({
    format: 'accordion',
    style: 'Folded bundle settling shut',
    ms: 250,
    level: 'paper',
    synth: 'settle',
    file: 'fold-shut.mp3',
  }),
  'accordion.end': e({
    format: 'accordion',
    style: 'Closing chime after the letter',
    ms: 800,
    level: 'chime',
    synth: 'closing',
    file: 'accordion-end.mp3',
  }),
  // Movie Box
  'movie.start': e({
    format: 'moviebox',
    style: 'Projector flutter and leader tick',
    ms: 600,
    level: 'paper',
    synth: 'flutter',
    file: 'movie-start.mp3',
  }),
  'movie.splice': e({
    format: 'moviebox',
    style: 'Splice tick between scenes',
    ms: 300,
    level: 'tick',
    synth: 'splice',
    file: 'movie-splice.mp3',
    vary: 0.05,
  }),
  'movie.shutter': e({
    format: 'moviebox',
    style: 'Soft shutter click per slide',
    ms: 120,
    level: 'tick',
    synth: 'shutter',
    file: 'movie-shutter.mp3',
    gainDb: -2,
  }),
  'movie.bar': e({
    format: 'moviebox',
    style: 'Tick as an audit bar fills',
    ms: 60,
    level: 'tick',
    synth: 'bar',
    file: 'movie-bar.mp3',
    gainDb: -2,
  }),
  'movie.star': e({
    format: 'moviebox',
    style: 'Chime on the final star count',
    ms: 800,
    level: 'chime',
    synth: 'star',
    file: 'movie-star.mp3',
  }),
  'movie.fin': e({
    format: 'moviebox',
    style: 'Closing note at "Fin"',
    ms: 900,
    level: 'chime',
    synth: 'fin',
    file: 'movie-fin.mp3',
  }),
  'projector.step': e({
    format: 'moviebox',
    style: 'Claw pulling a frame through the gate',
    ms: 80,
    level: 'tick',
    synth: 'reel',
    file: 'projector-step.mp3',
  }),
  'projector.ratchet': e({
    format: 'moviebox',
    style: 'Crank ratchet tooth',
    ms: 40,
    level: 'tick',
    synth: 'ratchet',
    file: 'projector-ratchet.mp3',
    gainDb: -6,
  }),
  'projector.hum': e({
    format: 'moviebox',
    style: 'Projector motor hum (loop)',
    ms: 2000,
    level: 'bed',
    synth: 'hum',
    file: 'projector-hum.mp3',
    loop: true,
    gainDb: 8,
    fadeInMs: 250,
    duck: false,
  }),
  'projector.note': e({
    format: 'moviebox',
    style: "Director's note slid out",
    ms: 180,
    level: 'paper',
    synth: 'note',
    file: 'projector-note.mp3',
    gainDb: -3,
  }),
  // Wizard
  'wizard.step': e({
    format: 'wizard',
    style: 'Soft two-note step confirm',
    ms: 220,
    level: 'tick',
    synth: 'confirm',
    file: 'wizard-step.mp3',
  }),
  'wizard.success': e({
    format: 'wizard',
    style: 'Warm success chord after payment',
    ms: 900,
    level: 'chime',
    synth: 'success',
    file: 'wizard-success.mp3',
  }),
} satisfies Record<string, EventSpec>;

export type SoundEvent = keyof typeof SOUND_EVENTS;
export const ROOM_TONE = false;

const spec = (event: SoundEvent): EventSpec => SOUND_EVENTS[event];
const dbToGain = (db: number) => 10 ** (db / 20);
const gainToDb = (gain: number) => 20 * Math.log10(Math.max(gain, 1e-9));
export const targetLufs = (event: SoundEvent) =>
  REFERENCE_LUFS + LEVELS[spec(event).level] + (spec(event).gainDb ?? 0);

// ---------------------------------------------------------------------------------------------
// Preference and opt-in

const PREF = 'xso:sound';
let pref: 'on' | 'off' | null = null;
let enabled = false;
let surfaces = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(PREF);
    pref = saved === 'on' || saved === 'off' ? saved : null;
  } catch {}
  enabled = pref === 'on';
}

/** What the toggle shows. */
export function soundOn(): boolean {
  return enabled;
}

const audible = () =>
  enabled && surfaces > 0 && typeof document !== 'undefined' && !document.hidden;

function setEnabled(on: boolean) {
  enabled = on;
  if (on) context();
  applyMaster();
  if (!on) stopEffects();
  emit();
}

/** A Play / Unwrap / Open press: turns sound on unless this device has chosen "off". */
export function optIn() {
  if (pref === 'off') {
    context();
    return;
  }
  if (!enabled) setEnabled(true);
  else context();
}

/** The Sound toggle. Its choice is remembered on this device. */
export function toggleSound() {
  pref = enabled ? 'off' : 'on';
  try {
    localStorage.setItem(PREF, pref);
  } catch {}
  setEnabled(pref === 'on');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, soundOn, () => false);
}

/** Mount in every keepsake viewer and the wizard; sound is impossible anywhere else. */
export function useSoundSurface() {
  useEffect(() => {
    surfaces += 1;
    return () => {
      surfaces -= 1;
      if (surfaces === 0) stopAll();
    };
  }, []);
}

// ---------------------------------------------------------------------------------------------
// Graph: effects, music (ducked) and voice buses into a muting master and a safety limiter.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let fxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let voiceBus: GainNode | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = enabled ? 1 : 0;
    fxBus = ctx.createGain();
    musicBus = ctx.createGain();
    voiceBus = ctx.createGain();
    fxBus.connect(master);
    musicBus.connect(master);
    voiceBus.connect(master);
    master.connect(limiter).connect(ctx.destination);
    /** iOS only starts output after a sound is scheduled inside the tap. */
    const blank = ctx.createBufferSource();
    blank.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    blank.connect(ctx.destination);
    blank.start();
  }
  if (ctx.state === 'suspended' && !document.hidden) void ctx.resume().catch(() => {});
  return ctx;
}

function applyMaster() {
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, 0.015);
}

// Ducking: transient effects push it out for their length; voice and textures hold it.
let duckHolds = 0;
let duckUntil = 0;
let duckTimer = 0;
function updateDuck() {
  if (!ctx || !musicBus) return;
  const ducked = duckHolds > 0 || performance.now() < duckUntil;
  musicBus.gain.setTargetAtTime(
    ducked ? dbToGain(DUCK_DB) : 1,
    ctx.currentTime,
    ducked ? 0.02 : 0.15,
  );
}
function duckFor(ms: number) {
  duckUntil = Math.max(duckUntil, performance.now() + ms + 120);
  updateDuck();
  window.clearTimeout(duckTimer);
  duckTimer = window.setTimeout(updateDuck, duckUntil - performance.now() + 10);
}
function holdDuck(on: boolean) {
  duckHolds = Math.max(0, duckHolds + (on ? 1 : -1));
  updateDuck();
}

// ---------------------------------------------------------------------------------------------
// Buffers: a recorded file when there is one, otherwise the synthesized stand-in. Each is
// measured once and levelled to its event's target.

interface Prepared {
  buffer: AudioBuffer;
  gain: number;
  source: 'file' | 'synth';
  lufs: number;
  peakDb: number;
}

const prepared = new Map<SoundEvent, Promise<Prepared | null>>();

async function load(c: AudioContext, event: SoundEvent): Promise<AudioBuffer | null> {
  const { file, recorded } = spec(event);
  if (!recorded) return null;
  try {
    const response = await fetch(`/audio/sfx/${file}`);
    if (!response.ok) return null;
    return await c.decodeAudioData(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function prepare(event: SoundEvent): Promise<Prepared | null> {
  let pending = prepared.get(event);
  if (pending) return pending;
  const c = context();
  if (!c) return Promise.resolve(null);
  const s = spec(event);
  pending = (async () => {
    let buffer = await load(c, event);
    const source = buffer ? 'file' : 'synth';
    if (!buffer) {
      const seconds = s.loop ? s.ms / 1000 : s.ms / 1000 + 0.15;
      buffer = await renderSynth(s.synth, c.sampleRate, seconds).catch(() => null);
    }
    if (!buffer) return null;
    const lufs = s.loop ? integratedLoudness(buffer) : momentaryMax(buffer);
    const peakDb = gainToDb(peak(buffer));
    const wanted = targetLufs(event) - lufs;
    const gainDb = Math.min(wanted, PEAK_CEILING - peakDb, 24);
    return { buffer, gain: dbToGain(gainDb), source, lufs, peakDb } satisfies Prepared;
  })().catch(() => null);
  prepared.set(event, pending);
  return pending;
}

/** Warm a format's sounds after an opt-in, so the first trigger isn't late. */
export function preloadSounds(events: SoundEvent[]) {
  if (!ctx) return;
  events.forEach((event) => void prepare(event));
}

// ---------------------------------------------------------------------------------------------
// One-shots

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  ends: number;
}
const voices = new Map<SoundEvent, Voice[]>();
const lastFired = new Map<SoundEvent, number>();

function fadeOut(voice: Voice, seconds = 0.03) {
  if (!ctx) return;
  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + seconds);
  try {
    voice.source.stop(now + seconds + 0.01);
  } catch {}
}

export interface PlayOptions {
  /** Playback rate on top of the event's own pitch, e.g. 0.9 for the reverse direction. */
  rate?: number;
  /** Schedule it this far ahead, to land on an animation beat. */
  delayMs?: number;
}

export function playSound(event: SoundEvent, options: PlayOptions = {}) {
  const now = performance.now();
  if (now - (lastFired.get(event) ?? -Infinity) < REPEAT_GUARD_MS) return;
  lastFired.set(event, now);
  record(event, audible());
  if (!audible()) return;
  const s = spec(event);
  void prepare(event).then((ready) => {
    const c = ctx;
    if (!ready || !c || !fxBus || !audible()) return;
    const start = c.currentTime + (options.delayMs ?? 0) / 1000;
    const live = (voices.get(event) ?? []).filter((v) => v.ends > c.currentTime);
    while (live.length >= MAX_VOICES) fadeOut(live.shift()!);
    const source = c.createBufferSource();
    source.buffer = ready.buffer;
    const spread = s.vary ?? PITCH_SPREAD;
    const rate = (options.rate ?? 1) * (s.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * spread);
    source.playbackRate.value = rate;
    const gain = c.createGain();
    gain.gain.value = ready.gain;
    source.connect(gain).connect(fxBus);
    source.start(start);
    const voice = { source, gain, ends: start + ready.buffer.duration / rate };
    live.push(voice);
    voices.set(event, live);
    source.onended = () => {
      const list = voices.get(event);
      if (list)
        voices.set(
          event,
          list.filter((v) => v !== voice),
        );
    };
    if (s.duck !== false) duckFor((options.delayMs ?? 0) + s.ms);
  });
}

// ---------------------------------------------------------------------------------------------
// Textures and beds: loops that run while something is happening.

export interface Texture {
  /** Starts it if needed; textures with `idleMs` fade out that long after the last touch. */
  touch: () => void;
  stop: (fadeMs?: number) => void;
}

const textures = new Set<Texture>();

export function texture(event: SoundEvent): Texture {
  const s = spec(event);
  let running: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  let starting = false;
  let idle = 0;
  const stop = (fadeMs = 120) => {
    window.clearTimeout(idle);
    starting = false;
    const current = running;
    running = null;
    if (!current || !ctx) return;
    const now = ctx.currentTime;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setValueAtTime(current.gain.gain.value, now);
    current.gain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
    try {
      current.source.stop(now + fadeMs / 1000 + 0.02);
    } catch {}
    if (s.duck !== false) holdDuck(false);
  };
  const handle: Texture = {
    touch: () => {
      if (s.idleMs) {
        window.clearTimeout(idle);
        idle = window.setTimeout(() => stop(s.idleMs! + 70), s.idleMs);
      }
      if (running || starting) return;
      record(event, audible());
      if (!audible()) return;
      starting = true;
      void prepare(event).then((ready) => {
        const c = ctx;
        if (!starting || !ready || !c || !fxBus || !audible()) {
          starting = false;
          return;
        }
        starting = false;
        const source = c.createBufferSource();
        source.buffer = ready.buffer;
        source.loop = true;
        source.playbackRate.value = s.pitch ?? 1;
        const gain = c.createGain();
        gain.gain.setValueAtTime(0, c.currentTime);
        gain.gain.linearRampToValueAtTime(ready.gain, c.currentTime + (s.fadeInMs ?? 30) / 1000);
        source.connect(gain).connect(fxBus);
        source.start(c.currentTime, Math.random() * ready.buffer.duration);
        running = { source, gain };
        if (s.duck !== false) holdDuck(true);
      });
    },
    stop,
  };
  textures.add(handle);
  return handle;
}

/** A texture owned by a component: stopped when it unmounts. */
export function useTexture(event: SoundEvent): Texture {
  const handle = useMemo(() => texture(event), [event]);
  useEffect(
    () => () => {
      handle.stop(60);
      textures.delete(handle);
    },
    [handle],
  );
  return handle;
}

// ---------------------------------------------------------------------------------------------
// Music and voice: media elements routed through the music (ducked) or voice bus.

export interface MediaHandle {
  /** Ramps this element's own level (0–1) over `ms`. */
  fade: (to: number, ms: number, done?: () => void) => void;
  release: () => void;
}

interface MediaEntry {
  el: HTMLAudioElement;
  resume: boolean;
}
const media = new Set<MediaEntry>();
const routed = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

/** An audio element that can be routed through the mixer; use instead of `new Audio()`. */
export function mediaElement(src: string): HTMLAudioElement {
  const el = new Audio();
  el.crossOrigin = 'anonymous';
  el.preload = 'none';
  el.src = src;
  return el;
}

const loudnessCache = new Map<string, Promise<number | null>>();
/** Integrated loudness of short media (voice notes, inline uploads), measured once. */
function measureMedia(src: string): Promise<number | null> {
  let pending = loudnessCache.get(src);
  if (pending) return pending;
  pending = (async () => {
    const c = context();
    if (!c) return null;
    const response = await fetch(src);
    const data = await response.arrayBuffer();
    if (data.byteLength > 3_000_000) return null;
    return integratedLoudness(await c.decodeAudioData(data), 60);
  })().catch(() => null);
  loudnessCache.set(src, pending);
  return pending;
}

/**
 * Call inside the tap that starts playback. `loudness` (integrated LUFS) is known for bundled
 * tracks; anything else is measured in the background and assumed to sit near −20 until then.
 */
export function attachMedia(el: HTMLAudioElement, kind: MediaKind, loudness?: number): MediaHandle {
  const c = context();
  const entry: MediaEntry = { el, resume: false };
  media.add(entry);
  const target = REFERENCE_LUFS + LEVELS[kind];
  const level = (lufs: number) => dbToGain(Math.max(-12, Math.min(12, target - lufs)));
  let holding = false;
  const onPlay = () => {
    if (kind !== 'voice' || holding) return;
    holding = true;
    holdDuck(true);
  };
  const onStop = () => {
    if (!holding) return;
    holding = false;
    holdDuck(false);
  };
  el.addEventListener('play', onPlay);
  el.addEventListener('pause', onStop);
  el.addEventListener('ended', onStop);

  let norm: GainNode | null = null;
  let fader: GainNode | null = null;
  if (c && fxBus && musicBus && voiceBus) {
    try {
      const source = routed.get(el) ?? c.createMediaElementSource(el);
      routed.set(el, source);
      norm = c.createGain();
      norm.gain.value = level(loudness ?? REFERENCE_LUFS);
      fader = c.createGain();
      source
        .connect(norm)
        .connect(fader)
        .connect(kind === 'voice' ? voiceBus : musicBus);
    } catch {
      norm = null;
      fader = null;
    }
  }
  if (!fader) el.muted = !enabled;
  if (loudness === undefined && norm) {
    void measureMedia(el.currentSrc || el.src).then((lufs) => {
      if (lufs !== null && norm && ctx)
        norm.gain.setTargetAtTime(level(lufs), ctx.currentTime, 0.3);
    });
  }

  let timer = 0;
  const fade: MediaHandle['fade'] = (to, ms, done) => {
    window.clearInterval(timer);
    if (fader && ctx) {
      const now = ctx.currentTime;
      fader.gain.cancelScheduledValues(now);
      fader.gain.setValueAtTime(fader.gain.value, now);
      fader.gain.linearRampToValueAtTime(to, now + ms / 1000);
      if (done) timer = window.setTimeout(done, ms);
      return;
    }
    const from = el.volume;
    const started = performance.now();
    timer = window.setInterval(() => {
      const t = ms > 0 ? Math.min(1, (performance.now() - started) / ms) : 1;
      el.volume = from + (to - from) * t;
      if (t >= 1) {
        window.clearInterval(timer);
        done?.();
      }
    }, 50);
  };
  const unmute = () => {
    if (!fader) el.muted = !enabled;
  };
  listeners.add(unmute);

  return {
    fade,
    release: () => {
      window.clearInterval(timer);
      window.clearTimeout(timer);
      el.pause();
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onStop);
      el.removeEventListener('ended', onStop);
      onStop();
      fader?.disconnect();
      norm?.disconnect();
      listeners.delete(unmute);
      media.delete(entry);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Stopping

function stopEffects() {
  voices.forEach((list) => list.forEach((voice) => fadeOut(voice)));
  voices.clear();
  textures.forEach((t) => t.stop(30));
}

/** Silences everything: effects, beds and every routed element. */
export function stopAll({ resumable = false }: { resumable?: boolean } = {}) {
  stopEffects();
  media.forEach((entry) => {
    entry.resume = resumable && !entry.el.paused;
    entry.el.pause();
  });
  record('stop', false);
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAll({ resumable: true });
      void ctx?.suspend().catch(() => {});
      return;
    }
    if (!ctx) return;
    void ctx.resume().catch(() => {});
    media.forEach((entry) => {
      if (!entry.resume) return;
      entry.resume = false;
      void entry.el.play().catch(() => {});
    });
  });
  window.addEventListener('pagehide', () => stopAll());
}

// ---------------------------------------------------------------------------------------------
// Loudness (ITU-R BS.1770 K-weighting), for levelling and the test page.

function kWeighted(buffer: AudioBuffer, maxSeconds?: number): Float32Array[] {
  const fs = buffer.sampleRate;
  const length = maxSeconds ? Math.min(buffer.length, fs * maxSeconds) : buffer.length;
  let K = Math.tan((Math.PI * 1681.974450955533) / fs);
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let Q = 0.7071752369554196;
  let a0 = 1 + K / Q + K * K;
  const shelf = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  K = Math.tan((Math.PI * 38.13547087602444) / fs);
  Q = 0.5003270373238773;
  a0 = 1 + K / Q + K * K;
  const high = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 };
  const out: Float32Array[] = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const x = buffer.getChannelData(ch);
    const y = new Float32Array(length);
    for (const f of [shelf, high]) {
      let x1 = 0;
      let x2 = 0;
      let y1 = 0;
      let y2 = 0;
      const input = f === shelf ? x : y;
      for (let i = 0; i < length; i += 1) {
        const xi = input[i];
        const yi = f.b0 * xi + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
        x2 = x1;
        x1 = xi;
        y2 = y1;
        y1 = yi;
        y[i] = yi;
      }
    }
    out.push(y);
  }
  return out;
}

/** Mean-square energy of each 400 ms block (hop 100 ms), summed over channels. */
function blocks(buffer: AudioBuffer, maxSeconds?: number): number[] {
  const channels = kWeighted(buffer, maxSeconds);
  const fs = buffer.sampleRate;
  const size = Math.round(fs * 0.4);
  const hop = Math.round(fs * 0.1);
  const length = channels[0].length;
  const out: number[] = [];
  for (let start = 0; start === 0 || start + size <= length; start += hop) {
    let sum = 0;
    for (const y of channels) {
      let s = 0;
      const end = Math.min(length, start + size);
      for (let i = start; i < end; i += 1) s += y[i] * y[i];
      sum += s / size;
    }
    out.push(sum);
    if (start + size >= length) break;
  }
  return out;
}

const toLufs = (power: number) => -0.691 + 10 * Math.log10(Math.max(power, 1e-12));

/** Loudest 400 ms window: how loud a short effect feels. */
export function momentaryMax(buffer: AudioBuffer): number {
  return toLufs(Math.max(...blocks(buffer)));
}

/** Gated programme loudness: for music, voice and steady loops. */
export function integratedLoudness(buffer: AudioBuffer, maxSeconds?: number): number {
  const all = blocks(buffer, maxSeconds).filter((p) => toLufs(p) > -70);
  if (!all.length) return -70;
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  const gated = all.filter((p) => toLufs(p) > toLufs(mean) - 10);
  return toLufs(gated.reduce((a, b) => a + b, 0) / gated.length);
}

function peak(buffer: AudioBuffer): number {
  let max = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i += 1) max = Math.max(max, Math.abs(data[i]));
  }
  return max;
}

// ---------------------------------------------------------------------------------------------
// Inspection, for /dev/sound-test and the checklist script.

export interface SoundReport {
  event: SoundEvent;
  source: 'file' | 'synth';
  rawLufs: number;
  gainDb: number;
  /** What actually comes out: measured loudness after levelling. */
  outLufs: number;
  targetLufs: number;
  peakDb: number;
}

export async function inspectSound(event: SoundEvent): Promise<SoundReport | null> {
  const ready = await prepare(event);
  if (!ready) return null;
  const gainDb = gainToDb(ready.gain);
  return {
    event,
    source: ready.source,
    rawLufs: ready.lufs,
    gainDb,
    outLufs: ready.lufs + gainDb,
    targetLufs: targetLufs(event),
    peakDb: ready.peakDb + gainDb,
  };
}

interface LogEntry {
  event: string;
  at: number;
  audible: boolean;
}
const log: LogEntry[] = [];
function record(event: string, heard: boolean) {
  log.push({ event, at: Math.round(performance.now()), audible: heard });
  if (log.length > 300) log.shift();
}

/** Live state for tests: what's playing and whether anything could be heard. */
export function soundState() {
  const now = ctx?.currentTime ?? 0;
  let live = 0;
  const perEvent: Record<string, number> = {};
  voices.forEach((list, event) => {
    const count = list.filter((v) => v.ends > now).length;
    live += count;
    if (count) perEvent[event] = count;
  });
  return {
    enabled,
    surfaces,
    context: ctx?.state ?? 'none',
    master: master?.gain.value ?? 0,
    voices: live,
    perEvent,
    media: Array.from(media).filter((m) => !m.el.paused).length,
    log: log.slice(),
  };
}

if (typeof window !== 'undefined') {
  (window as typeof window & { __xsoSound?: unknown }).__xsoSound = {
    state: soundState,
    play: playSound,
    clear: () => log.splice(0),
  };
}
