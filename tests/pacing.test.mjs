/**
 * The shared reading-pace rules: how long words stay in front of the recipient.
 *
 *   npm test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const { READ_WPM, holdAfterLetterMs, readingMs, writingMs } = await import(
  path.join(process.cwd(), 'src/lib/pacing.ts')
);

describe('pacing', () => {
  test('reading time follows the words, at a comfortable pace', () => {
    assert.equal(readingMs(''), 0);
    const ten = 'one two three four five six seven eight nine ten';
    assert.equal(readingMs(ten), Math.round((10 * 60_000) / READ_WPM));
    assert.ok(readingMs(`${ten} ${ten}`) > readingMs(ten), 'more words, more time');
  });

  test('writing a letter out is bounded at both ends', () => {
    assert.equal(writingMs('hi'), 1800, 'a short line still gets a moment');
    assert.equal(writingMs(10_000), 16_000, 'a very long letter is not a slog');
    assert.equal(writingMs('x'.repeat(200)), writingMs(200), 'text or a length, same pace');
    assert.ok(writingMs(420) > 6500, 'a long letter is no longer squeezed into a few seconds');
  });

  test('a finished letter holds long enough to land, never forever', () => {
    assert.equal(holdAfterLetterMs(''), 4500);
    const long = 'word '.repeat(200);
    assert.equal(holdAfterLetterMs(long), 9000);
    const line = 'I kept every receipt because every one of them was you.';
    assert.ok(holdAfterLetterMs(line) >= 4500 && holdAfterLetterMs(line) <= 9000);
  });
});
