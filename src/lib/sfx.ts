import { getAudioContext, playFoley, type FoleyCue } from '@/lib/foley';
import { soundOn } from '@/lib/sound';

/**
 * Recorded effects for the scrapbook. Each file is fetched the first time it's played, never on
 * page load; until a file exists (or if it fails to load) the matching synthesized cue plays.
 *
 * TODO(assets): supply short, licensed MP3s (mono, under ~40 KB each) at these paths and record
 * their licences here.
 *   - public/audio/sfx/paper-rustle.mp3   — a sheet lifted off a desk (~0.4s). Licence: TODO
 *   - public/audio/sfx/seal-crack.mp3     — a wax seal snapping (~0.3s). Licence: TODO
 *   - public/audio/sfx/polaroid-slide.mp3 — a print sliding across wood (~0.4s). Licence: TODO
 *   - public/audio/sfx/parcel-unwrap.mp3  — kraft paper and twine pulled off a parcel (~1s).
 *     A generated placeholder ships in its place. Licence: TODO
 */
const SFX = {
  'paper-rustle': { src: '/audio/sfx/paper-rustle.mp3', fallback: 'flip' },
  'seal-crack': { src: '/audio/sfx/seal-crack.mp3', fallback: 'crack' },
  'polaroid-slide': { src: '/audio/sfx/polaroid-slide.mp3', fallback: 'slide' },
  'parcel-unwrap': { src: '/audio/sfx/parcel-unwrap.mp3', fallback: 'unwrap' },
} satisfies Record<string, { src: string; fallback: FoleyCue }>;

export type SfxId = keyof typeof SFX;

const files = new Map<SfxId, Promise<ArrayBuffer | null>>();
const buffers = new Map<SfxId, Promise<AudioBuffer | null>>();

/** Downloads a file without decoding it, so it can start before any tap creates an AudioContext. */
export function preloadSfx(id: SfxId): Promise<ArrayBuffer | null> {
  let pending = files.get(id);
  if (!pending) {
    pending = fetch(SFX[id].src)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    files.set(id, pending);
  }
  return pending;
}

function load(ctx: AudioContext, id: SfxId): Promise<AudioBuffer | null> {
  let pending = buffers.get(id);
  if (!pending) {
    pending = preloadSfx(id)
      .then((data) => (data ? ctx.decodeAudioData(data.slice(0)) : null))
      .catch(() => null);
    buffers.set(id, pending);
  }
  return pending;
}

export function playSfx(id: SfxId, volume = 0.8) {
  if (!soundOn()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  void load(ctx, id).then((buffer) => {
    if (!soundOn()) return;
    if (!buffer) return playFoley(SFX[id].fallback, volume);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start();
  });
}
