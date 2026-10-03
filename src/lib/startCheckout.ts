import { useXsoStore } from '@/store/useXsoStore';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { priceArm } from '@/lib/pricingClient';
import type { AddOnId } from '@/lib/pricing';
import type { GiftStyle, XsoData } from '@/types/xso';

export interface CheckoutExtras {
  addOns?: AddOnId[];
  /** ISO time for scheduled delivery. */
  deliverAt?: string;
}

/**
 * Saves the current draft as a pending gift and sends the browser to payment.
 * Resolves only on failure paths (throws); on success the page navigates away.
 */
export async function startCheckout(
  style: GiftStyle,
  order?: XsoData,
  extras: CheckoutExtras = {},
): Promise<void> {
  const data = pickXsoPayload({ ...(order ?? useXsoStore.getState()), giftStyle: style });
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, ...extras, arm: priceArm() }),
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
