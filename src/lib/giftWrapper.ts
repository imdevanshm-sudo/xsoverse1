import type { GiftStyle, XsoData } from '@/types/xso';

/**
 * Everything the sealed gift shows on the outside. This is all a page sends before the unwrap;
 * the contents themselves are only fetched once someone opens it.
 */
export interface GiftWrapper {
  giftStyle: GiftStyle;
  customerName: string;
  billerName: string;
  occasion: string;
  date: string;
  note: string;
}

export function wrapperOf(giftId: string, data: XsoData): GiftWrapper {
  return {
    giftStyle: data.giftStyle,
    customerName: data.customerName,
    billerName: data.billerName,
    occasion: data.occasion,
    date: (data.timestamp ?? '').split(' ')[0],
    note: tagNote(data, giftId),
  };
}

function tagNote(data: XsoData, giftId: string) {
  const initial = data.billerName?.charAt(0) ?? '';
  if (!data.lineItems?.length) {
    return `Made just for you. — ${initial}`;
  }
  const index = hashString(giftId) % data.lineItems.length;
  const memory = (data.lineItems[index].description || 'memories').toLowerCase();
  return `Open this when you miss our ${memory}. — ${initial}`;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
