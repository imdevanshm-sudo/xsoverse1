import { NextResponse } from 'next/server';
import { getGift } from '@/lib/giftStore';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const gift = await getGift(params.id);
  if (!gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
  }

  if (gift.status !== 'paid') {
    return NextResponse.json(
      { error: 'Gift is not ready yet', status: gift.status },
      { status: 402 },
    );
  }

  /** Status only: the contents are released by POST /open, after the unwrap. */
  return NextResponse.json({ id: gift.id, status: gift.status });
}
