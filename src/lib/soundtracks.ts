/**
 * Movie Box soundtracks. Files live in `public/audio/soundtracks/` and are only fetched after the
 * recipient taps Play.
 *
 * TODO(assets): replace the generated placeholder loops at these paths with licensed, royalty-free
 * MP3s (≈1–2 MB each, 128 kbps, 60–120 s, ideally loopable) and record each track's licence here:
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
  /** Integrated loudness of the file (LUFS), so the mixer can level it; re-measure on replacing it. */
  lufs: number;
  /** Licence or source, for the record. TODO(assets): fill in for each track. */
  licence: string;
}

export const SOUNDTRACKS: Soundtrack[] = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    mood: 'Warm piano',
    src: '/audio/soundtracks/golden-hour.mp3',
    lufs: -20.4,
    licence: 'TODO',
  },
  {
    id: 'slow-dance',
    name: 'Slow Dance',
    mood: 'Soft strings',
    src: '/audio/soundtracks/slow-dance.mp3',
    lufs: -20.4,
    licence: 'TODO',
  },
  {
    id: 'late-night-drive',
    name: 'Late Night Drive',
    mood: 'Mellow lo-fi',
    src: '/audio/soundtracks/late-night-drive.mp3',
    lufs: -20.4,
    licence: 'TODO',
  },
  {
    id: 'home-movies',
    name: 'Home Movies',
    mood: 'Acoustic guitar',
    src: '/audio/soundtracks/home-movies.mp3',
    lufs: -20.4,
    licence: 'TODO',
  },
];

/**
 * The Rewind's mixtape, under the same rules: fetched only after the recipient presses play.
 *
 * TODO(assets): replace the generated placeholder loops at these paths with licensed,
 * royalty-free MP3s (≈1–2 MB each, 128 kbps, 60–120 s) and record each licence here:
 *   - cassette-summer.mp3  sunny synth-pop
 *   - bedroom-tapes.mp3    lo-fi hip hop
 *   - arcade-crush.mp3     chiptune
 *   - slow-jam.mp3         late-night R&B keys
 */
export const MIXTAPE_TRACKS: Soundtrack[] = [
  {
    id: 'cassette-summer',
    name: 'Cassette Summer',
    mood: 'Sunny synth-pop',
    src: '/audio/soundtracks/cassette-summer.mp3',
    lufs: -22.9,
    licence: 'TODO',
  },
  {
    id: 'bedroom-tapes',
    name: 'Bedroom Tapes',
    mood: 'Lo-fi hip hop',
    src: '/audio/soundtracks/bedroom-tapes.mp3',
    lufs: -23.4,
    licence: 'TODO',
  },
  {
    id: 'arcade-crush',
    name: 'Arcade Crush',
    mood: 'Chiptune',
    src: '/audio/soundtracks/arcade-crush.mp3',
    lufs: -25.2,
    licence: 'TODO',
  },
  {
    id: 'slow-jam',
    name: 'Slow Jam',
    mood: 'Late-night R&B keys',
    src: '/audio/soundtracks/slow-jam.mp3',
    lufs: -22.7,
    licence: 'TODO',
  },
];

export const DEFAULT_SOUNDTRACK = `track:${SOUNDTRACKS[0].id}`;

/** Uploads ride inside the gift payload with the photos, so they stay small. */
export const SOUNDTRACK_UPLOAD_MAX_BYTES = 1_000_000;
/** Base64 data URL length for the largest allowed upload, plus its header. */
export const SOUNDTRACK_UPLOAD_MAX_CHARS = Math.ceil((SOUNDTRACK_UPLOAD_MAX_BYTES * 4) / 3) + 64;

/** Files in audio storage: larger uploads and voice notes, kept out of the gift JSON. */
export const STORED_AUDIO_MAX_BYTES = 10_000_000;
/** A voice note is a short message, not a podcast. */
export const VOICE_NOTE_MAX_SECONDS = 60;
export const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};
/** Only paths our upload route hands out can be referenced from a gift. */
export const STORED_AUDIO = /^storage:drafts\/[0-9a-f-]{36}\.(?:mp3|m4a|aac|webm|ogg|wav)$/;

const UPLOAD = /^data:audio\/(mpeg|mp3|mp4|x-m4a|aac|ogg|webm|wav|x-wav);base64,[A-Za-z0-9+/=]+$/;

/**
 * `track:<id>` for a bundled track, an uploaded audio data URL, a stored file (`storage:…`, where
 * allowed), or '' for no music.
 */
export function sanitizeSoundtrack(
  value: unknown,
  { tracks = SOUNDTRACKS, stored = false }: { tracks?: Soundtrack[]; stored?: boolean } = {},
): string {
  if (typeof value !== 'string' || !value) return '';
  if (value.startsWith('track:')) {
    return tracks.some((t) => `track:${t.id}` === value) ? value : '';
  }
  if (value.startsWith('storage:')) return stored && STORED_AUDIO.test(value) ? value : '';
  return value.length <= SOUNDTRACK_UPLOAD_MAX_CHARS && UPLOAD.test(value) ? value : '';
}

/** Playable URL for a bundled or inline soundtrack, or null (stored files need a signed URL). */
export function soundtrackSrc(
  value: string | undefined,
  tracks: Soundtrack[] = SOUNDTRACKS,
): string | null {
  if (!value) return null;
  if (value.startsWith('track:')) {
    return tracks.find((t) => `track:${t.id}` === value)?.src ?? null;
  }
  return value.startsWith('data:audio/') ? value : null;
}

/** Measured loudness of a bundled track, for the mixer; uploads are measured when they play. */
export function trackLoudness(src: string): number | undefined {
  return [...SOUNDTRACKS, ...MIXTAPE_TRACKS].find((track) => track.src === src)?.lufs;
}
