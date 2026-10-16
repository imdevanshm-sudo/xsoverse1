import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { decodeAddOns, getLemonConfig } from '@/lib/lemon';
import { markGiftPaid } from '@/lib/giftStore';
import { isEmail, mailConfigured, sendBuyerGiftReady } from '@/lib/mail';

export const runtime = 'nodejs';

interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: {
      gift_id?: string;
      giftId?: string;
      add_ons?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      identifier?: string;
      store_id?: number | string;
      user_email?: string;
      customer_email?: string;
      email?: string;
      user_name?: string;
    };
  };
}

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
function buyerEmail(payload: LemonWebhookPayload): string | null {
  const attrs = payload.data?.attributes;
  const candidates = [attrs?.user_email, attrs?.customer_email, attrs?.email];
  for (const value of candidates) {
    if (isEmail(value)) return value.trim();
  }
  return null;
}

export async function POST(request: Request) {
  const config = getLemonConfig();
  if (!config?.webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-signature'), config.webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = payload.meta?.event_name;
  if (eventName !== 'order_created') {
    return NextResponse.json({ received: true, ignored: eventName ?? 'unknown' });
  }

  const attributes = payload.data?.attributes;
  if (attributes?.store_id != null && String(attributes.store_id) !== String(config.storeId)) {
    return NextResponse.json({ received: true, ignored: 'other store' });
  }

  if (attributes?.status !== 'paid') {
    return NextResponse.json({ received: true, ignoredStatus: attributes?.status });
  }

  const giftId = payload.meta?.custom_data?.gift_id || payload.meta?.custom_data?.giftId;
  if (!giftId) {
    return NextResponse.json({ received: true, warning: 'Missing gift_id' });
  }

  const orderId = attributes.identifier || payload.data?.id || undefined;
  /** Set by our checkout route alongside the price that includes them, and signed by Lemon. */
  const addOns = decodeAddOns(payload.meta?.custom_data?.add_ons);
  const gift = await markGiftPaid(giftId, orderId, addOns);
  if (!gift) {
    return NextResponse.json({ received: true, warning: 'Gift not found' });
  }

  let emailed: 'sent' | 'skipped' | 'failed' = 'skipped';
  const to = buyerEmail(payload);
  if (to && mailConfigured()) {
    try {
      await sendBuyerGiftReady({
        to,
        giftId: gift.id,
        recipientName: gift.data.customerName,
        senderName: gift.data.billerName,
        requestUrl: request.url,
      });
      emailed = 'sent';
    } catch (error) {
      emailed = 'failed';
      console.error('[mail] buyer gift-ready failed', gift.id, String(error));
    }
  }

  return NextResponse.json({
    received: true,
    giftId: gift.id,
    status: gift.status,
    emailed,
  });
}
