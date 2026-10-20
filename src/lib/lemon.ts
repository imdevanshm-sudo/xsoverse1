import { randomBytes } from 'crypto';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { TIERS, sanitizeAddOns, type AddOnId, type Quote } from '@/lib/pricing';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import type { GiftStyle } from '@/types/xso';
import { markGiftPaid, saveGift, type StoredGift } from '@/lib/giftStore';
import { managePath } from '@/lib/giftLinks';
import { manageKey } from '@/lib/manageKey';
import type { ExpectedPayment } from '@/lib/lemonOrder';
import type { XsoData } from '@/types/xso';

export interface LemonConfig {
  apiKey: string;
  storeId: string;
  /**
   * The one Lemon Squeezy product used for every souvenir. Add-ons don't need variants of their
   * own: they're priced into the checkout's `custom_price`.
   */
  variantId: string;
  webhookSecret?: string;
  /** Signing secret of the separate webhook Lemon uses for test-mode events. */
  testWebhookSecret?: string;
  /** Owner testing switch: checkouts are created in Lemon test mode (test cards only). */
  testMode: boolean;
  /** The only buyers whose test-mode orders may unlock a gift on a production deploy. */
  testEmails: string[];
}

export function getLemonConfig(): LemonConfig | null {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId =
    process.env.LEMONSQUEEZY_VARIANT_ID ||
    process.env.LEMONSQUEEZY_VARIANT_CLASSIC ||
    process.env.LEMONSQUEEZY_VARIANT_PREMIUM ||
    process.env.LEMONSQUEEZY_VARIANT_FULL ||
    process.env.LEMONSQUEEZY_VARIANT_MOVIEBOX ||
    process.env.LEMONSQUEEZY_VARIANT_SINGLE;
  if (!apiKey || !storeId) return null;
  if (!variantId) return null;
  /** Lemon API keys belong to one mode: test checkouts need a key created in test mode. */
  const testMode = process.env.LEMONSQUEEZY_TEST_MODE === 'true';
  const testKey = testMode ? process.env.LEMONSQUEEZY_TEST_API_KEY : undefined;

  return {
    apiKey: testKey || apiKey,
    storeId: (testKey && process.env.LEMONSQUEEZY_TEST_STORE_ID) || storeId,
    variantId: (testKey && process.env.LEMONSQUEEZY_TEST_VARIANT_ID) || variantId,
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    testWebhookSecret: process.env.LEMONSQUEEZY_TEST_WEBHOOK_SECRET,
    testMode,
    testEmails: (process.env.LEMONSQUEEZY_TEST_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  };
}

/** Free preview checkout is only allowed outside production when Lemon is not configured. */
export function isPreviewCheckoutAllowed(): boolean {
  return !getLemonConfig() && process.env.NODE_ENV !== 'production';
}

/** Gift links act as the access secret, so IDs must be unguessable. */
function createGiftId(): string {
  return `xso_${randomBytes(12).toString('base64url')}`;
}

export function getAppUrl(requestUrl?: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (requestUrl) {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  }
  return 'http://localhost:3000';
}

export async function createPendingGift(
  data: XsoData,
  addOns: readonly AddOnId[] = [],
  expectedPayment?: ExpectedPayment,
): Promise<StoredGift> {
  const id = createGiftId();
  const payload = pickXsoPayload({ ...data, id });
  return saveGift({
    id,
    data: payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
    addOns: addOns.length ? { requested: [...addOns], paid: [] } : undefined,
    expectedPayment,
  });
}

/** Lemon custom data values are strings: add-on ids, comma-separated. */
export function encodeAddOns(addOns: readonly { id: AddOnId }[]): string {
  return addOns.map((line) => line.id).join(',');
}

export function decodeAddOns(value: unknown): AddOnId[] {
  return typeof value === 'string' ? sanitizeAddOns(value.split(',')) : [];
}

interface LemonCheckoutResponse {
  data?: {
    attributes?: {
      url?: string;
    };
  };
  errors?: Array<{ detail?: string; title?: string; status?: string }>;
}

function checkoutError(response: Response, json: LemonCheckoutResponse): Error {
  const first = json.errors?.[0];
  const msg = first?.detail || first?.title || '';
  if (msg.toLowerCase().includes('related resource does not exist')) {
    return new Error(
      'Checkout is temporarily unavailable: Store or Variant resource not found. Please verify Lemon Squeezy Store ID and Variant ID.',
    );
  }
  return new Error(msg || `Lemon Squeezy error (${response.status})`);
}

export async function createLemonCheckout(options: {
  giftId: string;
  giftStyle: GiftStyle;
  customerName: string;
  billerName: string;
  appUrl: string;
  quote: Quote;
  /** Labels of the cards in the stack, for the checkout summary. */
  cardNames: string[];
  /** Lemon.js overlay instead of a full-page redirect. */
  overlay?: boolean;
}): Promise<{ checkoutUrl: string; redirectUrl: string }> {
  const config = getLemonConfig();
  if (!config) {
    throw new Error('Lemon Squeezy is not configured');
  }

  /** The buyer is the sender, so both the redirect and the emailed receipt open their dashboard. */
  const redirectUrl = `${options.appUrl}${managePath(options.giftId, manageKey(options.giftId))}&paid=1`;
  const { quote } = options;
  const aesthetic = displayTitle(getCartridge(options.giftStyle));
  const recipient = options.customerName.trim() || 'someone special';
  const tierName = TIERS[quote.tier]?.name || 'Souvenir';
  const description = [
    `${tierName} · ${aesthetic}`,
    options.cardNames.join(', '),
    quote.addOns.length ? `With ${quote.addOns.map((line) => line.label).join(', ')}` : '',
    'A private link, ready the moment you check out. No shipping, no waiting.',
  ]
    .filter(Boolean)
    .join('\n');
  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          custom_price: options.quote.total,
          ...(config.testMode ? { test_mode: true } : {}),
          checkout_data: {
            custom: {
              gift_id: options.giftId,
              gift_style: options.giftStyle,
              tier: options.quote.tier,
              // Lemon rejects empty strings in custom data.
              ...(options.quote.addOns.length
                ? { add_ons: encodeAddOns(options.quote.addOns) }
                : {}),
            },
            name: options.billerName || undefined,
          },
          product_options: {
            name: `XSO Souvenir for ${recipient} · ${aesthetic}`,
            description,
            // No product media: custom thumbs + dark checkout were crashing Lemon's Vue
            // checkout on store.xsoverse.app (blank screen / useCheckoutState loop).
            redirect_url: redirectUrl,
            receipt_button_text: 'Send their gift',
            receipt_link_url: redirectUrl,
            receipt_thank_you_note: `Your souvenir for ${recipient} is sealed. Open your dashboard to send the link.`,
          },
          // Light hosted checkout only. dark+embed on the custom domain blanks the page.
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
            desc: true,
            discount: true,
            dark: false,
            button_color: '#EC4899',
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(config.storeId),
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: config.variantId,
            },
          },
        },
      },
    }),
  });

  const json = (await response.json()) as LemonCheckoutResponse;
  const checkoutUrl = json.data?.attributes?.url;

  if (!response.ok || !checkoutUrl) throw checkoutError(response, json);

  return { checkoutUrl, redirectUrl };
}

export async function activateGiftPreview(
  giftId: string,
  addOns: readonly AddOnId[] = [],
): Promise<StoredGift | null> {
  return markGiftPaid(giftId, 'preview', addOns);
}
