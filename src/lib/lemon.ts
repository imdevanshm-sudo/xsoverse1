import { randomBytes } from 'crypto';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { TIERS, type Quote, type TierId } from '@/lib/pricing';
import { markGiftPaid, saveGift, type StoredGift } from '@/lib/giftStore';
import { managePath } from '@/lib/giftLinks';
import { manageKey } from '@/lib/manageKey';
import type { XsoData } from '@/types/xso';

export interface LemonConfig {
  apiKey: string;
  storeId: string;
  /** Per-tier variants, each falling back to LEMONSQUEEZY_VARIANT_ID. */
  variants: Record<TierId, string>;
  webhookSecret?: string;
}

export function getLemonConfig(): LemonConfig | null {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const fallback = process.env.LEMONSQUEEZY_VARIANT_ID;
  const variant = (tier: TierId) => process.env[TIERS[tier].variantEnv] || fallback;
  const single = variant('single');
  const full = variant('full');
  const deluxe = variant('deluxe');
  if (!apiKey || !storeId || !single || !full || !deluxe) return null;

  return {
    apiKey,
    storeId,
    variants: { single, full, deluxe },
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
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

export async function createPendingGift(data: XsoData): Promise<StoredGift> {
  const id = createGiftId();
  const payload = pickXsoPayload({ ...data, id });
  return saveGift({
    id,
    data: payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

interface LemonCheckoutResponse {
  data?: {
    attributes?: {
      url?: string;
    };
  };
  errors?: Array<{ detail?: string }>;
}

export async function createLemonCheckout(options: {
  giftId: string;
  giftStyle: string;
  customerName: string;
  billerName: string;
  appUrl: string;
  quote: Quote;
}): Promise<{ checkoutUrl: string }> {
  const config = getLemonConfig();
  if (!config) {
    throw new Error('Lemon Squeezy is not configured');
  }

  /** The buyer is the sender, so both the redirect and the emailed receipt open their dashboard. */
  const redirectUrl = `${options.appUrl}${managePath(options.giftId, manageKey(options.giftId))}`;

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
          checkout_data: {
            custom: {
              gift_id: options.giftId,
              gift_style: options.giftStyle,
              tier: options.quote.tier,
              add_ons: options.quote.addOns.map((a) => a.id).join(','),
            },
            name: options.billerName || undefined,
          },
          product_options: {
            name: `XSO Souvenir · ${options.giftStyle}`,
            description: `Custom XSO for ${options.customerName || 'someone special'}`,
            redirect_url: redirectUrl,
            receipt_button_text: 'Send their gift',
            receipt_link_url: redirectUrl,
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
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
              id: String(config.variants[options.quote.tier]),
            },
          },
        },
      },
    }),
  });

  const json = (await response.json()) as LemonCheckoutResponse;
  const checkoutUrl = json.data?.attributes?.url;

  if (!response.ok || !checkoutUrl) {
    const detail = json.errors?.[0]?.detail || `Lemon Squeezy error (${response.status})`;
    throw new Error(detail);
  }

  return { checkoutUrl };
}

export async function activateGiftPreview(giftId: string): Promise<StoredGift | null> {
  return markGiftPaid(giftId, 'preview');
}
