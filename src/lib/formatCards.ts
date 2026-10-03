import { resolveLoop, resolveMovie, type FormatLayers } from '@/lib/formats';
import { resolveScrapbook } from '@/lib/scrapbook';
import {
  LOOP_CARDS,
  type GiftStyle,
  type LoopCard,
  type RewindCard,
  type ScrapbookElement,
  type XsoData,
} from '@/types/xso';

export type CardId = LoopCard | RewindCard | ScrapbookElement;

export interface CardMeta {
  id: CardId;
  label: string;
  detail: string;
}

const RECEIPT: CardMeta = {
  id: 'receipt',
  label: 'Receipt Card',
  detail: 'Store name, date and the itemized bill',
};
const AUDIT: CardMeta = {
  id: 'audit',
  label: 'Audit / Roast Card',
  detail: 'Scores, red flags, green flags and the stamp',
};
const PHOTOS: CardMeta = { id: 'photos', label: 'Photo Card', detail: 'A strip of your photos' };
const LETTER: CardMeta = {
  id: 'letter',
  label: 'Letter Card',
  detail: 'The closing letter and scratch-off',
};
const STACK = [RECEIPT, AUDIT, PHOTOS, LETTER];

/** Every card a format can deal, in the order they appear. */
export const FORMAT_CARDS: Record<GiftStyle, CardMeta[]> = {
  loop: STACK,
  rewind: [
    RECEIPT,
    AUDIT,
    PHOTOS,
    LETTER,
    { id: 'liner', label: 'Liner Notes Card', detail: 'Your tape review on a cassette insert' },
  ],
  scrapbook: [
    RECEIPT,
    {
      id: 'polaroids',
      label: 'Photo Card · Polaroids',
      detail: 'Your photos with a handwritten caption',
    },
    { id: 'sticky', label: 'Sticky Note', detail: 'A secret message they peel to read' },
    { id: 'letter', label: 'Letter Card', detail: 'A folded note with the unspoken words' },
    { id: 'ticket', label: 'Ticket Stub', detail: 'Where and when it all happened' },
  ],
  accordion: STACK,
  moviebox: [
    { ...RECEIPT, detail: 'Scene 1 · the receipt opens the reel' },
    { ...AUDIT, detail: 'Scene 2 · scores, flags and the star rating' },
    { ...PHOTOS, detail: 'Scene 3 · your photos, frame by frame' },
    { ...LETTER, detail: 'Scene 4 · the letter that rolls the credits' },
  ],
};

export const DEFAULT_CARDS: Record<GiftStyle, CardId[]> = {
  loop: [...LOOP_CARDS],
  rewind: ['receipt', 'audit', 'photos', 'letter', 'liner'],
  scrapbook: ['receipt', 'polaroids', 'sticky', 'letter'],
  accordion: [...LOOP_CARDS],
  moviebox: [...LOOP_CARDS],
};

/** Every format can be bought as a Single Card. */
export const MIN_CARDS: Record<GiftStyle, number> = {
  loop: 1,
  rewind: 1,
  scrapbook: 1,
  accordion: 1,
  moviebox: 1,
};

/** Keeps only this format's cards, in canonical order, with the minimum enforced. */
export function normalizeCards(style: GiftStyle, raw: readonly unknown[] | undefined): CardId[] {
  const cards = FORMAT_CARDS[style]
    .map((c) => c.id)
    .filter((id) => Array.isArray(raw) && raw.includes(id));
  return cards.length >= MIN_CARDS[style] ? cards : [...DEFAULT_CARDS[style]];
}

/** The cards this gift currently deals for `style`. */
export function selectedCards(data: XsoData, style: GiftStyle): CardId[] {
  switch (style) {
    case 'loop':
      return resolveLoop(data).cards;
    case 'scrapbook':
      return resolveScrapbook(data).elements.filter((e) => e !== 'voice');
    case 'rewind':
      return normalizeCards(style, data.rewind?.cards);
    case 'accordion':
      return normalizeCards(style, data.accordion?.cards);
    case 'moviebox':
      return normalizeCards(style, resolveMovie(data).cards);
  }
}

/** Patch that writes `cards` into the right per-format layer of a draft. */
export function cardsPatch(
  style: GiftStyle,
  cards: CardId[],
  base: Pick<FormatLayers, GiftStyle>,
): Partial<FormatLayers> {
  const next = normalizeCards(style, cards);
  switch (style) {
    case 'loop':
      return { loop: { cards: next as LoopCard[] } };
    case 'scrapbook': {
      const voice = base.scrapbook.elements.includes('voice') ? (['voice'] as const) : [];
      return {
        scrapbook: { ...base.scrapbook, elements: [...(next as ScrapbookElement[]), ...voice] },
      };
    }
    case 'rewind':
      return { rewind: { ...base.rewind, cards: next as RewindCard[] } };
    case 'accordion':
      return { accordion: { ...base.accordion, cards: next as LoopCard[] } };
    case 'moviebox':
      return { moviebox: { ...base.moviebox, cards: next as LoopCard[] } };
  }
}

/** Which of the four shared stack cards a format shows; used by the renderers. */
export function stackCards(data: XsoData, style: GiftStyle): LoopCard[] {
  return selectedCards(data, style).filter((id): id is LoopCard =>
    (LOOP_CARDS as readonly string[]).includes(id),
  );
}
