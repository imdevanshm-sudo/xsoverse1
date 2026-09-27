import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getLemonConfig } from '@/lib/lemon';
import { markGiftPaid } from '@/lib/giftStore';

export const runtime = 'nodejs';

interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: {
      gift_id?: string;
      giftId?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      identifier?: string;
      store_id?: number | string;
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

  const giftId =
    payload.meta?.custom_data?.gift_id || payload.meta?.custom_data?.giftId;
  if (!giftId) {
    return NextResponse.json({ received: true, warning: 'Missing gift_id' });
  }

  const orderId = attributes.identifier || payload.data?.id || undefined;
  const gift = await markGiftPaid(giftId, orderId);
  if (!gift) {
    return NextResponse.json({ received: true, warning: 'Gift not found' });
  }

  return NextResponse.json({ received: true, giftId: gift.id, status: gift.status });
}
