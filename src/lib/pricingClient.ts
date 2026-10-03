'use client';

import { useEffect, useMemo, useState } from 'react';
import { PRICE_TEST, quote, type AddOnId, type Quote } from '@/lib/pricing';
import { selectedCards } from '@/lib/formatCards';
import { useXsoStore } from '@/store/useXsoStore';
import type { GiftStyle, XsoData } from '@/types/xso';

const ARM_KEY = 'xso:price-arm';

/** This visitor's Full Stack price-test arm, assigned once and kept across visits. */
export function priceArm(): string | null {
  if (!PRICE_TEST.enabled || typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(ARM_KEY);
    if (saved && saved in PRICE_TEST.arms) return saved;
    const arms = Object.keys(PRICE_TEST.arms);
    const arm = arms[Math.floor(Math.random() * arms.length)];
    window.localStorage.setItem(ARM_KEY, arm);
    return arm;
  } catch {
    return null;
  }
}

/** Visitor-specific pricing inputs, read after mount so server and client markup match. */
export function usePricingContext() {
  const [arm, setArm] = useState<string | null>(null);
  useEffect(() => setArm(priceArm()), []);
  return { arm };
}

export function useQuote(style: GiftStyle, cardCount: number, addOns: readonly AddOnId[] = []) {
  const { arm } = usePricingContext();
  return useMemo<Quote>(
    () => quote({ style, cardCount, addOns, arm }),
    [addOns, arm, cardCount, style],
  );
}

/** Quote for the gift draft in the store, for pages outside the customizer. */
export function useDraftQuote(style: GiftStyle) {
  const count = useXsoStore((s) => selectedCards(s as unknown as XsoData, style).length);
  return useQuote(style, count);
}
