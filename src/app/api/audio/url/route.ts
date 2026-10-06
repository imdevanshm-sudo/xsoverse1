import { NextResponse } from 'next/server';
import { isAudioStorageConfigured, signAudio } from '@/lib/audioStorage';
import { ipThrottle } from '@/lib/ipThrottle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'no-store' };
const throttled = ipThrottle(120, 60 * 60_000);

/** A short-lived play URL so the sender can hear a draft upload in the editor preview. */
export async function POST(request: Request) {
  if (!isAudioStorageConfigured() || throttled(request)) {
    return NextResponse.json({ url: null }, { status: 429, headers: PRIVATE });
  }
  const body = (await request.json().catch(() => null)) as { ref?: unknown } | null;
  const url = typeof body?.ref === 'string' ? await signAudio(body.ref).catch(() => null) : null;
  return NextResponse.json({ url }, { status: url ? 200 : 404, headers: PRIVATE });
}
