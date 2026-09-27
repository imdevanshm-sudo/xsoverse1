'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_ATTEMPTS = 20;
const INTERVAL_MS = 1500;

export function GiftPendingPoller({ giftId }: { giftId: string }) {
  const router = useRouter();
  const [exhausted, setExhausted] = useState(false);
  const [run, setRun] = useState(0);
  const timer = useRef<number | null>(null);

  const retry = useCallback(() => {
    setExhausted(false);
    setRun((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/gifts/${encodeURIComponent(giftId)}`, {
          cache: 'no-store',
        });
        if (cancelled) return;
        if (response.ok) {
          router.refresh();
          return;
        }
        if (response.status === 404) {
          router.refresh();
          return;
        }
      } catch {
        // Network blip; keep polling until attempts run out.
      }

      if (cancelled) return;
      if (attempts >= MAX_ATTEMPTS) {
        setExhausted(true);
        return;
      }
      timer.current = window.setTimeout(poll, INTERVAL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [giftId, router, run]);

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 text-center">
      <p className="font-pixel text-[9px] uppercase tracking-[0.24em] text-phosphor/70">
        Payment processing
      </p>
      <p className="mt-4 font-mono text-sm text-white/60">
        {exhausted
          ? 'Still waiting on payment confirmation. This can take a minute.'
          : 'Your gift is being wrapped. This page will open it automatically.'}
      </p>
      {exhausted && (
        <button
          type="button"
          onClick={retry}
          className="mt-6 min-h-11 touch-manipulation rounded-full bg-phosphor px-6 py-3 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#0a120e]"
        >
          Retry
        </button>
      )}
    </div>
  );
}
