'use client';

import { useMemo } from 'react';
import { quote, type AddOnId, type Quote } from '@/lib/pricing';
import { selectedCards } from '@/lib/formatCards';
import { useXsoStore } from '@/store/useXsoStore';
import type { GiftStyle, XsoData } from '@/types/xso';

/** Removes legacy referral links now that every keepsake has one fixed price. */
export function captureRef(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('ref')) return;
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {}
}

const NONE: readonly AddOnId[] = [];

export function useQuote(
  style: GiftStyle,
  cardCount: number = 0,
  addOns: readonly AddOnId[] = NONE,
) {
  return useMemo<Quote>(() => quote({ style, cardCount, addOns }), [addOns, cardCount, style]);
}

/** Quote for the gift draft in the store, for pages outside the customizer. */
export function useDraftQuote(style: GiftStyle) {
  const count = useXsoStore((s) => selectedCards(s as unknown as XsoData, style).length);
  return useQuote(style, count);
}
