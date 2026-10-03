import { NextResponse } from 'next/server';
import {
  activateGiftPreview,
  createLemonCheckout,
  createPendingGift,
  getAppUrl,
  getLemonConfig,
  isPreviewCheckoutAllowed,
} from '@/lib/lemon';
import { isGiftStyle, pickXsoPayload } from '@/lib/xsoPayload';
import { managePath, viewPath } from '@/lib/giftLinks';
import { manageKey } from '@/lib/manageKey';
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

    const body = JSON.parse(raw) as { data?: XsoData };
    if (!body?.data || typeof body.data !== 'object') {
      return NextResponse.json({ error: 'Missing souvenir data' }, { status: 400 });
    }

    if (!isGiftStyle(body.data.giftStyle)) {
      return NextResponse.json({ error: 'Invalid giftStyle' }, { status: 400 });
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
        checkoutUrl: `${appUrl}${managePath(gift.id, manageKey(gift.id))}&preview=1`,
        giftUrl: `${appUrl}${viewPath(gift.id)}`,
      });
    }

    const { checkoutUrl } = await createLemonCheckout({
      giftId: gift.id,
      giftStyle: gift.data.giftStyle,
      customerName: gift.data.customerName,
      billerName: gift.data.billerName,
      appUrl,
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
