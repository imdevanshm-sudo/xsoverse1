import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Browser, CDPSession, Page } from 'puppeteer-core';
import type { GiftStyle } from '@/types/xso';

/**
 * Records a received gift being opened and played through, in a headless browser on the server,
 * as a vertical MP4 for the recipient's story. Silent: the gift's sounds and songs stay out.
 */

const VIEW_W = 360;
const VIEW_H = 640;
const OUT_W = 720;
const OUT_H = 1280;
const MAX_RECORD_MS = 50_000;
/** Each card, fold or piece stays on screen this long. */
const DWELL_MS = 3200;

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

async function launch(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core');
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    });
  }
  return puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

/** Plays the gift the way a first-time viewer would, one beat per card. */
async function playThrough(page: Page, style: GiftStyle, deadline: number) {
  const more = () => Date.now() < deadline;
  switch (style) {
    case 'moviebox': {
      await tap(page, ['[aria-label="Play"]']);
      while (more()) {
        await wait(1000);
        const done = await page.evaluate(() => document.body.innerText.includes('Fin.'));
        if (done) return void (await wait(2500));
      }
      return;
    }
    case 'scrapbook': {
      for (let i = 0; i < 8 && more(); i++) {
        const opened = await tap(page, ['[role="button"][aria-label$="(not opened yet)"]']);
        if (!opened) break;
        await wait(DWELL_MS);
        await page.keyboard.press('Escape');
        await wait(900);
      }
      return void (await wait(1500));
    }
    case 'accordion': {
      for (let i = 0; i < 10 && more(); i++) {
        if (!(await tap(page, ['[aria-label="Next fold"]']))) break;
        await wait(DWELL_MS);
      }
      return;
    }
    default: {
      for (let i = 0; i < 8 && more(); i++) {
        await wait(DWELL_MS);
        const atEnd = await page.evaluate(() =>
          Array.from(document.querySelectorAll('a')).some((a) => {
            if (a.textContent?.trim() !== 'Make one back' || a.closest('[data-chrome]')) {
              return false;
            }
            const box = a.getBoundingClientRect();
            const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return hit === a || a.contains(hit);
          }),
        );
        if (atEnd) return void (await wait(1500));
        if (!(await tap(page, ['[aria-label="Next card"]']))) break;
      }
    }
  }
}

type Frame = { data: Buffer; at: number };

async function capture(client: CDPSession, frames: Frame[]) {
  client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ data: Buffer.from(data, 'base64'), at: metadata.timestamp ?? Date.now() / 1000 });
    void client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 82,
    maxWidth: OUT_W,
    maxHeight: OUT_H,
  });
}

async function ffmpegPath(): Promise<string> {
  const path = (await import('ffmpeg-static')).default as unknown as string | null;
  if (!path) throw new Error('ffmpeg unavailable');
  return path;
}

/** Variable-rate screencast frames → constant 30fps H.264, padded to 9:16. */
async function encode(frames: Frame[]): Promise<Buffer> {
  if (frames.length < 10) throw new Error('Too few frames captured');
  const dir = await mkdtemp(join(tmpdir(), 'story-'));
  try {
    const list: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const file = join(dir, `${String(i).padStart(5, '0')}.jpg`);
      await writeFile(file, frames[i].data);
      const next = frames[i + 1]?.at ?? frames[i].at + 1.5;
      // The screencast only sends a frame when something changes, so still moments are long gaps.
      const duration = Math.min(10, Math.max(1 / 60, next - frames[i].at));
      list.push(`file '${file}'`, `duration ${duration.toFixed(4)}`);
    }
    list.push(`file '${join(dir, `${String(frames.length - 1).padStart(5, '0')}.jpg`)}'`);
    await writeFile(join(dir, 'list.txt'), list.join('\n'));
    const out = join(dir, 'story.mp4');
    const args = [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      join(dir, 'list.txt'),
      '-vf',
      `fps=30,scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '24',
      '-movflags',
      '+faststart',
      out,
    ];
    const bin = await ffmpegPath();
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let log = '';
      proc.stderr.on('data', (chunk) => (log = (log + chunk).slice(-2000)));
      proc.on('error', reject);
      proc.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${log}`)),
      );
    });
    const { readFile } = await import('fs/promises');
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function recordGift(viewUrl: string, style: GiftStyle): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: VIEW_W,
      height: VIEW_H,
      deviceScaleFactor: OUT_W / VIEW_W,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(viewUrl, { waitUntil: 'networkidle2', timeout: 30_000 });
    await page.addStyleTag({ content: RECORDING_CSS });
    await page.evaluate(() => {
      const credit = document.createElement('div');
      credit.id = 'story-credit';
      credit.textContent = 'XSOVERSE.APP';
      document.body.appendChild(credit);
    });
    await page.evaluate(() => {
      const skip = Array.from(document.querySelectorAll('button')).find((b) =>
        /skip/i.test(b.textContent ?? ''),
      );
      skip?.click();
    });
    await wait(600);

    const client = await page.createCDPSession();
    const frames: Frame[] = [];
    await capture(client, frames);
    await wait(800);
    const unwrapped = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find((b) =>
        /unwrap/i.test(b.textContent ?? ''),
      );
      button?.click();
      return Boolean(button);
    });
    if (!unwrapped) throw new Error('Gift could not be opened');
    await wait(4200);
    await playThrough(page, style, Date.now() + MAX_RECORD_MS);
    await client.send('Page.stopScreencast').catch(() => {});
    return await encode(frames);
  } finally {
    await browser.close().catch(() => {});
  }
}
