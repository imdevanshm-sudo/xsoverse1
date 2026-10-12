import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : '';

/** Crash reports from the error screens, written to the server log. No names or gift content. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  console.error(
    '[client-error]',
    JSON.stringify({
      message: clip(body.message, 300),
      stack: clip(body.stack, 1200),
      digest: clip(body.digest, 80),
      path: clip(body.path, 120).replace(/key=[^&]+/, 'key=…'),
      ua: clip(request.headers.get('user-agent'), 200),
    }),
  );
  return NextResponse.json({ ok: true });
}
