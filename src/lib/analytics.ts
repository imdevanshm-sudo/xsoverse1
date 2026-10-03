import { PRICE_TEST } from '@/lib/pricing';

export type TrackEvent =
  | 'cta_click'
  | 'aesthetic_chosen'
  | 'wizard_step'
  | 'tier_selected'
  | 'addon_toggled'
  | 'checkout_started'
  | 'checkout_completed'
  | 'make_one_back';

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * One place for product analytics. Every event carries the visitor's price-test arm so price
 * variants can be compared.
 * TODO(analytics): forward to a real provider (PostHog, Plausible, GA4) here.
 */
export function track(event: TrackEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  let arm: string | null = null;
  try {
    arm = PRICE_TEST.enabled ? window.localStorage.getItem('xso:price-arm') : null;
  } catch {}
  const payload = { event, ...props, ...(arm ? { price_arm: arm } : {}) };
  window.dataLayer?.push(payload);
  if (process.env.NODE_ENV !== 'production') console.info('[track]', payload);
}
