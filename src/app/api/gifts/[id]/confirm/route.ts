import { NextResponse } from 'next/server';
import { getGift, markGiftPaid } from '@/lib/giftStore';
import { isPreviewCheckoutAllowed } from '@/lib/lemon';

export const runtime = 'nodejs';

/**
 * Activates free preview gifts in local development only. With Lemon Squeezy
 * configured, the signed webhook is the only thing that can mark a gift paid.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const gift = await getGift(params.id);
  if (!gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
  }

  if (gift.status === 'paid' || !isPreviewCheckoutAllowed()) {
    return NextResponse.json({ id: gift.id, status: gift.status });
  }

  const updated = await markGiftPaid(gift.id, 'preview');
  return NextResponse.json({
    id: updated?.id ?? gift.id,
    status: updated?.status ?? gift.status,
  });
}
