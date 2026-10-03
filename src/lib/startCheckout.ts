import { useXsoStore } from '@/store/useXsoStore';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { isRecipientVisitor, priceArm } from '@/lib/pricingClient';
import { loadLemonJs, openLemonOverlay } from '@/lib/lemonJs';
import type { AddOnId } from '@/lib/pricing';
import type { GiftStyle, XsoData } from '@/types/xso';

export interface CheckoutExtras {
  addOns?: AddOnId[];
  /** ISO time for scheduled delivery. */
  deliverAt?: string;
}

/**
 * Saves the current draft as a pending gift and opens payment: the Lemon.js overlay when it
 * loads, otherwise a full-page redirect. Resolves `'overlay'` once the overlay is open; on the
 * redirect path the page navigates away. Throws on failure.
 */
export async function startCheckout(
  style: GiftStyle,
  order?: XsoData,
  extras: CheckoutExtras = {},
): Promise<'overlay' | 'redirect'> {
  const data = pickXsoPayload({ ...(order ?? useXsoStore.getState()), giftStyle: style });
  const overlay = await loadLemonJs();
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      ...extras,
      arm: priceArm(),
      recipient: isRecipientVisitor(),
      overlay,
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    mode?: 'lemon' | 'preview';
    checkoutUrl?: string;
    redirectUrl?: string;
    error?: string;
  };
  if (!response.ok || !json.checkoutUrl) {
    throw new Error(json.error || 'Checkout failed');
  }
  const done = json.redirectUrl;
  if (
    overlay &&
    json.mode === 'lemon' &&
    done &&
    openLemonOverlay(json.checkoutUrl, () => window.location.assign(done))
  ) {
    return 'overlay';
  }
  window.location.assign(json.checkoutUrl);
  return 'redirect';
}
