'use client';

import { readAsDataUrl } from '@/lib/media';
import {
  AUDIO_TYPES,
  SOUNDTRACK_UPLOAD_MAX_BYTES,
  STORED_AUDIO_MAX_BYTES,
} from '@/lib/soundtracks';

/** `audio/webm;codecs=opus` → `audio/webm`, the form our type list and storage expect. */
export function baseAudioType(type: string): string {
  return type.split(';')[0].trim().toLowerCase();
}

/**
 * Sends a soundtrack or voice note to private storage through a one-time signed URL, returning the
 * `storage:…` reference to save with the gift. Without storage configured, small clips are inlined
 * as data URLs instead.
 */
export async function uploadAudio(file: Blob): Promise<string> {
  const type = baseAudioType(file.type);
  if (!AUDIO_TYPES[type]) throw new Error('Please choose an MP3, M4A, AAC, WAV or WebM file.');
  if (file.size > STORED_AUDIO_MAX_BYTES) {
    throw new Error(`Audio must be under ${STORED_AUDIO_MAX_BYTES / 1_000_000} MB.`);
  }
  const response = await fetch('/api/audio/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, size: file.size }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    ref?: string;
    inline?: boolean;
    error?: string;
  };
  if (body.inline) {
    if (file.size > SOUNDTRACK_UPLOAD_MAX_BYTES) {
      throw new Error(`Audio must be under ${SOUNDTRACK_UPLOAD_MAX_BYTES / 1_000_000} MB here.`);
    }
    return readAsDataUrl(new File([file], 'audio', { type }));
  }
  if (!response.ok || !body.url || !body.ref) throw new Error(body.error ?? 'Upload failed');
  const put = await fetch(body.url, {
    method: 'PUT',
    headers: { 'Content-Type': type, 'x-upsert': 'false' },
    body: file,
  });
  if (!put.ok) throw new Error('Upload failed. Check your connection and try again.');
  return body.ref;
}

/** A playable URL for a saved soundtrack value: direct for tracks and clips, signed for storage. */
export async function playableAudio(value: string, direct: string | null): Promise<string | null> {
  if (!value.startsWith('storage:')) return direct;
  const response = await fetch('/api/audio/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: value }),
  }).catch(() => null);
  const body = (await response?.json().catch(() => null)) as { url?: string | null } | null;
  return body?.url ?? null;
}
