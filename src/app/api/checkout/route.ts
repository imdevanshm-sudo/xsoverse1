import { NextResponse } from 'next/server';
import {
  activateGiftPreview,
  createLemonCheckout,
  createPendingGift,
  getAppUrl,
  getLemonConfig,
} from '@/lib/lemon';
import { isGiftStyle, pickXsoPayload } from '@/lib/xsoPayload';
import type { XsoData } from '@/types/xso';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: XsoData };
    if (!body?.data || typeof body.data !== 'object') {
      return NextResponse.json({ error: 'Missing souvenir data' }, { status: 400 });
    }

    if (!isGiftStyle(body.data.giftStyle)) {
      return NextResponse.json({ error: 'Invalid giftStyle' }, { status: 400 });
    }

    const payload = pickXsoPayload(body.data);
    const gift = await createPendingGift(payload);
    const appUrl = getAppUrl(request.url);
    const lemon = getLemonConfig();

    if (!lemon) {
      await activateGiftPreview(gift.id);
      return NextResponse.json({
        mode: 'preview',
        giftId: gift.id,
        checkoutUrl: `${appUrl}/checkout/success?giftId=${encodeURIComponent(gift.id)}&preview=1`,
        giftUrl: `${appUrl}/gift/${gift.id}`,
      });
    }

    const { checkoutUrl } = await createLemonCheckout({
      giftId: gift.id,
      giftStyle: gift.data.giftStyle,
      customerName: gift.data.customerName,
      billerName: gift.data.billerName,
      appUrl,
    });

    return NextResponse.json({
      mode: 'lemon',
      giftId: gift.id,
      checkoutUrl,
      giftUrl: `${appUrl}/gift/${gift.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
