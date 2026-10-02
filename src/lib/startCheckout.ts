import { useXsoStore } from '@/store/useXsoStore';
import { pickXsoPayload } from '@/lib/xsoPayload';
import type { GiftStyle } from '@/types/xso';

/**
 * Saves the current draft as a pending gift and sends the browser to payment.
 * Resolves only on failure paths (throws); on success the page navigates away.
 */
export async function startCheckout(style: GiftStyle): Promise<void> {
  const snapshot = useXsoStore.getState();
  const data = pickXsoPayload({ ...snapshot, giftStyle: style });
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    checkoutUrl?: string;
    error?: string;
  };
  if (!response.ok || !json.checkoutUrl) {
    throw new Error(json.error || 'Checkout failed');
  }
  window.location.assign(json.checkoutUrl);
}
