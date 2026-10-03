/**
 * Movie Box soundtracks. Files live in `public/audio/soundtracks/` and are only fetched after the
 * recipient taps Play.
 *
 * TODO(assets): add licensed, royalty-free MP3s at these paths (≈1–2 MB each, 128 kbps, 60–120 s,
 * ideally loopable) and record each track's licence here before launch:
 *   - golden-hour.mp3      warm solo piano
 *   - slow-dance.mp3       soft strings
 *   - late-night-drive.mp3 mellow lo-fi
 *   - home-movies.mp3      fingerpicked acoustic guitar
 */
export interface Soundtrack {
  id: string;
  name: string;
  mood: string;
  src: string;
  /** Licence or source, for the record. TODO(assets): fill in for each track. */
  licence: string;
}

export const SOUNDTRACKS: Soundtrack[] = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    mood: 'Warm piano',
    src: '/audio/soundtracks/golden-hour.mp3',
    licence: 'TODO',
  },
  {
    id: 'slow-dance',
    name: 'Slow Dance',
    mood: 'Soft strings',
    src: '/audio/soundtracks/slow-dance.mp3',
    licence: 'TODO',
  },
  {
    id: 'late-night-drive',
    name: 'Late Night Drive',
    mood: 'Mellow lo-fi',
    src: '/audio/soundtracks/late-night-drive.mp3',
    licence: 'TODO',
  },
  {
    id: 'home-movies',
    name: 'Home Movies',
    mood: 'Acoustic guitar',
    src: '/audio/soundtracks/home-movies.mp3',
    licence: 'TODO',
  },
];

export const DEFAULT_SOUNDTRACK = `track:${SOUNDTRACKS[0].id}`;

/** Uploads ride inside the gift payload with the photos, so they stay small. */
export const SOUNDTRACK_UPLOAD_MAX_BYTES = 1_000_000;
/** Base64 data URL length for the largest allowed upload, plus its header. */
export const SOUNDTRACK_UPLOAD_MAX_CHARS = Math.ceil((SOUNDTRACK_UPLOAD_MAX_BYTES * 4) / 3) + 64;

const UPLOAD = /^data:audio\/(mpeg|mp3|mp4|x-m4a|aac|ogg|webm|wav|x-wav);base64,[A-Za-z0-9+/=]+$/;

/** `track:<id>` for a bundled track, an uploaded audio data URL, or '' for no music. */
export function sanitizeSoundtrack(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  if (value.startsWith('track:')) {
    return SOUNDTRACKS.some((t) => `track:${t.id}` === value) ? value : '';
  }
  return value.length <= SOUNDTRACK_UPLOAD_MAX_CHARS && UPLOAD.test(value) ? value : '';
}

/** Playable URL for a stored soundtrack value, or null for no music. */
export function soundtrackSrc(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('track:')) {
    return SOUNDTRACKS.find((t) => `track:${t.id}` === value)?.src ?? null;
  }
  return value.startsWith('data:audio/') ? value : null;
}
