import {
  LOOP_CARDS,
  type AccordionLayers,
  type AuditMetrics,
  type GiftStyle,
  type LoopLayers,
  type MovieLayers,
  type MovieScene,
  type RewindLayers,
  type ScrapbookLayers,
  type XsoData,
} from '@/types/xso';
import { scrapbookDefaults } from '@/lib/scrapbook';
import { DEFAULT_SOUNDTRACK, MIXTAPE_TRACKS, sanitizeSoundtrack } from '@/lib/soundtracks';

export const AUDIT_KEYS = ['chaos', 'loyalty', 'snacking', 'advice', 'support'] as const;
export const AUDIT_LABEL_MAX = 20;

export function auditLabel(data: XsoData, key: keyof AuditMetrics, fallback: string = key) {
  return data.auditLabels?.[key]?.trim() || fallback;
}

export function sanitizeAuditLabels(value: unknown): XsoData['auditLabels'] {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const labels: NonNullable<XsoData['auditLabels']> = {};
  for (const key of AUDIT_KEYS) {
    const label = typeof raw[key] === 'string' ? (raw[key] as string).trim() : '';
    if (label) labels[key] = label.slice(0, AUDIT_LABEL_MAX);
  }
  return Object.keys(labels).length ? labels : undefined;
}

export function overallStars(metrics: AuditMetrics): number {
  const values = Object.values(metrics);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round((avg / 100) * 5 * 10) / 10;
}

export const LOOP_CARD_META = {
  receipt: { label: 'Receipt Card', detail: 'Title, timestamp & what it cost' },
  audit: { label: 'Audit / Roast Card', detail: 'Red flags, green flags & the stamp' },
  photos: { label: 'Photo Card', detail: 'Your photo strip' },
  letter: { label: 'Letter Card', detail: 'Closing letter & voice note' },
} as const;

/** The deck needs two cards to have something to loop to. */
export const MIN_LOOP_CARDS = 2;

export const FORMAT_LIMITS = {
  sideA: 30,
  sideB: 30,
  tapeDate: 20,
  review: 400,
  transcript: 600,
  sentiment: 80,
  sceneTitle: 40,
  sceneCaption: 140,
  /** A ~720px WebP still is ~100 KB; anything far larger isn't from our compressor. */
  sceneImageChars: 600_000,
} as const;

export const MOVIE_TITLES = ['Opening night', 'The audit', 'Our faces', 'The last line'];
const LEGACY_MOVIE_TITLES = ['Receipt', 'Audit', 'Photos', 'Letter'];

export const RATED = /Rated \d+(?:\.\d+)? out of 5/;

type Pack = Omit<XsoData, 'id' | 'giftStyle'>;

