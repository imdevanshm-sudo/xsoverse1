import { isGiftStyle, parseGiftStyle } from '@/lib/xsoPayload';
import { useXsoStore } from '@/store/useXsoStore';
import { offeredStyle } from '@/types/order';
import type { GiftStyle } from '@/types/xso';

/**
 * Resolve the new-gift draft's cartridge: a valid URL `style` wins, else the current store; either
 * way only a format that's offered for new gifts.
 */
export function resolveLockedStyle(styleParam: string | null): GiftStyle {
  if (isGiftStyle(styleParam)) return offeredStyle(styleParam);
  return offeredStyle(parseGiftStyle(null, useXsoStore.getState().giftStyle));
}

export function styleQuery(style: GiftStyle): string {
  return `style=${encodeURIComponent(style)}`;
}
