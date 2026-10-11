import { NextResponse } from 'next/server';
import {
  SHORT_HOSTS,
  SONG_LIMITS,
  canonicalSpotifyUrl,
  isSpotifyShortLink,
  parseSpotify,
  sanitizeSong,
  type SongAttachment,
  type SpotifyType,
} from '@/lib/spotify';

export const runtime = 'nodejs';

const TIMEOUT_MS = 5000;
const MAX_HOPS = 4;
const INVALID = 'Paste a Spotify song, album, playlist or podcast link.';
/**
 * A bare agent gets Spotify's server-rendered page with the artist meta tags; a full desktop
 * Chrome string gets a client-rendered shell without them.
 */
const BROWSER_UA = 'Mozilla/5.0';

function fetchWithTimeout(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
}

/**
 * Follows a share link's redirects by hand, only ever requesting Spotify's own short-link hosts,
 * until it lands on an open.spotify.com item. Some share pages answer 200 with the target in the
 * body instead of a redirect.
 */
async function resolveShortLink(raw: string): Promise<string | null> {
  let current = raw.trim();
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (parseSpotify(current)) return current;
    const url = new URL(current);
    if (url.protocol !== 'https:' || !SHORT_HOSTS.includes(url.hostname)) return null;
    const response = await fetchWithTimeout(url.href, {
      redirect: 'manual',
      headers: { 'User-Agent': BROWSER_UA },
    });
    const location = response.headers.get('location');
    if (location) {
      current = new URL(location, url).href;
      continue;
    }
    if (!response.ok) return null;
    const body = (await response.text()).slice(0, 200_000);
    const match = /https:\/\/open\.spotify\.com\/[A-Za-z0-9/_-]+/.exec(body);
    return match && parseSpotify(match[0]) ? match[0] : null;
  }
  return null;
}

type OEmbed = { title?: unknown; thumbnail_url?: unknown };

/** The artist (or album artist) from the item's own page; oEmbed doesn't include it. */
async function fetchArtist(type: SpotifyType, url: string): Promise<string> {
  if (type !== 'track' && type !== 'album') return '';
  try {
    const response = await fetchWithTimeout(url, { headers: { 'User-Agent': BROWSER_UA } });
    if (!response.ok) return '';
    const html = (await response.text()).slice(0, 400_000);
    const musician = /<meta name="music:musician_description" content="([^"]*)"/.exec(html);
    if (musician) return decodeEntities(musician[1]);
    const description = /<meta property="og:description" content="([^"]*)"/.exec(html);
    return description ? decodeEntities(description[1].split(' · ')[0] ?? '') : '';
  } catch {
    return '';
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Validates a pasted Spotify link and returns the song card's details: canonical URL, type, id,
 * title, artist and cover. POST { url } → { song } or { error }.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const raw = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!raw || raw.length > SONG_LIMITS.input) {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  let link: string | null = raw;
  if (isSpotifyShortLink(raw)) {
    link = await resolveShortLink(raw).catch(() => null);
    if (!link) {
      return NextResponse.json(
        { error: 'That share link didn’t open a Spotify item. Paste the full link instead.' },
        { status: 400 },
      );
    }
  }
  const parsed = parseSpotify(link);
  if (!parsed) return NextResponse.json({ error: INVALID }, { status: 400 });

  const url = canonicalSpotifyUrl(parsed.type, parsed.id);
  const [oembed, artist] = await Promise.all([
    fetchWithTimeout(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? (response.json() as Promise<OEmbed>) : null))
      .catch(() => null),
    fetchArtist(parsed.type, url),
  ]);
  if (!oembed || typeof oembed.title !== 'string' || !oembed.title.trim()) {
    return NextResponse.json(
      { error: 'We couldn’t find that on Spotify. Check the link and try again.' },
      { status: 404 },
    );
  }

  const song = sanitizeSong({
    provider: 'spotify',
    type: parsed.type,
    id: parsed.id,
    title: oembed.title,
    artist,
    thumbnail: oembed.thumbnail_url,
    dedication: '',
  } satisfies Record<keyof Omit<SongAttachment, 'url'>, unknown>);
  return NextResponse.json({ song }, { headers: { 'Cache-Control': 'private, max-age=300' } });
}
