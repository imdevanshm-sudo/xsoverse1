import { NextResponse } from 'next/server';
import { getGift } from '@/lib/giftStore';
import { logRef } from '@/lib/giftLinks';
import { isManageKey } from '@/lib/manageKey';
import { isEmail, mailConfigured, sendReceiverGiftLink } from '@/lib/mail';

export const runtime = 'nodejs';

/** Simple per-gift cooldown so a stuck button can't spam the recipient. */
const lastSent = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!mailConfigured()) {
    return NextResponse.json(
      { error: 'Email is not configured yet. Copy the gift link instead.' },
      { status: 503 },
    );
  }

  let body: { key?: unknown; email?: unknown };
  try {
    body = (await request.json()) as { key?: unknown; email?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!isManageKey(params.id, typeof body.key === 'string' ? body.key : null)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const gift = await getGift(params.id);
  if (!gift || gift.status !== 'paid') {
    return NextResponse.json({ error: 'Gift is not ready yet' }, { status: 402 });
  }

  if (!isEmail(body.email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const prior = lastSent.get(gift.id) ?? 0;
  if (Date.now() - prior < COOLDOWN_MS) {
    return NextResponse.json(
      { error: 'Already sent. Wait a minute before sending again.' },
      { status: 429 },
    );
  }

  try {
    await sendReceiverGiftLink({
      to: email,
      giftId: gift.id,
      recipientName: gift.data.customerName,
      senderName: gift.data.billerName,
      requestUrl: request.url,
    });
    lastSent.set(gift.id, Date.now());
  } catch (error) {
    console.error('[mail] receiver gift failed', logRef(gift.id), String(error));
    return NextResponse.json(
      { error: 'We couldn’t send that email. Try again in a minute.' },
      { status: 502 },
    );
  }

  /** Do not echo the address back into logs/response beyond confirmation. */
  return NextResponse.json({ sent: true });
}
