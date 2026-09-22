'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CheckoutSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const giftId = searchParams.get('giftId');
  const preview = searchParams.get('preview') === '1';
  const [message, setMessage] = useState('Confirming your XSO…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!giftId) {
      setError('Missing gift id from checkout.');
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        if (attempts === 1) {
          await fetch(`/api/gifts/${giftId}/confirm`, { method: 'POST' });
        }

        const response = await fetch(`/api/gifts/${giftId}`);
        if (response.ok) {
          if (!cancelled) router.replace(`/gift/${giftId}`);
          return;
        }

        if (response.status === 402 && attempts < 20) {
          if (!cancelled) {
            setMessage(
              preview
                ? 'Activating preview gift…'
                : 'Payment received. Generating your shareable link…',
            );
          }
          window.setTimeout(poll, 900);
          return;
        }

        if (!cancelled) {
          setError(
            preview
              ? 'Preview gift could not be activated.'
              : 'Payment is still processing. Refresh in a moment.',
          );
        }
      } catch {
        if (!cancelled) setError('Could not confirm checkout.');
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [giftId, preview, router]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 text-center shadow-xl">
      <p className="font-pixel text-[9px] uppercase tracking-[0.24em] text-phosphor/70">
        XSO Checkout
      </p>
      <h1 className="mt-3 font-arcade text-xl uppercase tracking-[0.12em] text-console-mist">
        {error ? 'Hold Up' : 'Almost There'}
      </h1>
      <p className="mt-3 font-mono text-sm text-white/60">{error ?? message}</p>
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
