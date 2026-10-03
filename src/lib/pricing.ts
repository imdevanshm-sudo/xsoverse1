import type { GiftStyle } from '@/types/xso';

/**
 * Every price, tier and add-on the storefront shows or charges. The checkout route recomputes the
 * total from here on the server, so the browser never decides what is charged.
 */

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

export type TierId = 'single' | 'full' | 'moviebox';

export interface TierSpec {
  id: TierId;
  name: string;
  blurb: string;
  prices: Amounts;
  badge?: string;
  /** Env var holding this tier's Lemon Squeezy variant id (server only). */
  variantEnv: string;
}

export const TIERS: Record<TierId, TierSpec> = {
  single: {
    id: 'single',
    name: 'Single Card',
    blurb: 'One card of your choice',
    prices: { USD: 699, INR: 19900 },
    variantEnv: 'LEMONSQUEEZY_VARIANT_SINGLE',
  },
  full: {
    id: 'full',
    name: 'Full Stack',
    blurb: 'Every card in the stack',
    prices: { USD: 1499, INR: 24900 },
    badge: 'Most popular',
    variantEnv: 'LEMONSQUEEZY_VARIANT_FULL',
  },
  moviebox: {
    id: 'moviebox',
    name: 'Movie Box',
    blurb: 'The full stack as a film, with a soundtrack',
    // TODO(pricing): test $19.99 (1999) once the cinematic Movie Box upgrades have shipped.
    prices: { USD: 1499, INR: 24900 },
    variantEnv: 'LEMONSQUEEZY_VARIANT_MOVIEBOX',
  },
};

export const TIER_ORDER: TierId[] = ['single', 'full', 'moviebox'];

/** Aesthetics with their own tier (and price) once they hold more than one card. */
export const FEATURE_STYLES: readonly GiftStyle[] = ['moviebox'];

/** The tier an order lands in: one card is Single, more is Full, or the aesthetic's own tier. */
export function resolveTier(style: GiftStyle, cardCount: number): TierId {
  if (cardCount <= 1) return 'single';
  return FEATURE_STYLES.includes(style) ? 'moviebox' : 'full';
}

export type AddOnId = 'schedule' | 'regenerations' | 'video' | 'pdf';

export interface AddOnSpec {
  id: AddOnId;
  name: string;
  detail: string;
  prices: Amounts;
}

export const ADD_ONS: Record<AddOnId, AddOnSpec> = {
  schedule: {
    id: 'schedule',
    name: 'Scheduled delivery',
    detail: 'The link unlocks on the date and time you pick',
    prices: { USD: 199, INR: 4900 },
  },
  regenerations: {
    id: 'regenerations',
    name: 'Extra rewrites',
    detail: '10 more AI rewrites after it’s sealed',
    prices: { USD: 199, INR: 4900 },
  },
  video: {
    id: 'video',
    name: 'Video for Stories',
    detail: 'A vertical video export, ready to post',
    prices: { USD: 399, INR: 9900 },
  },
  pdf: {
    id: 'pdf',
    name: 'Print-ready PDF',
    detail: 'High-resolution cards to print at home',
    prices: { USD: 299, INR: 7900 },
  },
};

export const ADD_ON_ORDER: AddOnId[] = ['schedule', 'regenerations', 'video', 'pdf'];

export function isAddOnId(value: unknown): value is AddOnId {
  return typeof value === 'string' && value in ADD_ONS;
}

export function addOnsFor(_tier: TierId): AddOnSpec[] {
  return ADD_ON_ORDER.map((id) => ADD_ONS[id]);
}

/**
 * Full Stack price test. Each visitor keeps one arm; the server only accepts these values.
 * Turn on with NEXT_PUBLIC_PRICE_TEST=1.
 */
export const PRICE_TEST = {
  enabled: process.env.NEXT_PUBLIC_PRICE_TEST === '1',
  tier: 'full' as TierId,
  arms: { a: 999, b: 1499, c: 1999 } as Record<string, number>,
};

export function isPriceArm(value: unknown): value is string {
  return typeof value === 'string' && value in PRICE_TEST.arms;
}

/**
 * Offer for people who received an XSO (`/?ref=recipient`). The discount itself is a Lemon
 * Squeezy discount code worth `full - offerPrice` (a fixed $5.00 off by default), limited to the
 * Full Stack and Movie Box variants. The offer is live only while the code is set.
 */
export const RECIPIENT_OFFER = {
  ref: 'recipient',
  code: process.env.NEXT_PUBLIC_RECIPIENT_DISCOUNT_CODE || '',
  tiers: ['full', 'moviebox'] as TierId[],
  offerPrices: { USD: 999, INR: 19900 } as Amounts,
};

export function recipientDiscount(currency: CurrencyCode = DEFAULT_CURRENCY): number {
  return TIERS.full.prices[currency] - RECIPIENT_OFFER.offerPrices[currency];
}

export interface Quote {
  tier: TierId;
  currency: CurrencyCode;
  base: number;
  addOns: { id: AddOnId; amount: number }[];
  discount: number;
  total: number;
}

export function quote(options: {
  style: GiftStyle;
  cardCount: number;
  addOns?: readonly AddOnId[];
  currency?: CurrencyCode;
  arm?: string | null;
  recipient?: boolean;
}): Quote {
  const currency = options.currency ?? DEFAULT_CURRENCY;
  const tier = resolveTier(options.style, options.cardCount);
  const armPrice =
    PRICE_TEST.enabled && tier === PRICE_TEST.tier && currency === 'USD' && isPriceArm(options.arm)
      ? PRICE_TEST.arms[options.arm]
      : null;
  const base = armPrice ?? TIERS[tier].prices[currency];
  const allowed = new Set(addOnsFor(tier).map((a) => a.id));
  const addOns = Array.from(new Set(options.addOns ?? []))
    .filter((id) => allowed.has(id))
    .map((id) => ({
      id,
      amount: ADD_ONS[id].prices[currency],
    }));
  const discount =
    options.recipient && RECIPIENT_OFFER.code && RECIPIENT_OFFER.tiers.includes(tier)
      ? Math.min(base, recipientDiscount(currency))
      : 0;
  const total = base + addOns.reduce((sum, a) => sum + a.amount, 0) - discount;
  return { tier, currency, base, addOns, discount, total };
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
