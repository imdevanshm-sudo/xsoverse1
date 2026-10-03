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
import { FORMAT_CARDS, selectedCards } from '@/lib/formatCards';
import { isAddOnId, isPriceArm, quote } from '@/lib/pricing';
import type { XsoData } from '@/types/xso';

export const runtime = 'nodejs';

/** Photos and voice notes are inline data URIs; stay under the 4.5 MB platform cap. */
const MAX_BODY_BYTES = 4_000_000;

/** Scheduled delivery must be in the future and within a year. */
function scheduledTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time) || time <= Date.now() || time > Date.now() + 366 * 86_400_000) {
    return null;
  }
  return new Date(time).toISOString();
}

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
      addOns?: unknown;
      arm?: unknown;
      deliverAt?: unknown;
      overlay?: unknown;
    };
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
    const cards = selectedCards(gift.data, gift.data.giftStyle);
    const price = quote({
      style: gift.data.giftStyle,
      cardCount: cards.length,
      addOns: Array.isArray(body.addOns) ? body.addOns.filter(isAddOnId) : [],
      arm: isPriceArm(body.arm) ? body.arm : null,
    });
    const deliverAt = price.addOns.some((a) => a.id === 'schedule')
      ? scheduledTime(body.deliverAt)
      : null;
    if (price.addOns.some((a) => a.id === 'schedule') && !deliverAt) {
      return NextResponse.json({ error: 'Pick a delivery time in the future.' }, { status: 400 });
    }

    if (!lemon) {
      await activateGiftPreview(gift.id);
      return NextResponse.json({
        mode: 'preview',
        giftId: gift.id,
        checkoutUrl: `${appUrl}${managePath(gift.id, manageKey(gift.id))}&preview=1`,
        giftUrl: `${appUrl}${viewPath(gift.id)}`,
      });
    }

    const { checkoutUrl, redirectUrl } = await createLemonCheckout({
      giftId: gift.id,
      giftStyle: gift.data.giftStyle,
      customerName: gift.data.customerName,
      billerName: gift.data.billerName,
      appUrl,
      quote: price,
      cardNames: FORMAT_CARDS[gift.data.giftStyle]
        .filter((c) => cards.includes(c.id))
        .map((c) => c.label),
      deliverAt,
      overlay: body.overlay === true,
    });

    return NextResponse.json({ mode: 'lemon', checkoutUrl, redirectUrl });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
