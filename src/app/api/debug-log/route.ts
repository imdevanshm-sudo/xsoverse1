import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.text()).slice(0, 3800);
  // #region agent log
  if (process.env.VERCEL) {
    await fetch('https://ntfy.sh/xso-dbg-51bbe9-k7q2v9', { method: 'POST', body }).catch(() => {});
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
