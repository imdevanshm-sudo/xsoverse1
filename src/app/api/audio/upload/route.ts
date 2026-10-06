import { NextResponse } from 'next/server';
import { createAudioUpload, isAudioStorageConfigured, uploadProblem } from '@/lib/audioStorage';
import { ipThrottle } from '@/lib/ipThrottle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'no-store' };
const throttled = ipThrottle(20, 60 * 60_000);

/**
 * A one-time signed URL for uploading a soundtrack or voice note straight to private storage.
 * Without storage configured, answers `{inline: true}` so the client can embed small clips instead.
 */
export async function POST(request: Request) {
  if (!isAudioStorageConfigured()) return NextResponse.json({ inline: true }, { headers: PRIVATE });
  if (throttled(request)) {
    return NextResponse.json(
      { error: 'Too many uploads. Try again in a little while.' },
      { status: 429, headers: PRIVATE },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    type?: unknown;
    size?: unknown;
  } | null;
  const check = { type: String(body?.type ?? ''), size: Number(body?.size) };
  const problem = uploadProblem(check);
  if (problem) return NextResponse.json({ error: problem }, { status: 400, headers: PRIVATE });
  try {
    return NextResponse.json(await createAudioUpload(check), { headers: PRIVATE });
  } catch (error) {
    console.error('[audio/upload]', error);
    return NextResponse.json(
      { error: 'Uploads are unavailable right now.' },
      { status: 503, headers: PRIVATE },
    );
  }
}
