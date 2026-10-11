/**
 * "Our Song": one Spotify track, album, playlist or episode attached to a keepsake. Parsing is
 * strict so nothing but a canonical open.spotify.com URL is ever stored, linked or embedded.
 */

export const SPOTIFY_TYPES = ['track', 'album', 'playlist', 'episode'] as const;
export type SpotifyType = (typeof SPOTIFY_TYPES)[number];

export interface SongAttachment {
  provider: 'spotify';
  type: SpotifyType;
  /** Spotify's 22-character base62 id. */
  id: string;
  /** Canonical https://open.spotify.com/{type}/{id}, no query or locale prefix. */
  url: string;
  title: string;
  artist: string;
  thumbnail: string;
  dedication: string;
}

export const SONG_LIMITS = { input: 500, title: 120, artist: 120, dedication: 120 } as const;

const ID = /^[A-Za-z0-9]{22}$/;
const URI = /^spotify:(track|album|playlist|episode):([A-Za-z0-9]{22})$/;
const LOCALE = /^intl-[a-z]{2}(?:-[a-z]{2})?$/i;
export const SHORT_HOSTS = ['spotify.link', 'spotify.app.link'];
/** Where oEmbed thumbnails are served from; anything else is dropped. */
const THUMB_HOST = /^(?:i\.scdn\.co|mosaic\.scdn\.co|[a-z0-9-]+\.spotifycdn\.com)$/;

function isType(value: string): value is SpotifyType {
  return (SPOTIFY_TYPES as readonly string[]).includes(value);
}

export function canonicalSpotifyUrl(type: SpotifyType, id: string): string {
  return `https://open.spotify.com/${type}/${id}`;
}

export function spotifyEmbedUrl(song: Pick<SongAttachment, 'type' | 'id'>): string {
  return `https://open.spotify.com/embed/${song.type}/${song.id}`;
}

/**
 * `{type, id}` from an open.spotify.com link or a `spotify:type:id` URI, or null. Query strings,
 * fragments and `/intl-xx/` prefixes are ignored; any other host or scheme is rejected.
 */
export function parseSpotify(raw: string): { type: SpotifyType; id: string } | null {
  const input = raw.trim();
  if (!input || input.length > SONG_LIMITS.input) return null;
  const uri = URI.exec(input);
  if (uri) return { type: uri[1] as SpotifyType, id: uri[2] };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname !== 'open.spotify.com' || url.username || url.password || url.port) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] && LOCALE.test(parts[0])) parts.shift();
  if (parts[0] === 'embed') parts.shift();
  if (parts.length !== 2) return null;
  const [type, id] = parts;
  return isType(type) && ID.test(id) ? { type, id } : null;
}

/** A spotify.link / spotify.app.link share link, which only the server can resolve. */
export function isSpotifyShortLink(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' && SHORT_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function sanitizeThumbnail(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && THUMB_HOST.test(url.hostname) ? url.href : '';
  } catch {
    return '';
  }
}

/** A song attachment rebuilt from untrusted input, or undefined if its id or type is invalid. */
export function sanitizeSong(value: unknown): SongAttachment | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const song = value as Partial<SongAttachment>;
  if (song.provider !== 'spotify' || typeof song.type !== 'string' || !isType(song.type)) {
    return undefined;
  }
  if (typeof song.id !== 'string' || !ID.test(song.id)) return undefined;
  return {
    provider: 'spotify',
    type: song.type,
    id: song.id,
    url: canonicalSpotifyUrl(song.type, song.id),
    title: clip(song.title, SONG_LIMITS.title),
    artist: clip(song.artist, SONG_LIMITS.artist),
    thumbnail: sanitizeThumbnail(song.thumbnail),
    dedication: clip(song.dedication, SONG_LIMITS.dedication),
  };
}
