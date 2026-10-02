import type { GiftStyle } from '@/types/xso';

/** Gift payloads are stored inline, so uploads are shrunk client-side. */
export const MAX_PHOTO_EDGE = 720;
export const MAX_AUDIO_BYTES = 1_500_000;

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unsupported image'));
    img.src = src;
  });
}

/** Downscales to MAX_PHOTO_EDGE and re-encodes as JPEG (~80–150 KB). */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Soft-light wash per format so uploads sit in that format's palette. */
const STYLE_TINT: Record<GiftStyle, string> = {
  loop: 'rgba(236, 72, 153, 0.16)',
  rewind: 'rgba(253, 186, 116, 0.22)',
  scrapbook: 'rgba(233, 217, 193, 0.24)',
  accordion: 'rgba(249, 168, 212, 0.18)',
  moviebox: 'rgba(245, 158, 11, 0.24)',
};

async function decode(
  file: File,
  maxEdge: number,
): Promise<CanvasImageSource & { width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      const probe = await createImageBitmap(file);
      const scale = Math.min(1, maxEdge / Math.max(probe.width, probe.height));
      if (scale === 1) return probe;
      const width = Math.max(1, Math.round(probe.width * scale));
      const height = Math.max(1, Math.round(probe.height * scale));
      probe.close();
      return await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      });
    } catch {
      // Fall through to <img> decoding (HEIC on some browsers, old Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Downscales off the main decode path, grades toward the chosen format's palette and
 * encodes as WebP (JPEG where the browser can't encode WebP). Typically 40–90 KB.
 */
export async function compressPhotoForStyle(file: File, style: GiftStyle): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }
  const source = await decode(file, MAX_PHOTO_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(source, 0, 0);
  if ('close' in source && typeof source.close === 'function') source.close();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = STYLE_TINT[style];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  const webp = canvas.toDataURL('image/webp', 0.8);
  const out = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82);
  canvas.width = 0;
  canvas.height = 0;
  return out;
}

export async function readAudio(file: File): Promise<string> {
  if (!file.type.startsWith('audio/')) {
    throw new Error('Please choose an audio file');
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error('Voice notes must be under 1.5 MB (about a minute)');
  }
  return readAsDataUrl(file);
}
