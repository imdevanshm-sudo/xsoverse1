import { NextResponse } from 'next/server';
import { getGift } from '@/lib/giftStore';
import { logRef } from '@/lib/giftLinks';
import { isManageKey } from '@/lib/manageKey';
import { isEmail, mailConfigured, sendBuyerGiftReady } from '@/lib/mail';

export const runtime = 'nodejs';

/** The re-send goes to any address the dashboard types in, so one per gift per minute. */
const lastSent = new Map<string, number>();
const COOLDOWN_MS = 60_000;

/**
 * Reports a gift's payment status to its dashboard and, once paid, re-sends the buyer's links.
 *
 * It never marks a gift paid. The manage key is in Lemon's return URL, which anyone who opens a
 * checkout can read, so it proves access to the dashboard, not payment. Only the signed
 * `order_created` webhook, after checking the order, can move a gift to paid.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  let body: { key?: unknown; email?: unknown } = {};
  try {
    body = (await request.json()) as { key?: unknown; email?: unknown };
  } catch {
    /* empty body is fine */
  }

  if (!isManageKey(params.id, typeof body.key === 'string' ? body.key : null)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const gift = await getGift(params.id);
  if (!gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
  }

  if (gift.status !== 'paid') {
    return NextResponse.json({ id: gift.id, status: gift.status, emailed: 'skipped' });
  }

  let emailed: 'sent' | 'skipped' | 'failed' = 'skipped';
  if (isEmail(body.email) && mailConfigured()) {
    if (Date.now() - (lastSent.get(gift.id) ?? 0) < COOLDOWN_MS) {
      return NextResponse.json(
        { id: gift.id, status: gift.status, emailed: 'skipped', error: 'Already sent. Wait a minute before sending again.' },
        { status: 429 },
      );
    }
    lastSent.set(gift.id, Date.now());
    try {
      await sendBuyerGiftReady({
        to: body.email.trim(),
        giftId: gift.id,
        recipientName: gift.data.customerName,
        senderName: gift.data.billerName,
        style: gift.data.giftStyle,
        addOns: gift.addOns?.paid ?? [],
        amountPaid: null,
        orderNumber: gift.lemonOrderId ?? null,
        dateIso: gift.paidAt ?? null,
        requestUrl: request.url,
      });
      emailed = 'sent';
    } catch (error) {
      emailed = 'failed';
      lastSent.delete(gift.id);
      console.error('[mail] confirm-paid buyer email failed', logRef(gift.id), String(error));
    }
  }

  return NextResponse.json({ id: gift.id, status: gift.status, emailed });
}
