import { randomUUID } from 'crypto';
import { readFile, rm, symlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Browser, Page } from 'puppeteer-core';
import type { GiftStyle } from '@/types/xso';

/**
 * Records a received gift being opened and played through, in a headless browser on the server,
 * as a vertical MP4 for the recipient's story. Capture runs on virtual time (puppeteer-capture):
 * the page's clock only moves one frame at a time, so animations come out smooth however slow the
 * server renders. Silent: the gift's sounds and songs stay out.
 */

const VIEW_W = 360;
const VIEW_H = 640;
const OUT_W = 720;
const OUT_H = 1280;
const FPS = 30;
/** Longest playthrough, in the video's own time. */
const MAX_VIDEO_MS = 45_000;
/** Real-time cap, inside the route's 300s limit. */
const MAX_REAL_MS = 220_000;
/** Each card, fold or piece stays on screen this long. */
const DWELL_MS = 3000;

/** Overlays that help a person but clutter a recording; plus a small site credit. */
const RECORDING_CSS = `
  [data-chrome] { display: none !important; }
  #story-credit {
    position: fixed; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    z-index: 2147483647; padding: 5px 11px; border-radius: 999px;
    background: rgba(0, 0, 0, 0.45); color: rgba(255, 255, 255, 0.9);
    font: 700 11px/1 ui-monospace, monospace; letter-spacing: 0.12em; pointer-events: none;
  }
`;

/** puppeteer-capture only accepts a binary whose path names chrome-headless-shell. */
async function headlessShell(): Promise<string> {
  if (process.env.CHROME_HEADLESS_SHELL) return process.env.CHROME_HEADLESS_SHELL;
  const chromium = (await import('@sparticuz/chromium')).default;
  const binary = await chromium.executablePath();
  const link = join(tmpdir(), 'chrome-headless-shell');
  await symlink(binary, link).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });
  return link;
}

/** puppeteer-capture's own `launch` require()s the ESM-only puppeteer-core, so launch here instead. */
async function launch(): Promise<Browser> {
  const puppeteer = (await import('puppeteer-core')).default;
  const { PuppeteerCaptureViaHeadlessExperimental } =
    await import('puppeteer-capture/lib/PuppeteerCaptureViaHeadlessExperimental');
  const chromium = process.env.CHROME_HEADLESS_SHELL
    ? null
    : (await import('@sparticuz/chromium')).default;
  return puppeteer.launch({
    executablePath: await headlessShell(),
    headless: 'shell',
    args: [...(chromium?.args ?? []), ...PuppeteerCaptureViaHeadlessExperimental.REQUIRED_ARGS],
  });
}

async function ffmpegPath(): Promise<string> {
  const path = (await import('ffmpeg-static')).default as unknown as string | null;
  if (!path) throw new Error('ffmpeg unavailable');
  return path;
}

/** Taps the first visible, enabled element matching one of the selectors. */
async function tap(page: Page, selectors: string[]): Promise<boolean> {
  return page.evaluate((list) => {
    for (const selector of list) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height || (el as HTMLButtonElement).disabled) continue;
        el.click();
        return true;
      }
    }
    return false;
  }, selectors);
}

async function tapText(page: Page, pattern: string): Promise<boolean> {
  return page.evaluate((source) => {
    const match = new RegExp(source, 'i');
    const button = Array.from(document.querySelectorAll('button')).find((b) =>
      match.test(b.textContent ?? ''),
    );
    button?.click();
    return Boolean(button);
  }, pattern);
}

/** True once the gift's own last page (not the corner pill) is on top. */
function atEnd(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).some((a) => {
      if (a.textContent?.trim() !== 'Make one back' || a.closest('[data-chrome]')) return false;
      const box = a.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit === a || Boolean(hit && a.contains(hit));
    }),
  );
}

type Wait = (ms: number) => Promise<void>;

