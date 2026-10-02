import {
  SCRAPBOOK_ELEMENTS,
  type ScrapbookElement,
  type ScrapbookLayers,
  type StickyColor,
  type XsoData,
} from '@/types/xso';

export const ELEMENT_META: Record<ScrapbookElement, { label: string; detail: string }> = {
  receipt: { label: 'Itemized Receipt', detail: 'Custom store name, date, line items & pricing' },
  polaroids: { label: 'Polaroid Photographs', detail: 'Upload photos + handwritten caption' },
  sticky: { label: 'Sticky Note · Secret Message', detail: 'Custom text revealed on tap / peel' },
  letter: { label: 'Folded Letter · Unspoken Words', detail: 'Full written note' },
  ticket: { label: 'Ticket Stub · Memory Coordinates', detail: 'Event title, location, timestamp' },
  voice: { label: 'Voice Note · Song Memory', detail: 'Audio upload or Spotify link' },
};

export const DEFAULT_ELEMENTS: ScrapbookElement[] = ['receipt', 'polaroids', 'sticky', 'letter'];

export const STICKY_COLORS: Record<StickyColor, { label: string; paper: string }> = {
  pink: { label: 'Warm Pink', paper: '#f8d5e1' },
  amber: { label: 'Amber', paper: '#f6cd85' },
  cream: { label: 'Cream', paper: '#f6e7cf' },
};

export const LIMITS = {
  polaroidCaption: 60,
  secretNote: 80,
  ticketTitle: 40,
  ticketPlace: 40,
  ticketWhen: 30,
  songUrl: 200,
} as const;

type Starter = Pick<
  XsoData,
  | 'customerName'
  | 'billerName'
  | 'occasion'
  | 'timestamp'
  | 'merchantName'
  | 'lineItems'
  | 'redFlags'
>;

/** Starter copy derived from a story pack, so every pack gets a ready-to-send desk. */
export function scrapbookDefaults(content: Starter): ScrapbookLayers {
  const first = content.lineItems[0]?.description.toLowerCase();
  return {
    elements: [...DEFAULT_ELEMENTS],
    polaroidCaption: first ? `the ${first} era.` : 'one I keep coming back to.',
    secretNote: `psst… ${content.redFlags[0]?.toLowerCase() ?? 'you know what you did'}`,
    stickyColor: 'cream',
    ticketTitle: content.occasion,
    ticketPlace: content.merchantName,
    ticketWhen: content.timestamp,
    songUrl: '',
  };
}

/** Gifts saved before modular scrapbooks show every artifact they used to. */
export function resolveScrapbook(data: XsoData): ScrapbookLayers {
  if (data.scrapbook) return data.scrapbook;
  const legacy = scrapbookDefaults(data);
  legacy.elements = ['receipt', 'polaroids', 'sticky', 'letter', 'ticket'];
  if (data.voiceNoteUrl) legacy.elements.push('voice');
  return legacy;
}

const SPOTIFY =
  /^(?:https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?|spotify:)(track|album|playlist|episode)[/:]([A-Za-z0-9]{22})(?:[/?#]|$)/;

/** Rebuilds a Spotify link from its id so arbitrary URLs never reach the gift page. */
export function spotifyLink(raw: string): string | null {
  const match = SPOTIFY.exec(raw.trim());
  return match ? `https://open.spotify.com/${match[1]}/${match[2]}` : null;
}

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : '';

/** Server-side guard for the public gift JSON. */
export function sanitizeScrapbook(raw: unknown, data: XsoData): ScrapbookLayers | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const input = raw as Partial<Record<keyof ScrapbookLayers, unknown>>;
  const songUrl = typeof input.songUrl === 'string' ? (spotifyLink(input.songUrl) ?? '') : '';
  const elements = SCRAPBOOK_ELEMENTS.filter(
    (id) =>
      Array.isArray(input.elements) &&
      input.elements.includes(id) &&
      (id !== 'voice' || Boolean(songUrl || data.voiceNoteUrl)),
  );
  const color = input.stickyColor;
  return {
    elements,
    polaroidCaption: clip(input.polaroidCaption, LIMITS.polaroidCaption),
    secretNote: clip(input.secretNote, LIMITS.secretNote),
    stickyColor: color === 'pink' || color === 'amber' ? color : 'cream',
    ticketTitle: clip(input.ticketTitle, LIMITS.ticketTitle),
    ticketPlace: clip(input.ticketPlace, LIMITS.ticketPlace),
    ticketWhen: clip(input.ticketWhen, LIMITS.ticketWhen),
    songUrl,
  };
}