function firstSentence(text: string) {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

export function halfStar(value: number) {
  return Math.min(5, Math.max(0.5, Math.round(value * 2) / 2));
}

function movieDefaults(content: Pack, titles: string[], stars: number): MovieLayers {
  const captions = [
    `${content.merchantName.replace(/[.!?]+$/, '')}. I kept every receipt.`,
    `Rated ${stars} out of 5. I rounded down so you'd stay humble.`,
    'Some frames I replay more than others.',
    firstSentence(content.birthdayMessage),
  ];
  return {
    scenes: captions.map((caption, i) => ({ title: titles[i], caption, image: '' })),
    stars,
    soundtrack: DEFAULT_SOUNDTRACK,
  };
}

export interface FormatLayers {
  scrapbook: ScrapbookLayers;
  loop: LoopLayers;
  rewind: RewindLayers;
  accordion: AccordionLayers;
  moviebox: MovieLayers;
}

export type FormatKey = keyof FormatLayers;

/** Rich starter copy for every format, derived from a story pack. */
export function formatDefaults(content: Pack): FormatLayers {
  const flags = content.greenFlags.filter(Boolean);
  return {
    scrapbook: scrapbookDefaults(content),
    loop: { cards: [...LOOP_CARDS] },
    rewind: {
      sideA: content.occasion,
      sideB: 'The ones we replay',
      tapeDate: content.timestamp.split(' ')[0] ?? '',
      review: [`★★★★★ ${flags[0] ?? 'Shows up every time'}.`, flags[1] ? `${flags[1]}.` : '']
        .concat('Would rewind again.')
        .filter(Boolean)
        .join(' '),
    },
    accordion: { sentiment: `${content.total.toLowerCase()} — worth every cent ♡` },
    moviebox: movieDefaults(content, MOVIE_TITLES, halfStar(overallStars(content.auditMetrics))),
  };
}

/** Gifts saved before per-format settings keep rendering exactly as they did. */
export function resolveLoop(data: XsoData): LoopLayers {
  return data.loop ?? { cards: [...LOOP_CARDS] };
}

export function resolveMovie(data: XsoData): MovieLayers {
  return data.moviebox ?? movieDefaults(data, LEGACY_MOVIE_TITLES, overallStars(data.auditMetrics));
}

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : '';
const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const STILL = /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

/** Server-side guard: only the chosen format's settings reach the public gift JSON. */
export function sanitizeFormat(style: GiftStyle, data: XsoData): Partial<XsoData> {
  if (style === 'loop' && isObject(data.loop)) {
    const raw = Array.isArray(data.loop.cards) ? data.loop.cards : [];
    const cards = LOOP_CARDS.filter((card) => raw.includes(card));
    return { loop: { cards: cards.length >= MIN_LOOP_CARDS ? cards : [...LOOP_CARDS] } };
  }
  if (style === 'rewind' && isObject(data.rewind)) {
    const r = data.rewind as unknown as Record<string, unknown>;
    return {
      rewind: {
        sideA: clip(r.sideA, FORMAT_LIMITS.sideA),
        sideB: clip(r.sideB, FORMAT_LIMITS.sideB),
        tapeDate: clip(r.tapeDate, FORMAT_LIMITS.tapeDate),
        review: clip(r.review, FORMAT_LIMITS.review),
        ...stackCardsField(r.cards, REWIND_CARDS),
        ...rewindAudio(r),
      },
    };
  }
  if (style === 'accordion' && isObject(data.accordion)) {
    const a = data.accordion as unknown as Record<string, unknown>;
    return {
      accordion: {
        sentiment: clip(a.sentiment, FORMAT_LIMITS.sentiment),
        ...stackCardsField(a.cards, LOOP_CARDS),
      },
    };
  }
  if (style === 'moviebox' && isObject(data.moviebox)) {
    const m = data.moviebox as unknown as Record<string, unknown>;
    const raw = Array.isArray(m.scenes) ? m.scenes : [];
    const scenes: MovieScene[] = Array.from({ length: 4 }, (_, i) => {
      const s = isObject(raw[i]) ? raw[i] : {};
      const image = typeof s.image === 'string' ? s.image : '';
      return {
        title: clip(s.title, FORMAT_LIMITS.sceneTitle),
        caption: clip(s.caption, FORMAT_LIMITS.sceneCaption),
        image: image.length <= FORMAT_LIMITS.sceneImageChars && STILL.test(image) ? image : '',
      };
    });
    const stars = typeof m.stars === 'number' && Number.isFinite(m.stars) ? halfStar(m.stars) : 4;
    return {
      moviebox: {
        scenes,
        stars,
        soundtrack: sanitizeSoundtrack(m.soundtrack),
        ...stackCardsField(m.cards, LOOP_CARDS),
      },
    };
  }
  return {};
}

const REWIND_CARDS = [...LOOP_CARDS, 'liner'] as const;

/** The mixtape's sound: a bundled track or a file from our audio storage, never a raw URL. */
function rewindAudio(r: Record<string, unknown>): Partial<RewindLayers> {
  const soundtrack = sanitizeSoundtrack(r.soundtrack, { tracks: MIXTAPE_TRACKS, stored: true });
  if (!soundtrack) return {};
  const voice = r.voice === true && !soundtrack.startsWith('track:');
  const transcript = voice ? clip(r.transcript, FORMAT_LIMITS.transcript).trim() : '';
  return { soundtrack, ...(voice ? { voice } : {}), ...(transcript ? { transcript } : {}) };
}
/** Minimum cards for any stack format; mirrors `MIN_CARDS` in formatCards. */
const MIN_STACK_CARDS = 2;

/** Optional `cards` list: absent (show everything) unless a valid subset was sent. */
function stackCardsField<T extends string>(raw: unknown, allowed: readonly T[]): { cards?: T[] } {
  if (!Array.isArray(raw)) return {};
  const cards = allowed.filter((id) => raw.includes(id));
  return cards.length >= MIN_STACK_CARDS ? { cards } : {};
}
