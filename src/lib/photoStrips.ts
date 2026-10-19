import { isPlaceholderPhoto, svgPhoto, type XsoData } from '@/types/xso';

export const FRAMES_PER_STRIP = 4;
/** Photos ship inline in the checkout body (4 MB cap), so strips are capped too. */
export const MAX_STRIPS = 3;
export const MAX_PHOTOS = FRAMES_PER_STRIP * MAX_STRIPS;
/** A strip with one frame reads as a stray photo, not a photo booth. */
const MIN_FRAMES = 2;

export function stripCount(photos: string[]): number {
  return Math.min(MAX_STRIPS, Math.max(1, Math.ceil(photos.length / FRAMES_PER_STRIP)));
}

/** Splits photos into strips of four; the last strip keeps any empty frames. */
export function toStrips(photos: string[]): string[][] {
  return Array.from({ length: stripCount(photos) }, (_, s) =>
    photos.slice(s * FRAMES_PER_STRIP, (s + 1) * FRAMES_PER_STRIP),
  );
}

export function blankFrame(index: number): string {
  return svgPhoto(`FRAME ${index + 1}`, '#fce7f3', '#9a6b7b');
}

const BLANKS = new Set(Array.from({ length: MAX_PHOTOS }, (_, i) => blankFrame(i)));
/** The card wraps over a few lines; past this a receipt line is cut at a word. */
const CARD_CHARS = 36;
const CARD_COLORS: [string, string][] = [
  ['#ffe4f1', '#c1177a'],
  ['#e8ff4a', '#1a1814'],
  ['#071428', '#00f5ff'],
  ['#ff4db8', '#ffffff'],
];

/** A colored card written from the receipt, standing in for a photo. */
function loreCard(data: XsoData, index: number): string {
  const lore = (data.lineItems[index]?.description ?? data.occasion).toUpperCase();
  const [bg, fg] = CARD_COLORS[index % CARD_COLORS.length];
  /** The whole line where it fits, otherwise cut between words. */
  const words = lore.split(/\s+/);
  let line = words[0].slice(0, CARD_CHARS);
  for (const word of words.slice(1)) {
    if (line.length + word.length + 1 > CARD_CHARS) break;
    line += ` ${word}`;
  }
  return svgPhoto(line, bg, fg);
}

/**
 * What the photo booth prints: the sender's uploads only, never the editor's empty frames or the
 * theme's stand-in memories. Any frames left over get colored cards written from the gift's own
 * receipt, so a gift without photos still shows only things the sender wrote.
 */
export function stripPhotos(data: XsoData): string[] {
  const frames = data.photos
    .filter((src) => src && !BLANKS.has(src) && !isPlaceholderPhoto(src))
    .slice(0, MAX_PHOTOS);
  for (let i = frames.length; i < MIN_FRAMES; i += 1) frames.push(loreCard(data, i));
  return frames;
}

/** Handwriting under each photo: the two of them, then the receipt's lore, then the year. */
export function photoCaption(data: XsoData, index: number): string {
  const lore = data.lineItems[index - 1]?.description.toLowerCase();
  if (index === 0) return `${data.customerName} & ${data.billerName}`;
  if (lore) return `the ${lore} era`;
  return `'${data.timestamp.split(' ')[0].slice(-2)} ♡`;
}
