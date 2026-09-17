import { createGiftId, pickXsoPayload } from '@/lib/xsoPayload';
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
}): Promise<{ checkoutUrl: string }> {
  const config = getLemonConfig();
  if (!config) {
    throw new Error('Lemon Squeezy is not configured');
  }

  const redirectUrl = `${options.appUrl}/checkout/success?giftId=${encodeURIComponent(options.giftId)}`;

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
          checkout_data: {
            custom: {
              gift_id: options.giftId,
              gift_style: options.giftStyle,
            },
            name: options.billerName || undefined,
          },
          product_options: {
            name: `XSO Souvenir · ${options.giftStyle}`,
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
