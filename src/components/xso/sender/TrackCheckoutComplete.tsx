'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';

/** Fires `checkout_completed` once per gift when Lemon Squeezy returns with `&paid=1`. */
export function TrackCheckoutComplete({ giftId }: { giftId: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('paid') !== '1') return;
    const key = `xso:completed:${giftId}`;
    try {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, '1');
        track('checkout_completed', { gift_id: giftId });
      }
    } catch {
      track('checkout_completed', { gift_id: giftId });
    }
    url.searchParams.delete('paid');
    window.history.replaceState(window.history.state, '', url.pathname + url.search);
  }, [giftId]);
  return null;
}
