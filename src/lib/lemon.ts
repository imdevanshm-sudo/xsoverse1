import { randomBytes } from 'crypto';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { DELIVERY_OPTIONS, type Delivery, type ShippingAddress } from '@/lib/orders';
import { markGiftPaid, saveGift, type StoredGift } from '@/lib/giftStore';
import type { XsoData } from '@/types/xso';

export interface LemonConfig {
  apiKey: string;
  storeId: string;
  variantId: string;
  webhookSecret?: string;
}

export function getLemonConfig(): LemonConfig | null {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  if (!apiKey || !storeId || !variantId) return null;

  return {
    apiKey,
    storeId,
    variantId,
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
  delivery: Delivery;
  /** Required for physical orders; kept out of the public gift data. */
  shipping?: ShippingAddress;
}): Promise<{ checkoutUrl: string }> {
  const config = getLemonConfig();
  if (!config) {
    throw new Error('Lemon Squeezy is not configured');
  }

  const redirectUrl = `${options.appUrl}/checkout/success?giftId=${encodeURIComponent(options.giftId)}`;
  const option = DELIVERY_OPTIONS[options.delivery];
  const ship = options.shipping;
  // Lemon rejects empty strings in custom data, so blank optional fields are dropped.
  const shippingCustom = Object.fromEntries(
    Object.entries({
      ship_name: ship?.name,
      ship_line1: ship?.line1,
      ship_line2: ship?.line2,
      ship_city: ship?.city,
      ship_region: ship?.region,
      ship_postal_code: ship?.postalCode,
      ship_country: ship?.country,
    }).filter(([, value]) => Boolean(value)),
  );

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
          custom_price: option.priceCents,
          checkout_data: {
            custom: {
              gift_id: options.giftId,
              gift_style: options.giftStyle,
              delivery: options.delivery,
              ...shippingCustom,
            },
            name: options.billerName || undefined,
          },
          product_options: {
            name: `XSO Souvenir · ${options.giftStyle} · ${option.label}`,
            description: `Custom XSO for ${options.customerName || 'someone special'}`,
            redirect_url: redirectUrl,
            receipt_button_text: 'Open your XSO',
            receipt_link_url: `${options.appUrl}/gift/${options.giftId}`,
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
              id: String(config.variantId),
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
