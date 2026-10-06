import { randomUUID } from 'crypto';
import type { XsoData } from '@/types/xso';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabaseServer';
import { AUDIO_TYPES, STORED_AUDIO, STORED_AUDIO_MAX_BYTES } from '@/lib/soundtracks';

/**
 * Soundtracks too big for the gift JSON: a private Supabase Storage bucket. Browsers upload
 * straight to it through a one-time signed URL, and recipients get a signed, expiring play URL
 * when they open the gift. Nothing in the bucket is public.
 *
 * TODO(storage): files are written under `drafts/` before checkout, so abandoned drafts pile up.
 * Add a scheduled job that deletes `drafts/` objects older than 7 days that no paid gift references.
 */
const BUCKET = process.env.SUPABASE_AUDIO_BUCKET || 'gift-audio';
/** Long enough to listen through a few times; short enough that a leaked link soon dies. */
const PLAY_URL_SECONDS = 6 * 60 * 60;

export function isAudioStorageConfigured(): boolean {
  return isSupabaseConfigured();
}

let bucketReady: Promise<void> | null = null;

/** Creates the private bucket on first use, with the size and type limits enforced by Supabase. */
function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const storage = getSupabaseServer().storage;
    const { data } = await storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: STORED_AUDIO_MAX_BYTES,
      allowedMimeTypes: Object.keys(AUDIO_TYPES),
    });
    if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

export type UploadCheck = { type: string; size: number };

/** Why an upload can't go ahead, or null if it can. */
export function uploadProblem({ type, size }: UploadCheck): string | null {
  if (!AUDIO_TYPES[type]) return 'That file type isn’t supported. Try MP3, M4A, AAC, WAV or WebM.';
  if (!Number.isFinite(size) || size <= 0) return 'That file looks empty.';
  if (size > STORED_AUDIO_MAX_BYTES) {
    return `Audio must be under ${STORED_AUDIO_MAX_BYTES / 1_000_000} MB.`;
  }
  return null;
}

/** A one-time signed upload URL for a new draft file, and the reference to store in the gift. */
export async function createAudioUpload({ type }: UploadCheck) {
  await ensureBucket();
  const path = `drafts/${randomUUID()}.${AUDIO_TYPES[type]}`;
  const { data, error } = await getSupabaseServer()
    .storage.from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? 'Could not create upload URL');
  return { url: data.signedUrl, ref: `storage:${path}` };
}

/** A signed play URL for a stored reference, or null if it isn't one of ours. */
export async function signAudio(ref: string): Promise<string | null> {
  if (!STORED_AUDIO.test(ref)) return null;
  const { data, error } = await getSupabaseServer()
    .storage.from(BUCKET)
    .createSignedUrl(ref.slice('storage:'.length), PLAY_URL_SECONDS);
  return error || !data ? null : data.signedUrl;
}

/** The gift as the recipient receives it: a stored soundtrack gets its signed play URL. */
export async function withPlayableAudio(data: XsoData): Promise<XsoData> {
  const ref = data.rewind?.soundtrack;
  if (!ref?.startsWith('storage:') || !isAudioStorageConfigured()) return data;
  const soundtrackUrl = await signAudio(ref).catch(() => null);
  return soundtrackUrl ? { ...data, rewind: { ...data.rewind!, soundtrackUrl } } : data;
}
