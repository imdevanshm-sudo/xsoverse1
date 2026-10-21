/**
 * How long words stay in front of the recipient. One small set of rules for every format, so a
 * letter, a caption and a receipt line are paced by what they say rather than by a constant
 * chosen once for one scene.
 */

/** Comfortable reading pace for short personal writing; slower than skimming. */
export const READ_WPM = 200;

/** Pen and typewriter reveals run a little ahead of reading, never far behind it. */
export const WRITE_MS_PER_CHAR = 32;

/** A breath after each sentence in a letter, and a longer one before the last line lands. */
export const SENTENCE_PAUSE_MS = 650;
export const FINAL_PAUSE_MS = 1600;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Time to read `text` once at a comfortable pace. */
export function readingMs(text: string): number {
  return Math.round((words(text) * 60_000) / READ_WPM);
}

/** Time to write `text` (or that many characters) out at the reveal pace, bounded so a long letter isn't a slog. */
export function writingMs(text: string | number, { min = 1800, max = 16_000 } = {}): number {
  const length = typeof text === 'number' ? text : text.length;
  return Math.min(max, Math.max(min, length * WRITE_MS_PER_CHAR));
}

/**
 * How long a finished letter stays before anything moves on: long enough to read its last line
 * and let it land, never so long it feels stuck. The reader can always move on sooner themselves.
 */
export function holdAfterLetterMs(lastLine: string): number {
  return Math.min(9000, Math.max(4500, 2500 + readingMs(lastLine)));
}
