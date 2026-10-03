'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_ATTEMPTS = 20;
const INTERVAL_MS = 1500;

/** Recipient-side wait while the sender's payment settles: no branding, just a quiet line. */
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
        if (response.ok || response.status === 404) {
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
    <div className="grid min-app-h place-items-center px-8 text-center">
      <div>
        <p className="font-display text-[15px] font-light tracking-[0.06em] text-white/70">
          {exhausted ? 'Still being wrapped.' : 'Someone is still wrapping this for you.'}
        </p>
        {exhausted && (
          <button
            type="button"
            onClick={retry}
            className="immersive-cta mt-8 min-h-11 touch-manipulation rounded-full border border-white/25 px-6 font-mono text-[11px] uppercase tracking-[0.22em] text-white/85"
          >
            Check again
          </button>
        )}
      </div>
    </div>
  );
}