/** Plays the gift the way a first-time viewer would, one beat per card. */
async function playThrough(page: Page, style: GiftStyle, wait: Wait, more: () => boolean) {
  switch (style) {
    case 'moviebox': {
      await tap(page, ['[aria-label="Play"]']);
      while (more()) {
        await wait(1000);
        if (await page.evaluate(() => document.body.innerText.includes('Fin.'))) {
          return wait(2500);
        }
      }
      return;
    }
    case 'scrapbook': {
      for (let i = 0; i < 8 && more(); i++) {
        if (!(await tap(page, ['[role="button"][aria-label$="(not opened yet)"]']))) break;
        await wait(DWELL_MS);
        await page.keyboard.press('Escape');
        await wait(900);
      }
      return wait(1500);
    }
    case 'accordion': {
      for (let i = 0; i < 10 && more(); i++) {
        if (!(await tap(page, ['[aria-label="Next fold"]']))) break;
        await wait(DWELL_MS);
      }
      return;
    }
    default: {
      for (let i = 0; i < 10 && more(); i++) {
        await wait(DWELL_MS);
        if (await atEnd(page)) return wait(1500);
        await tap(page, ['[aria-label="Next card"]']);
      }
    }
  }
}

export async function recordGift(viewUrl: string, style: GiftStyle): Promise<Buffer> {
  const started = Date.now();
  const log = (stage: string) => console.log(`[story-video] ${stage} +${Date.now() - started}ms`);
  const out = join(tmpdir(), `story-${randomUUID()}.mp4`);
  const browser = await launch();
  log('launched');
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: VIEW_W,
      height: VIEW_H,
      deviceScaleFactor: OUT_W / VIEW_W,
      isMobile: true,
      hasTouch: true,
    });
    const { capture } = await import('puppeteer-capture/lib/capture');
    const recorder = await capture(page as never, {
      fps: FPS,
      size: `${OUT_W}x${OUT_H}`,
      ffmpeg: await ffmpegPath(),
      customFfmpegConfig: async (ffmpeg) => {
        ffmpeg.outputOptions(['-pix_fmt', 'yuv420p', '-crf', '23', '-movflags', '+faststart']);
      },
    });
    log('attached');
    const giftId = decodeURIComponent(new URL(viewUrl).pathname.split('/')[2] ?? '');
    // Skips the "Enter full screen" prompt, as if this tab had already answered it.
    await page.evaluateOnNewDocument((key) => {
      try {
        sessionStorage.setItem(key, '1');
      } catch {}
    }, `xso:immersive:${giftId}`);
    await page.goto(viewUrl, { waitUntil: 'load', timeout: 30_000 });
    log('loaded');
    await page.addStyleTag({ content: RECORDING_CSS });
    await page.evaluate(() => {
      const credit = document.createElement('div');
      credit.id = 'story-credit';
      credit.textContent = 'XSOVERSE.APP';
      document.body.appendChild(credit);
    });
    const wait: Wait = (ms) => recorder.waitForTimeout(ms);
    // Frames until the wrapped gift is on top (preloader gone) are dropped, so the video opens on it.
    await recorder.start(out, { dropCapturedFrames: true });
    log('warming up');
    let wrapped = false;
    for (let i = 0; i < 100 && !wrapped; i++) {
      await wait(100);
      wrapped = await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button')).find((b) =>
          /unwrap/i.test(b.textContent ?? ''),
        );
        if (!button) return false;
        const box = button.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return hit === button || Boolean(hit && button.contains(hit));
      });
    }
    if (!wrapped) throw new Error('Gift never became ready');
    recorder.dropCapturedFrames = false;
    const videoStart = recorder.captureTimestamp;
    log('capturing');
    const more = () =>
      recorder.captureTimestamp - videoStart < MAX_VIDEO_MS && Date.now() - started < MAX_REAL_MS;
    await wait(1200);
    if (!(await tapText(page, 'unwrap'))) throw new Error('Gift could not be opened');
    await wait(4000);
    log('unwrapped');
    await playThrough(page, style, wait, more);
    log(`played ${Math.round(recorder.captureTimestamp)}ms of video`);
    await recorder.stop();
    log('encoded');
    await recorder.detach();
    return await readFile(out);
  } finally {
    await browser.close().catch(() => {});
    await rm(out, { force: true }).catch(() => {});
  }
}
