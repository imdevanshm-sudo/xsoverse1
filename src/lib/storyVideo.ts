import { isPlaceholderPhoto, type XsoData } from '@/types/xso';

/**
 * A short vertical video of a received gift, for the recipient to post to a story. It shows the
 * photos and only the letter's opening line: the post is public, the sender's words mostly aren't.
 * Rendered in the browser (canvas + MediaRecorder), silent, so nothing leaves the device.
 */

const W = 720;
const H = 1280;
const FPS = 30;
const DURATION_MS = 11000;
const END_AT = 8400;
const SITE = 'xsoverse.app';

/** Instagram and Snapchat take MP4 most reliably, so it comes first wherever it's supported. */
const TYPES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export interface StoryInput {
  name: string;
  photos: string[];
  letterLine: string;
}

export function storyInput(data: XsoData): StoryInput {
  const [first = '', ...rest] = data.birthdayMessage.trim().split('\n');
  const greeting = rest.length > 0 && first.trim().endsWith(',') && first.length < 40;
  const letter = (greeting ? rest.join(' ') : data.birthdayMessage).replace(/\s+/g, ' ').trim();
  const sentence = (letter.match(/^.*?[.!?](\s|$)/)?.[0] ?? letter).trim();
  return {
    name: data.customerName.trim(),
    photos: data.photos.filter((src) => src && !isPlaceholderPhoto(src)).slice(0, 3),
    letterLine: sentence.length > 90 ? `${sentence.slice(0, 87).trimEnd()}…` : sentence,
  };
}

