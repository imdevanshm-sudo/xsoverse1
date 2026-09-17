import type { GiftStyle, XsoData } from '@/types/xso';

export const GIFT_STYLES: GiftStyle[] = [
  'loop',
  'scrapbook',
  'rewind',
  'accordion',
  'moviebox',
];

export function isGiftStyle(value: string | null | undefined): value is GiftStyle {
  return !!value && (GIFT_STYLES as string[]).includes(value);
}

export function parseGiftStyle(
  value: string | null | undefined,
  fallback: GiftStyle = 'loop',
): GiftStyle {
  return isGiftStyle(value) ? value : fallback;
}

export function pickXsoPayload(data: XsoData): XsoData {
  return {
    id: data.id,
    giftStyle: data.giftStyle,
    billerName: data.billerName,
    customerName: data.customerName,
    occasion: data.occasion,
    timestamp: data.timestamp,
    merchantName: data.merchantName,
    cashier: data.cashier,
    lineItems: data.lineItems,
    subtotal: data.subtotal,
    emotionalTax: data.emotionalTax,
    total: data.total,
    auditMetrics: data.auditMetrics,
    greenFlags: data.greenFlags,
    redFlags: data.redFlags,
    certifiedStampText: data.certifiedStampText,
    photos: data.photos,
    birthdayMessage: data.birthdayMessage,
    voiceNoteUrl: data.voiceNoteUrl,
    scratchOffReward: data.scratchOffReward,
  };
}

export function createGiftId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `xso_${stamp}${rand}`;
}
