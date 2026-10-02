import type { CardId } from '@/lib/formatCards';
import type { CraftTone, Relationship } from '@/lib/aiCraft';
import type { GiftStyle } from '@/types/xso';

/** Order-facing format ids; stored gifts, URLs and the database keep `GiftStyle`. */
export type OrderFormat = 'loop' | 'rewind' | 'scrapbook' | 'accordion' | 'movie_box';

export const ORDER_FORMATS: OrderFormat[] = [
  'loop',
  'rewind',
  'scrapbook',
  'accordion',
  'movie_box',
];

export interface OrderVibe {
  recipientName: string;
  relationship: Relationship | null;
  tone: CraftTone | null;
  /** The AI question they chose to answer. */
  question: string | null;
  answer: string;
}

export interface OrderMedia {
  /** Compressed, format-graded data URLs, 0–3. */
  photos: string[];
}

/** Everything the customizer collects before the story is generated and paid for. */
export interface XSOOrderConfig {
  format: OrderFormat;
  selectedCards: CardId[];
  vibe: OrderVibe;
  media: OrderMedia;
}

export function toGiftStyle(format: OrderFormat): GiftStyle {
  return format === 'movie_box' ? 'moviebox' : format;
}

export function fromGiftStyle(style: GiftStyle): OrderFormat {
  return style === 'moviebox' ? 'movie_box' : style;
}
