import { useXsoStore } from '@/store/useXsoStore';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { hostedCheckoutUrl, scrubLemonOverlay } from '@/lib/lemonJs';
import type { AddOnId } from '@/lib/pricing';
import type { GiftStyle, XsoData } from '@/types/xso';

/**
 * Saves the current draft as a pending gift and opens Lemon's hosted checkout.
 *
 * Overlay embed on store.xsoverse.app currently hangs (white blank, iframe height 0,
 * Lemon's useCheckoutState crash). Full-page hosted checkout is reliable.
 */
export async function startCheckout(
  style: GiftStyle,
  order?: XsoData,
  addOns: readonly AddOnId[] = [],
): Promise<'overlay' | 'redirect'> {
  const data = pickXsoPayload({ ...(order ?? useXsoStore.getState()), giftStyle: style });
  scrubLemonOverlay();

  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      overlay: false,
      addOns,
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

  window.location.assign(hostedCheckoutUrl(json.checkoutUrl));
  return 'redirect';
}
