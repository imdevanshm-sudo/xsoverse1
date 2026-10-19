import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { decodeAddOns, getLemonConfig } from '@/lib/lemon';
import { fulfillGiftPayment, getGift, type StoredGift } from '@/lib/giftStore';
import { verifyPaidOrder, type ExpectedPayment, type LemonOrderPayload } from '@/lib/lemonOrder';
import { isEmail, mailConfigured, sendBuyerGiftReady } from '@/lib/mail';
import { quote } from '@/lib/pricing';

export const runtime = 'nodejs';

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Lemon puts the buyer's address on the order; field names have varied slightly. */
function buyerEmail(payload: LemonOrderPayload): string | null {
  const attrs = payload.data?.attributes;
  const candidates = [attrs?.user_email, attrs?.customer_email, attrs?.email];
  for (const value of candidates) {
    if (isEmail(value)) return value.trim();
  }
  return null;
}

/** Gifts created before checkout recorded its charge are held to today's price for that order. */
function expectedPaymentOf(gift: StoredGift): ExpectedPayment {
  if (gift.expectedPayment) return gift.expectedPayment;
  const price = quote({ style: gift.data.giftStyle, addOns: gift.addOns?.requested ?? [] });
  return { amount: price.total, currency: price.currency };
}

/** Logs can carry the order's UUID but not the gift ID, which opens the gift. */
function giftRef(giftId: string) {
  return `${giftId.slice(0, 8)}…`;
}

export async function POST(request: Request) {
  const config = getLemonConfig();
  if (!config?.webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');
  /** Lemon signs test-mode events with the test-mode webhook's own secret. */
  const signed = [config.webhookSecret, config.testWebhookSecret].some(
    (secret) => secret && verifySignature(rawBody, signature, secret),
  );
  if (!signed) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: LemonOrderPayload;
  try {
    payload = JSON.parse(rawBody) as LemonOrderPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  if (eventName !== 'order_created') {
    return NextResponse.json({ received: true, ignored: eventName ?? 'unknown' });
  }

  const custom = payload.meta?.custom_data ?? {};
  const giftId = custom.gift_id || custom.giftId;
  const attributes = payload.data?.attributes;
  if (!giftId) {
    console.error('[webhook] order_created missing gift_id', {
      order: attributes?.identifier || payload.data?.id,
      customKeys: Object.keys(custom),
    });
    return NextResponse.json({ received: true, warning: 'Missing gift_id' });
  }

  const gift = await getGift(giftId);
  if (!gift) {
    console.error('[webhook] gift not found for order_created', giftRef(giftId));
    return NextResponse.json({ received: true, warning: 'Gift not found' });
  }

  const verdict = verifyPaidOrder(payload, {
    storeId: config.storeId,
    variantId: config.variantId,
    expected: expectedPaymentOf(gift),
    allowTestMode: process.env.NODE_ENV !== 'production',
    testEmails: config.testMode ? config.testEmails : [],
  });
  if (!verdict.ok) {
    console.error('[webhook] order not accepted', {
      reason: verdict.reason,
      order: verdict.orderId,
      gift: giftRef(gift.id),
    });
    return NextResponse.json({ received: true, ignored: verdict.reason });
  }

  /** Add-ons count only if the checkout priced them in and the signed order carries them. */
  const result = await fulfillGiftPayment(gift, verdict.orderId, decodeAddOns(custom.add_ons));
  if (result.outcome === 'not_found') {
    console.error('[webhook] gift vanished before fulfilment', giftRef(gift.id));
    return NextResponse.json({ received: true, warning: 'Gift not found' });
  }
  if (result.outcome === 'already_paid') {
    if (result.gift.lemonOrderId !== verdict.orderId) {
      console.error('[webhook] gift already paid by another order', {
        order: verdict.orderId,
        gift: giftRef(gift.id),
      });
    }
    return NextResponse.json({
      received: true,
      giftId: result.gift.id,
      status: result.gift.status,
      duplicate: true,
    });
  }

  const paid = result.gift;
  let emailed: 'sent' | 'skipped' | 'failed' = 'skipped';
  const to = buyerEmail(payload);
  if (!to) {
    console.error('[webhook] no buyer email on order', giftRef(paid.id), verdict.orderId);
  } else if (!mailConfigured()) {
    console.error('[webhook] RESEND_API_KEY missing; skipped buyer email', giftRef(paid.id));
  } else {
    try {
      const orderLabel =
        attributes?.order_number != null ? String(attributes.order_number) : verdict.orderId;
      await sendBuyerGiftReady({
        to,
        giftId: paid.id,
        recipientName: paid.data.customerName,
        senderName: paid.data.billerName,
        style: paid.data.giftStyle,
        addOns: paid.addOns?.paid ?? [],
        amountPaid: attributes?.total_formatted ?? null,
        orderNumber: orderLabel,
        dateIso: attributes?.created_at ?? paid.paidAt ?? null,
        requestUrl: request.url,
      });
      emailed = 'sent';
    } catch (error) {
      emailed = 'failed';
      console.error('[mail] buyer gift-ready failed', giftRef(paid.id), String(error));
    }
  }

  return NextResponse.json({
    received: true,
    giftId: paid.id,
    status: paid.status,
    emailed,
  });
}
