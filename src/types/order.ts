import type { CardId } from '@/lib/formatCards';
import type { CraftTone, Relationship } from '@/lib/aiCraft';
import type { GiftStyle } from '@/types/xso';

/** Order-facing format ids; stored gifts, URLs and the database keep `GiftStyle`. */
export type OrderFormat = 'loop' | 'rewind' | 'scrapbook' | 'accordion' | 'movie_box';

/**
 * The formats offered for new gifts, in the order they're shown. Rewind and Scrapbook are held back
 * from the launch: gifts already made in them still open, edit and play, and adding them back here
 * offers them again.
 */
export const ORDER_FORMATS: OrderFormat[] = ['movie_box', 'loop', 'accordion'];

/** A new gift's format: the one asked for if it's offered, otherwise the first that is. */
export function offeredStyle(style: GiftStyle | null | undefined): GiftStyle {
  const offered = ORDER_FORMATS.map(toGiftStyle);
  return style && offered.includes(style) ? style : offered[0];
}

export interface OrderVibe {
  recipientName: string;
  /** Signs the letter; replaces the pack's placeholder sender. */
  senderName: string;
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
