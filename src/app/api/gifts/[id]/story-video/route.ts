import { NextResponse } from 'next/server';
import { getGift } from '@/lib/giftStore';
import { viewPath } from '@/lib/giftLinks';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabaseServer';
import { recordGift } from '@/lib/storyRecorder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const BUCKET = 'story-videos';
const URL_SECONDS = 60 * 60;
/** Bump when the recording changes, so gifts are re-recorded instead of served stale. */
const RECORDING_VERSION = 4;

let bucketReady: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const storage = getSupabaseServer().storage;
    const { data } = await storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 50_000_000,
      allowedMimeTypes: ['video/mp4'],
    });
    if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

async function signed(path: string): Promise<string | null> {
  const { data, error } = await getSupabaseServer()
    .storage.from(BUCKET)
    .createSignedUrl(path, URL_SECONDS, { download: 'my-xso.mp4' });
  return error || !data ? null : data.signedUrl;
}

/**
 * The recipient's gift, recorded being opened and played through, for posting to a story.
 * Recorded once per gift (a gift never changes after payment) and kept in a private bucket.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const gift = await getGift(params.id);
  if (!gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404, headers: PRIVATE });
  }
  if (gift.status !== 'paid') {
    return NextResponse.json({ error: 'Gift is not ready yet' }, { status: 402, headers: PRIVATE });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503, headers: PRIVATE });
  }

  const path = `v${RECORDING_VERSION}/${gift.id}.mp4`;
  try {
    await ensureBucket();
    const cached = await signed(path);
    if (cached) return NextResponse.json({ url: cached }, { headers: PRIVATE });

    const origin = new URL(request.url).origin;
    const video = await recordGift(`${origin}${viewPath(gift.id)}`, gift.data.giftStyle);
    const { error } = await getSupabaseServer()
      .storage.from(BUCKET)
      .upload(path, video, { contentType: 'video/mp4', upsert: true });
    if (error) throw new Error(error.message);
    const url = await signed(path);
    if (!url) throw new Error('Could not sign the video');
    return NextResponse.json({ url }, { headers: PRIVATE });
  } catch (error) {
    console.error('[story-video]', gift.id, error);
    return NextResponse.json(
      { error: 'We couldn’t record your gift right now. Try again in a minute.' },
      { status: 500, headers: PRIVATE },
    );
  }
}
