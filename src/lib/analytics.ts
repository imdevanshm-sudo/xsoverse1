export type TrackEvent =
  | 'cta_click'
  | 'aesthetic_chosen'
  | 'wizard_step'
  | 'tier_selected'
  | 'checkout_started'
  | 'checkout_completed'
  | 'make_one_back'
  | 'movie_shared';

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * One place for product analytics.
 * TODO(analytics): forward to a real provider (PostHog, Plausible, GA4) here.
 */
export function track(event: TrackEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  const payload = { event, ...props };
  window.dataLayer?.push(payload);
  if (process.env.NODE_ENV !== 'production') console.info('[track]', payload);
}
