import { isGiftStyle, parseGiftStyle } from '@/lib/xsoPayload';
import { useXsoStore } from '@/store/useXsoStore';
import type { GiftStyle } from '@/types/xso';

/** Resolve locked cartridge: valid URL `style` wins, else current store. */
export function resolveLockedStyle(styleParam: string | null): GiftStyle {
  if (isGiftStyle(styleParam)) return styleParam;
  return parseGiftStyle(null, useXsoStore.getState().giftStyle);
}

export function styleQuery(style: GiftStyle): string {
  return `style=${encodeURIComponent(style)}`;
}
