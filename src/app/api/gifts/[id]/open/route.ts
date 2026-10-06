import { NextResponse } from 'next/server';
import { withPlayableAudio } from '@/lib/audioStorage';
import { getGift } from '@/lib/giftStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

/**
 * The gift's contents, released only by the unwrap. POST so it can't be opened by pasting a URL,
 * prefetched, or cached by anything between the recipient and us.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const gift = await getGift(params.id);
  if (!gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404, headers: PRIVATE });
  }
  if (gift.status !== 'paid') {
    return NextResponse.json({ error: 'Gift is not ready yet' }, { status: 402, headers: PRIVATE });
  }
  const data = await withPlayableAudio(gift.data);
  return NextResponse.json({ data }, { headers: PRIVATE });
}
