/** Gift payloads are stored inline, so uploads are shrunk client-side. */
export const MAX_PHOTO_EDGE = 900;
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

/** Downscales to MAX_PHOTO_EDGE and re-encodes as JPEG (~100–200 KB). */
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

export async function readAudio(file: File): Promise<string> {
  if (!file.type.startsWith('audio/')) {
    throw new Error('Please choose an audio file');
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error('Voice notes must be under 1.5 MB (about a minute)');
  }
  return readAsDataUrl(file);
}