export function canRecordStory(): boolean {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return (
    typeof canvas.captureStream === 'function' &&
    TYPES.some((type) => MediaRecorder.isTypeSupported(type))
  );
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => 1 - (1 - clamp(n)) ** 3;
/** 0 → 1 over [start, start + length] ms, eased. */
const span = (t: number, start: number, length: number) => ease((t - start) / length);

function fontOf(variable: string, fallback: string) {
  const value = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** Only images that won't taint the canvas; anything else is left out rather than failing. */
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.src = src;
  try {
    await image.decode();
    const probe = document.createElement('canvas').getContext('2d');
    probe?.drawImage(image, 0, 0, 1, 1);
    probe?.getImageData(0, 0, 1, 1);
    return image;
  } catch {
    return null;
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface Fonts {
  serif: string;
  hand: string;
  mono: string;
}

function drawBackground(ctx: CanvasRenderingContext2D, t: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1b0f15');
  bg.addColorStop(1, '#2a1520');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const drift = Math.sin(t / 1800) * 40;
  const glow = ctx.createRadialGradient(W / 2 + drift, H * 0.42, 40, W / 2, H * 0.42, W * 0.9);
  glow.addColorStop(0, 'rgba(236, 72, 153, 0.28)');
  glow.addColorStop(1, 'rgba(236, 72, 153, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}

function drawTitle(ctx: CanvasRenderingContext2D, t: number, input: StoryInput, fonts: Fonts) {
  const a = span(t, 200, 700);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(0, (1 - a) * 24);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fdba74';
  ctx.font = `700 22px ${fonts.mono}`;
  ctx.fillText('S O M E O N E   M A D E   M E', W / 2, 150);
  ctx.fillStyle = '#fffaf0';
  ctx.font = `600 64px ${fonts.serif}`;
  ctx.fillText('a keepsake.', W / 2, 225);
  if (input.name) {
    ctx.fillStyle = '#f9a8d4';
    ctx.font = `52px ${fonts.hand}`;
    ctx.fillText(`for ${input.name}`, W / 2, 292);
  }
  ctx.restore();
}

const POLAROIDS = [
  { x: 250, y: 560, r: -7 },
  { x: 470, y: 590, r: 6 },
  { x: 360, y: 520, r: -1.5 },
];

function drawPhotos(
  ctx: CanvasRenderingContext2D,
  t: number,
  images: HTMLImageElement[],
  fonts: Fonts,
) {
  const size = 300;
  images.forEach((image, i) => {
    const a = span(t, 900 + i * 550, 700);
    if (a <= 0) return;
    const spot = POLAROIDS[images.length === 1 ? 2 : i];
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(spot.x, spot.y - (1 - a) * 160);
    ctx.rotate(((spot.r + (1 - a) * 10) * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#fbf7ef';
    ctx.fillRect(-size / 2 - 18, -size / 2 - 18, size + 36, size + 90);
    ctx.shadowColor = 'transparent';
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const sw = size / scale;
    const sh = size / scale;
    ctx.drawImage(
      image,
      (image.naturalWidth - sw) / 2,
      (image.naturalHeight - sh) / 2,
      sw,
      sh,
      -size / 2,
      -size / 2,
      size,
      size,
    );
    ctx.restore();
  });
  if (images.length === 0) {
    const a = span(t, 900, 800);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fffaf0';
    ctx.font = `120px ${fonts.serif}`;
    ctx.fillText('🎁', W / 2, 620 - (1 - a) * 40);
    ctx.restore();
  }
}

function drawLetter(ctx: CanvasRenderingContext2D, t: number, input: StoryInput, fonts: Fonts) {
  const a = span(t, 3600, 900);
  if (a <= 0 || !input.letterLine) return;
  const x = 70;
  const w = W - 140;
  const h = 360;
  const y = 820 + (1 - a) * 220;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(W / 2, y + h / 2);
  ctx.rotate((-1.2 * Math.PI) / 180);
  ctx.translate(-W / 2, -(y + h / 2));
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#fbf3e4';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = '#2d1b22';
  ctx.font = `40px ${fonts.hand}`;
  const lines = wrap(ctx, input.letterLine, w - 80).slice(0, 2);
  const typed = span(t, 4200, 1600);
  let budget = Math.round(lines.join(' ').length * typed);
  lines.forEach((line, i) => {
    const shown = line.slice(0, Math.max(0, budget));
    budget -= line.length + 1;
    ctx.fillText(shown, x + 40, y + 70 + i * 48);
  });

  ctx.fillStyle = 'rgba(45, 27, 34, 0.14)';
  const top = y + 70 + lines.length * 48;
  [0.86, 0.94, 0.62].forEach((frac, i) => {
    roundRect(ctx, x + 40, top + i * 36, (w - 80) * frac, 14, 7);
    ctx.fill();
  });
  ctx.fillStyle = '#b4234a';
  ctx.font = `30px ${fonts.hand}`;
  ctx.globalAlpha = a * span(t, 5600, 700);
  ctx.fillText('…the rest is just for me.', x + 40, y + h - 34);
  ctx.restore();
}

function drawEnd(ctx: CanvasRenderingContext2D, t: number, fonts: Fonts) {
  const a = span(t, END_AT, 900);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.92;
  ctx.fillStyle = '#120a10';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fffaf0';
  ctx.font = `600 120px ${fonts.serif}`;
  ctx.fillText('XSO', W / 2, H / 2 - 70);
  ctx.fillStyle = '#f9a8d4';
  ctx.font = `48px ${fonts.hand}`;
  ctx.fillText('Make one for someone you love.', W / 2, H / 2 + 10);
  const pillW = 360;
  const pillH = 76;
  const grad = ctx.createLinearGradient(W / 2 - pillW / 2, 0, W / 2 + pillW / 2, 0);
  grad.addColorStop(0, '#ec4899');
  grad.addColorStop(1, '#fb923c');
  ctx.fillStyle = grad;
  roundRect(ctx, W / 2 - pillW / 2, H / 2 + 70, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 32px ${fonts.mono}`;
  ctx.fillText(SITE, W / 2, H / 2 + 120);
  ctx.restore();
}

/** Records the story in real time (about 11s) and returns it as a shareable file. */
export async function renderStoryVideo(
  input: StoryInput,
  onProgress?: (fraction: number) => void,
): Promise<File> {
  const fonts: Fonts = {
    serif: fontOf('--font-fraunces', 'Georgia, serif'),
    hand: fontOf('--font-caveat', 'cursive'),
    mono: fontOf('--font-courier-prime', '"Courier New", monospace'),
  };
  await Promise.all(
    [`600 64px ${fonts.serif}`, `40px ${fonts.hand}`, `700 22px ${fonts.mono}`].map((font) =>
      document.fonts.load(font).catch(() => []),
    ),
  );
  const images = (await Promise.all(input.photos.map(loadImage))).filter(
    (image): image is HTMLImageElement => image !== null,
  );

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('Video recording unsupported');

  const draw = (t: number) => {
    drawBackground(ctx, t);
    drawTitle(ctx, t, input, fonts);
    drawPhotos(ctx, t, images, fonts);
    drawLetter(ctx, t, input, fonts);
    drawEnd(ctx, t, fonts);
  };
  draw(0);

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('Recording failed'));
  });

  recorder.start(500);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - start;
      draw(Math.min(t, DURATION_MS));
      onProgress?.(clamp(t / DURATION_MS));
      if (t >= DURATION_MS) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  const type = mimeType.split(';')[0];
  const ext = type === 'video/mp4' ? 'mp4' : 'webm';
  return new File(chunks, `my-xso.${ext}`, { type });
}
