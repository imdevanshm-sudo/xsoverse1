'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShareGiftLink, giftPath } from '@/components/xso/ShareGiftLink';
import type { XsoData } from '@/types/xso';

const MAX_ATTEMPTS = 20;
const INTERVAL_MS = 900;

type Phase = 'confirming' | 'ready' | 'error';

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const giftId = searchParams.get('giftId');
  const preview = searchParams.get('preview') === '1';
  const [phase, setPhase] = useState<Phase>('confirming');
  const [message, setMessage] = useState('Confirming your XSO…');
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
        if (attempts === 1 && run === 0) {
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

        if (response.status === 402 && attempts < MAX_ATTEMPTS) {
          setMessage(
            preview
              ? 'Activating preview gift…'
              : 'Payment received. Generating your shareable link…',
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
    phase === 'ready' ? 'Gift Ready' : phase === 'error' ? 'Hold Up' : 'Almost There';

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 text-center shadow-xl">
      <p className="font-pixel text-[9px] uppercase tracking-[0.24em] text-phosphor/70">
        XSO Checkout
      </p>
      <h1 className="mt-3 font-arcade text-xl uppercase tracking-[0.12em] text-console-mist">
        {title}
      </h1>

      {phase === 'ready' && giftId ? (
        <>
          <p className="mt-3 font-mono text-sm text-white/60">
            {recipient
              ? `Send this link to ${recipient}. It opens their one-of-one gift.`
              : 'Send this link to open the one-of-one gift.'}
          </p>
          <div className="mt-5">
            <ShareGiftLink giftId={giftId} recipientName={recipient} />
          </div>
          <Link
            href={giftPath(giftId)}
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-phosphor px-6 py-3 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#0a120e] shadow-[0_8px_24px_rgba(157,255,176,0.25)]"
          >
            Open gift
          </Link>
        </>
      ) : (
        <p className="mt-3 font-mono text-sm text-white/60" aria-live="polite">
          {error ?? message}
        </p>
      )}

      {phase === 'error' && giftId && (
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={retry}
            className="min-h-11 w-full touch-manipulation rounded-full bg-phosphor px-6 py-3 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#0a120e]"
          >
            Retry
          </button>
          <Link
            href={giftPath(giftId)}
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-white/15 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70"
          >
            Open gift anyway
          </Link>
        </div>
      )}

      {giftId && (
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
          Gift · {giftId}
        </p>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="grid min-app-h place-items-center px-4">
      <Suspense
        fallback={
          <p className="font-mono text-sm text-white/50">Loading checkout…</p>
        }
      >
        <CheckoutSuccessInner />
      </Suspense>
    </main>
  );
}
