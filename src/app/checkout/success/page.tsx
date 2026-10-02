'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShareGiftLink, giftPath } from '@/components/xso/ShareGiftLink';
import type { XsoData } from '@/types/xso';

const MAX_ATTEMPTS = 20;
const MAX_PAID_ATTEMPTS = 60;
const INTERVAL_MS = 900;

type Phase = 'confirming' | 'ready' | 'error';

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const giftId = searchParams.get('giftId');
  const preview = searchParams.get('preview') === '1';
  const [phase, setPhase] = useState<Phase>('confirming');
  const [message, setMessage] = useState('Pressing the wax seal…');
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string | undefined>();
  const [run, setRun] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setPhase('confirming');
    setMessage('Checking again…');
    setRun((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!giftId) {
      setPhase('error');
      setError('Missing gift id from checkout.');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const fail = (text: string) => {
      if (cancelled) return;
      setPhase('error');
      setError(text);
    };

    const poll = async () => {
      attempts += 1;
      try {
        if (preview && attempts === 1 && run === 0) {
          await fetch(`/api/gifts/${encodeURIComponent(giftId)}/confirm`, { method: 'POST' });
        }

        const response = await fetch(`/api/gifts/${encodeURIComponent(giftId)}`, {
          cache: 'no-store',
        });
        if (cancelled) return;

        if (response.ok) {
          const json = (await response.json()) as { data?: XsoData };
          if (cancelled) return;
          setRecipient(json.data?.customerName);
          setPhase('ready');
          return;
        }

        if (response.status === 404) {
          fail('We could not find this gift. Contact support with the gift ID below.');
          return;
        }

        if (response.status === 402 && attempts < (preview ? MAX_ATTEMPTS : MAX_PAID_ATTEMPTS)) {
          setMessage(
            preview
              ? 'Activating preview gift…'
              : 'Payment received. Letting the seal set…',
          );
          timer = window.setTimeout(poll, INTERVAL_MS);
          return;
        }

        fail(
          preview
            ? 'Preview gift could not be activated.'
            : 'Payment is still processing. Try again in a moment.',
        );
      } catch {
        if (attempts < MAX_ATTEMPTS) {
          timer = window.setTimeout(poll, INTERVAL_MS);
          return;
        }
        fail('Could not reach the server to confirm checkout.');
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [giftId, preview, run]);

  const title =
    phase === 'ready' ? 'Sealed. It’s theirs now.' : phase === 'error' ? 'Not quite yet.' : 'Pressing the seal…';

  return (
    <div className="paper-panel w-full max-w-md p-6 text-center sm:p-8">
      <p className="font-receipt text-[11px] uppercase tracking-[0.24em] text-[#9a6b7b]">
        XSO · Receipt of delivery
      </p>
      <h1 className="mt-2 font-serif text-[32px] font-semibold leading-tight text-[#2d1b22]">
        {title}
      </h1>

      {phase === 'ready' && giftId ? (
        <>
          <p className="mt-2 text-[15px] text-[#7a5563]">
            {recipient
              ? `This link is the only way in. Send it to ${recipient} when the moment feels right.`
              : 'This link is the only way in. Send it when the moment feels right.'}
          </p>
          <div className="mt-5">
            <ShareGiftLink giftId={giftId} recipientName={recipient} tone="paper" />
          </div>
          <Link
            href={giftPath(giftId)}
            className="matte-cta mt-4 flex min-h-[3.25rem] w-full items-center justify-center rounded-full px-6 font-serif text-[17px] font-semibold"
          >
            Open the keepsake
          </Link>
        </>
      ) : (
        <p className="mt-3 text-[15px] text-[#7a5563]" aria-live="polite">
          {error ?? message}
        </p>
      )}

      {phase === 'confirming' ? (
        <span
          aria-hidden
          className="mx-auto mt-5 block h-6 w-6 animate-spin rounded-full border-2 border-[#ec4899]/25 border-t-[#ec4899]"
        />
      ) : null}

      {phase === 'error' && giftId && (
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={retry}
            className="matte-cta min-h-12 w-full rounded-full font-serif text-[16px] font-semibold"
          >
            Try again
          </button>
          <Link href={giftPath(giftId)} className="paper-button flex items-center justify-center">
            Open gift anyway
          </Link>
        </div>
      )}

      {giftId && (
        <p className="mt-5 border-t border-dashed border-[#f0cfdc] pt-3 font-receipt text-[10px] uppercase tracking-[0.16em] text-[#b48799]">
          Gift · {giftId}
        </p>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="desk grid min-app-h place-items-center px-4 py-10">
      <Suspense
        fallback={<p className="font-receipt text-sm text-[#c99aae]">Pressing the seal…</p>}
      >
        <CheckoutSuccessInner />
      </Suspense>
    </main>
  );
}
