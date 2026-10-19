import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { TESTER_COOKIE, isTester, siteInTestMode } from '@/lib/testerAccess';
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
import { quote, sanitizeAddOns } from '@/lib/pricing';
import type { XsoData } from '@/types/xso';

export const runtime = 'nodejs';

/** Photos and voice notes are inline data URIs; stay under the 4.5 MB platform cap. */
const MAX_BODY_BYTES = 4_000_000;

export async function POST(request: Request) {
  try {
    if (siteInTestMode() && !(await isTester(cookies().get(TESTER_COOKIE)?.value))) {
      return NextResponse.json(
        { error: 'The store is being updated. Please check back shortly.' },
        { status: 503 },
      );
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Your photos and voice note are too large. Try a shorter voice note.' },
        { status: 413 },
      );
    }

    const body = JSON.parse(raw) as {
      data?: XsoData;
      overlay?: unknown;
      addOns?: unknown;
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

    const picked = pickXsoPayload(body.data);
    const addOns = sanitizeAddOns(body.addOns);
    const withSong = addOns.includes('spotify_song');
    if (withSong && !picked.song) {
      return NextResponse.json(
        { error: 'Our Song needs a valid Spotify link. Paste one, or untick the add-on.' },
        { status: 400 },
      );
    }
    const payload = withSong ? picked : { ...picked, song: undefined };
    const cards = selectedCards(payload, payload.giftStyle);
    const price = quote({
      style: payload.giftStyle,
      cardCount: cards.length,
      addOns,
    });
    const gift = await createPendingGift(payload, addOns, {
      amount: price.total,
      currency: price.currency,
    });
    const appUrl = getAppUrl(request.url);

    if (!lemon) {
      await activateGiftPreview(gift.id, addOns);
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
      quote: price,
      cardNames: FORMAT_CARDS[gift.data.giftStyle]
        .filter((c) => cards.includes(c.id))
        .map((c) => c.label),
      overlay: body.overlay === true,
    });

    /** Never return the dashboard link here: it would hand an unpaid buyer the manage key. */
    return NextResponse.json({ mode: 'lemon', checkoutUrl });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    /** Lemon's own messages help the buyer; storage and other internals stay in the log. */
    const shown = /Lemon Squeezy|Checkout is temporarily unavailable/.test(message)
      ? message
      : 'Checkout failed. Please try again in a minute.';
    console.error('[checkout]', message || error);
    return NextResponse.json({ error: shown }, { status: 500 });
  }
}
