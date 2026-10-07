#!/usr/bin/env node
/**
 * Per-format sound checklist against /dev/sound-test?viewer=<format>, read through the manager's
 * debug hook (window.__xsoSound). Needs the dev server running (BASE_URL, default
 * http://localhost:3000) and a Playwright Chromium (`npx playwright install chromium`).
 *
 *   npm run sound:check            # all five formats
 *   npm run sound:check -- rewind  # one format
 *   PW_CHANNEL=chrome npm run sound:check   # use the installed Google Chrome instead
 *
 * Per format it checks: no sound on load, the Sound toggle is visible (and off) on the first
 * screen, Unwrap opts in, mute silences everything (effects, music, voice), no double triggers
 * and at most two overlapping voices, and everything stops on tab hide and on closing the viewer.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ALL = ['loop', 'rewind', 'scrapbook', 'accordion', 'moviebox'];
const formats = process.argv.slice(2).filter((arg) => ALL.includes(arg));

/** The format's own Play button, which starts music or a voice note after the unwrap. */
const PLAY = {
  rewind: (page) => page.getByRole('button', { name: /press play/i }),
  moviebox: (page) => page.getByRole('button', { name: 'Play', exact: true }),
};

const state = (page) => page.evaluate(() => window.__xsoSound.state());
const wait = (page, ms) => page.waitForTimeout(ms);

async function checkFormat(browser, format, voice) {
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/dev/sound-test?viewer=${format}${voice ? '&voice=1' : ''}`);
  await page.waitForFunction(() => window.__xsoSound);
  await page.waitForSelector('[data-recipient-preloader]', { state: 'detached' });
  await wait(page, 600);

  let s = await state(page);
  check(
    'no sound on load',
    !s.log.some((entry) => entry.event !== 'stop') && s.context === 'none' && !s.enabled,
    s.context,
  );

  const toggle = page.locator('button[aria-label="Sound"]:not([inert] *)');
  const box = await toggle.boundingBox();
  const onTop =
    box &&
    (await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label') === 'Sound',
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    ));
  check('toggle visible on first screen', onTop && box.y >= 0 && box.y + box.height <= 844);
  check('toggle starts off', (await toggle.getAttribute('aria-pressed')) === 'false');

  const skip = page.getByRole('button', { name: /^(skip & continue|continue)$/i });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await wait(page, 1200);
  s = await state(page);
  check('still silent before Unwrap', !s.log.some((entry) => entry.audible));

  await page.getByRole('button', { name: /unwrap|break seal/i }).click();
  await wait(page, 2500);
  s = await state(page);
  check(
    'unwrap opts in and plays',
    s.enabled && s.log.some((entry) => entry.event === 'unwrap.twine' && entry.audible),
  );

  const play = PLAY[format]?.(page);
  if (play) {
    await play.click();
    await wait(page, 1500);
    s = await state(page);
    check(`${voice ? 'voice' : 'music'} plays after Play`, s.media > 0, `media ${s.media}`);
  }

  await page.evaluate(() => window.__xsoSound.clear());
  await page.evaluate(() => {
    window.__xsoSound.play('photo.pop');
    window.__xsoSound.play('photo.pop');
  });
  s = await state(page);
  check(
    'no double trigger',
    s.log.filter((entry) => entry.event === 'photo.pop').length === 1,
    `${s.log.length} logged`,
  );
  await page.evaluate(async () => {
    for (let i = 0; i < 5; i += 1) {
      window.__xsoSound.play('loop.slide');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });
  s = await state(page);
  const ticks = s.perEvent['loop.slide'] ?? 0;
  check('rapid repeats capped at two voices', ticks <= 2, `voices ${ticks}`);

  await toggle.click();
  await wait(page, 400);
  await page.evaluate(() => window.__xsoSound.play('scratch.reveal'));
  s = await state(page);
  check(
    'mute silences everything',
    !s.enabled && s.master === 0 && s.log.at(-1)?.audible === false,
    `master ${s.master}`,
  );
  await toggle.click();
  await wait(page, 300);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await wait(page, 400);
  s = await state(page);
  check(
    'tab hide stops all',
    s.voices === 0 && s.media === 0,
    `voices ${s.voices} media ${s.media}`,
  );
  await page.evaluate(() => {
    delete document.hidden;
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await page.getByTestId('close-viewer').click();
  await wait(page, 400);
  s = await state(page);
  check(
    'closing the viewer stops all',
    s.voices === 0 && s.media === 0,
    `voices ${s.voices} media ${s.media}`,
  );

  await context.close();
  return results;
}

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || undefined,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
let failed = 0;
for (const format of formats.length ? formats : ALL) {
  for (const voice of format === 'rewind' ? [false, true] : [false]) {
    const results = await checkFormat(browser, format, voice);
    console.log(`\n${format}${voice ? ' (voice note)' : ''}`);
    for (const { name, ok, detail } of results) {
      if (!ok) failed += 1;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
