import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.text()).slice(0, 8000);
  // #region agent log
  if (process.env.VERCEL) {
    console.log('[dbg51bbe9]', body);
  } else {
    await fetch('http://127.0.0.1:7349/ingest/11996936-c9fc-4f4f-9c8c-877e24d739e0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '51bbe9' },
      body,
    }).catch(() => {});
  }
  // #endregion
  return NextResponse.json({ ok: true });
}
