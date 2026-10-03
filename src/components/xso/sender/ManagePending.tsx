'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_ATTEMPTS = 20;
const MAX_PAID_ATTEMPTS = 60;
const INTERVAL_MS = 900;

/** Waits on the sender's dashboard until the payment webhook marks the gift paid. */
export function ManagePending({ giftId, preview }: { giftId: string; preview: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('Pressing the wax seal…');
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setMessage('Checking again…');
    setRun((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

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
          router.refresh();
          return;
        }
        if (response.status === 402 && attempts < (preview ? MAX_ATTEMPTS : MAX_PAID_ATTEMPTS)) {
          setMessage(
            preview ? 'Activating preview gift…' : 'Payment received. Letting the seal set…',
          );
          timer = window.setTimeout(poll, INTERVAL_MS);
          return;
        }
        setError(
          response.status === 404
            ? 'We could not find this gift. Contact support with the gift ID below.'
            : preview
              ? 'Preview gift could not be activated.'
              : 'Payment is still processing. Try again in a moment.',
        );
      } catch {
        if (cancelled) return;
        if (attempts < MAX_ATTEMPTS) {
          timer = window.setTimeout(poll, INTERVAL_MS);
          return;
        }
        setError('Could not reach the server to confirm checkout.');
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [giftId, preview, run, router]);

  return (
    <div className="paper-panel w-full max-w-md p-6 text-center sm:p-8">
      <p className="font-receipt text-[11px] uppercase tracking-[0.24em] text-[#9a6b7b]">
        XSO · Receipt of delivery
      </p>
      <h1 className="mt-2 font-serif text-[32px] font-semibold leading-tight text-[#2d1b22]">
        {error ? 'Not quite yet.' : 'Pressing the seal…'}
      </h1>
      <p className="mt-3 text-[15px] text-[#7a5563]" aria-live="polite">
        {error ?? message}
      </p>
      {error ? (
        <button
          type="button"
          onClick={retry}
          className="matte-cta mt-5 min-h-12 w-full rounded-full font-serif text-[16px] font-semibold"
        >
          Try again
        </button>
      ) : (
        <span
          aria-hidden
          className="mx-auto mt-5 block h-6 w-6 animate-spin rounded-full border-2 border-[#ec4899]/25 border-t-[#ec4899]"
        />
      )}
      <p className="mt-5 border-t border-dashed border-[#f0cfdc] pt-3 font-receipt text-[10px] uppercase tracking-[0.16em] text-[#b48799]">
        Gift · {giftId}
      </p>
    </div>
  );
}
