/**
 * Photo-card captions: what the sender writes under each photo, as it's saved with the gift.
 *
 *   npm test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const { PHOTO_CAPTION_MAX, sanitizePhotoCaptions } = await import(
  path.join(process.cwd(), 'src/lib/xsoPayload.ts')
);

describe('photo captions', () => {
  test('gifts without captions keep none', () => {
    assert.equal(sanitizePhotoCaptions(undefined, 3), undefined);
    assert.equal(sanitizePhotoCaptions(['', '  '], 2), undefined);
    assert.equal(sanitizePhotoCaptions('not a list', 2), undefined);
  });

  test('one caption per photo at most, trimmed, on one line, and capped', () => {
    const long = 'x'.repeat(PHOTO_CAPTION_MAX + 40);
    assert.deepEqual(sanitizePhotoCaptions(['  the train \n home ', 7, long, 'extra'], 3), [
      'the train home',
      '',
      long.slice(0, PHOTO_CAPTION_MAX),
    ]);
  });
});
