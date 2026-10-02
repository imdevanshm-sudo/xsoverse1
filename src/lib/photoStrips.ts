import { svgPhoto } from '@/types/xso';

export const FRAMES_PER_STRIP = 4;
/** Photos ship inline in the checkout body (4 MB cap), so strips are capped too. */
export const MAX_STRIPS = 3;
export const MAX_PHOTOS = FRAMES_PER_STRIP * MAX_STRIPS;

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
