import { NextResponse } from 'next/server';
import { getGift, markGiftPaid } from '@/lib/giftStore';
import { getLemonConfig } from '@/lib/lemon';

export const runtime = 'nodejs';

/** Soft-confirm after Lemon redirect (webhook remains source of truth in production). */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const gift = await getGift(params.id);
  if (!gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
  }

  if (gift.status === 'paid') {
    return NextResponse.json({ id: gift.id, status: gift.status });
  }

  // In Lemon mode, redirect landing is a success signal; webhook may arrive later.
  const updated = await markGiftPaid(
    gift.id,
    getLemonConfig() ? 'lemon-redirect' : 'preview',
  );

  return NextResponse.json({
    id: updated?.id,
    status: updated?.status ?? 'paid',
  });
}
