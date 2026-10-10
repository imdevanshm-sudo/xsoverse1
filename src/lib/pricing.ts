import type { GiftStyle } from '@/types/xso';

/** The checkout route recomputes every displayed price, so the browser never decides the charge. */

export type CurrencyCode = 'USD' | 'INR';

interface CurrencySpec {
  code: CurrencyCode;
  locale: string;
  /**
   * Lemon Squeezy charges in the store's currency. Keep a currency disabled until it has its own
   * store (or prices) set up there, otherwise `custom_price` would be read in the wrong unit.
   */
  enabled: boolean;
}

export const CURRENCIES: Record<CurrencyCode, CurrencySpec> = {
  USD: { code: 'USD', locale: 'en-US', enabled: true },
  // TODO(pricing): enable once an INR store/variants exist in Lemon Squeezy, then wire
  // `resolveCurrency` to the visitor's country (e.g. the `x-vercel-ip-country` header).
  INR: { code: 'INR', locale: 'en-IN', enabled: false },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

/** Amounts are in the currency's minor unit (cents, paise). */
export type Amounts = Record<CurrencyCode, number>;

export type TierId = 'classic' | 'premium';

export interface TierSpec {
  id: TierId;
  name: string;
  blurb: string;
  prices: Amounts;
  styles: readonly GiftStyle[];
  badge?: string;
  /** Env var holding this tier's Lemon Squeezy variant id (server only). */
  variantEnv: string;
}

export const TIERS: Record<TierId, TierSpec> = {
  classic: {
    id: 'classic',
    name: 'Keepsake',
    blurb: 'The Loop or The Rewind. A swipeable keepsake with your receipt, photos and letter.',
    prices: { USD: 1499, INR: 24900 },
    styles: ['loop', 'rewind'],
    variantEnv: 'LEMONSQUEEZY_VARIANT_CLASSIC',
  },
  premium: {
    id: 'premium',
    name: 'Keepsake',
    blurb: 'The Scrapbook, The Accordion or The Movie Box. A richer, more interactive keepsake.',
    prices: { USD: 1499, INR: 24900 },
    styles: ['scrapbook', 'accordion', 'moviebox'],
    badge: 'Richer',
    variantEnv: 'LEMONSQUEEZY_VARIANT_PREMIUM',
  },
};

export const TIER_ORDER: TierId[] = ['classic', 'premium'];

export const CLASSIC_STYLES: readonly GiftStyle[] = TIERS.classic.styles;
export const PREMIUM_STYLES: readonly GiftStyle[] = TIERS.premium.styles;

/** The tier an order lands in: by format, not by how many cards are in the stack. */
export function resolveTier(style: GiftStyle): TierId {
  return CLASSIC_STYLES.includes(style) ? 'classic' : 'premium';
}

export interface Quote {
  tier: TierId;
  currency: CurrencyCode;
  base: number;
  total: number;
}

export function quote(options: {
  style: GiftStyle;
  /** Ignored: price is by format. Kept so existing callers do not have to change. */
  cardCount?: number;
  currency?: CurrencyCode;
}): Quote {
  const currency = options.currency ?? DEFAULT_CURRENCY;
  const tier = resolveTier(options.style);
  const base = TIERS[tier].prices[currency];
  return { tier, currency, base, total: base };
}

export function formatPrice(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const spec = CURRENCIES[currency];
  return new Intl.NumberFormat(spec.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 100 === 0 && currency === 'INR' ? 0 : 2,
  }).format(amount / 100);
}

export function tierPrice(tier: TierId, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return formatPrice(TIERS[tier].prices[currency], currency);
}
