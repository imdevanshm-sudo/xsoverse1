import { NextResponse } from 'next/server';
import { redactGiftPath } from '@/lib/giftLinks';
import { ipThrottle } from '@/lib/ipThrottle';

export const runtime = 'nodejs';

const throttled = ipThrottle(30, 60 * 60_000);

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : '';

/** Crash reports from the error screens, written to the server log. No names or gift content. */
export async function POST(request: Request) {
  if (throttled(request)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  console.error(
    '[client-error]',
    JSON.stringify({
      message: redactGiftPath(clip(body.message, 300)),
      stack: redactGiftPath(clip(body.stack, 1200)),
      digest: clip(body.digest, 80),
      path: redactGiftPath(clip(body.path, 120).replace(/key=[^&]+/g, 'key=…')),
      ua: clip(request.headers.get('user-agent'), 200),
    }),
  );
  return NextResponse.json({ ok: true });
}
