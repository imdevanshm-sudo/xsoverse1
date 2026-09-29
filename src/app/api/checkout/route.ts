import { NextResponse } from 'next/server';
import {
  activateGiftPreview,
  createLemonCheckout,
  createPendingGift,
  getAppUrl,
  getLemonConfig,
  isPreviewCheckoutAllowed,
} from '@/lib/lemon';
import { isDelivery, normalizeShipping, SHIPPING_LABELS, type ShippingAddress } from '@/lib/orders';
import { isGiftStyle, pickXsoPayload } from '@/lib/xsoPayload';
import type { XsoData } from '@/types/xso';

export const runtime = 'nodejs';

/** Photos and voice notes are inline data URIs; stay under the 4.5 MB platform cap. */
const MAX_BODY_BYTES = 4_000_000;

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Your photos and voice note are too large. Try a shorter voice note.' },
        { status: 413 },
      );
    }

    const body = JSON.parse(raw) as {
      data?: XsoData;
      delivery?: unknown;
      shipping?: unknown;
    };
    if (!body?.data || typeof body.data !== 'object') {
      return NextResponse.json({ error: 'Missing souvenir data' }, { status: 400 });
    }

    if (!isGiftStyle(body.data.giftStyle)) {
      return NextResponse.json({ error: 'Invalid giftStyle' }, { status: 400 });
    }

    const delivery = body.delivery === undefined ? 'digital' : body.delivery;
    if (!isDelivery(delivery)) {
      return NextResponse.json({ error: 'Invalid delivery option' }, { status: 400 });
    }

    let shipping: ShippingAddress | undefined;
    if (delivery === 'physical') {
      const result = normalizeShipping(body.shipping);
      if (!result.ok) {
        return NextResponse.json(
          { error: `${SHIPPING_LABELS[result.field]} is required for printed delivery`, field: result.field },
          { status: 400 },
        );
      }
      shipping = result.value;
    }

    const lemon = getLemonConfig();
    if (!lemon && !isPreviewCheckoutAllowed()) {
      return NextResponse.json(
        { error: 'Payments are not configured yet. Please try again later.' },
        { status: 503 },
      );
    }

    const payload = pickXsoPayload(body.data);
    const gift = await createPendingGift(payload);
    const appUrl = getAppUrl(request.url);

    if (!lemon) {
      await activateGiftPreview(gift.id);
      return NextResponse.json({
        mode: 'preview',
        giftId: gift.id,
        checkoutUrl: `${appUrl}/checkout/success?giftId=${encodeURIComponent(gift.id)}&preview=1&delivery=${delivery}`,
        giftUrl: `${appUrl}/gift/${gift.id}`,
      });
    }

    const { checkoutUrl } = await createLemonCheckout({
      giftId: gift.id,
      giftStyle: gift.data.giftStyle,
      customerName: gift.data.customerName,
      billerName: gift.data.billerName,
      appUrl,
      delivery,
      shipping,
    });

    return NextResponse.json({ mode: 'lemon', checkoutUrl });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
