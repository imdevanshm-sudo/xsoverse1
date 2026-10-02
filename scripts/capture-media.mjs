#!/usr/bin/env node
/**
 * Captures the store's static style thumbnails and the silent hero reel from the live
 * preview pages. Needs the dev server running (BASE_URL, default http://localhost:3000)
 * and ffmpeg with libx264 + libvpx-vp9 on PATH.
 *
 *   npm run capture
 *
 * Outputs (committed):
 *   public/thumbs/{style}.webp   - stage screenshot, 640px wide
 *   public/reel/xso-reel.mp4     - ~3s muted loop, all five formats in motion
 *   public/reel/xso-reel.webm
 *   public/reel/poster.webp
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const THUMBS = path.join(ROOT, 'public/thumbs');
const REEL = path.join(ROOT, 'public/reel');

/** Keep in sync with REEL_SEGMENT / REEL_FADE in src/components/storefront/HeroReel.tsx. */
const SEGMENT = 0.72;
const FADE = 0.15;
const OUT_W = 480;
const OUT_H = 600;
const BG = '0x1a0f14';

const STYLES = [
  { id: 'loop', stage: '[aria-label="Memory deck"]', act: '[aria-label^="Loop memory"]' },
  { id: 'rewind', stage: '[aria-label="Rewind stack"]', act: '[aria-label^="Rewind — bring"]' },
  { id: 'scrapbook', stage: '[aria-label="Scrapbook desk"]', act: null },
  { id: 'accordion', stage: '[aria-label="Accordion letter"]', act: '[aria-label="Next fold"]' },
  { id: 'moviebox', stage: '[aria-label="8mm projector"]', act: '[aria-label="Next frame"]' },
];

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);

async function toWebp(page, pngPath, outPath, width, quality = 0.7) {
  const src = `data:image/png;base64,${readFileSync(pngPath).toString('base64')}`;
  const dataUrl = await page.evaluate(
    async ({ src, width, quality }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const scale = Math.min(1, width / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', quality);
    },
    { src, width, quality },
  );
  writeFileSync(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

async function captureStyle(browser, style, work) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });
  await page.goto(`${BASE}/preview?style=${style.id}`, { waitUntil: 'networkidle' });
  const stage = page.locator(style.stage).first();
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2600);

  const png = path.join(work, `${style.id}.png`);
  await stage.screenshot({ path: png });
  await toWebp(page, png, path.join(THUMBS, `${style.id}.webp`), 640);

  const box = await stage.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ data, ts: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  await page.waitForTimeout(120);
  if (style.act) await page.locator(style.act).first().click();
  else await stage.click({ position: { x: box.width * 0.5, y: box.height * 0.45 } });
  await page.waitForTimeout(SEGMENT * 1000 + 400);
  await cdp.send('Page.stopScreencast');
  await page.close();

  const dir = path.join(work, style.id);
  mkdirSync(dir, { recursive: true });
  const list = [];
  frames.forEach((frame, i) => {
    const file = path.join(dir, `${String(i).padStart(4, '0')}.jpg`);
    writeFileSync(file, Buffer.from(frame.data, 'base64'));
    const next = frames[i + 1]?.ts ?? frame.ts + 1 / 30;
    list.push(`file '${file}'`, `duration ${Math.max(0.001, next - frame.ts).toFixed(4)}`);
  });
  list.push(`file '${path.join(dir, `${String(frames.length - 1).padStart(4, '0')}.jpg`)}'`);
  const listFile = path.join(dir, 'frames.txt');
  writeFileSync(listFile, list.join('\n'));

  const k = (v) => (v / 390).toFixed(5);
  const segment = path.join(work, `${style.id}.mp4`);
  ffmpeg(
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listFile,
    '-vf',
    [
      `crop=iw*${k(box.width)}:iw*${k(box.height)}:iw*${k(box.x)}:iw*${k(box.y)}`,
      `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease`,
      `pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=${BG}`,
      'fps=30',
      'format=yuv420p',
    ].join(','),
    '-t',
    String(SEGMENT),
    '-c:v',
    'libx264',
    '-crf',
    '16',
    '-preset',
    'veryfast',
    segment,
  );
  return segment;
}

async function main() {
  mkdirSync(THUMBS, { recursive: true });
  mkdirSync(REEL, { recursive: true });
  const work = mkdtempSync(path.join(tmpdir(), 'xso-capture-'));
  const browser = await chromium.launch();
  try {
    const segments = [];
    for (const style of STYLES) {
      process.stdout.write(`capturing ${style.id}… `);
      segments.push(await captureStyle(browser, style, work));
      process.stdout.write('ok\n');
    }

    const inputs = segments.flatMap((s) => ['-i', s]);
    const fades = [];
    let last = '[0:v]';
    for (let i = 1; i < segments.length; i += 1) {
      const out = i === segments.length - 1 ? '[v]' : `[x${i}]`;
      const offset = (i * (SEGMENT - FADE)).toFixed(3);
      fades.push(`${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset}${out}`);
      last = out;
    }
    const joined = path.join(work, 'reel.mp4');
    ffmpeg(
      ...inputs,
      '-filter_complex',
      fades.join(';'),
      '-map',
      '[v]',
      '-c:v',
      'libx264',
      '-crf',
      '14',
      joined,
    );

    ffmpeg(
      '-i',
      joined,
      '-an',
      '-c:v',
      'libx264',
      '-profile:v',
      'main',
      '-crf',
      '28',
      '-preset',
      'slow',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      path.join(REEL, 'xso-reel.mp4'),
    );
    ffmpeg(
      '-i',
      joined,
      '-an',
      '-c:v',
      'libvpx-vp9',
      '-crf',
      '40',
      '-b:v',
      '0',
      '-row-mt',
      '1',
      path.join(REEL, 'xso-reel.webm'),
    );

    const posterPng = path.join(work, 'poster.png');
    ffmpeg('-ss', '0.3', '-i', joined, '-frames:v', '1', posterPng);
    const page = await browser.newPage();
    await toWebp(page, posterPng, path.join(REEL, 'poster.webp'), OUT_W, 0.72);
    await page.close();
    console.log('wrote public/thumbs/*.webp and public/reel/*');
  } finally {
    await browser.close();
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
