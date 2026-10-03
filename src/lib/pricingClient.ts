'use client';

import { useEffect, useMemo, useState } from 'react';
import { PRICE_TEST, quote, RECIPIENT_OFFER, type AddOnId, type Quote } from '@/lib/pricing';
import { selectedCards } from '@/lib/formatCards';
import { useXsoStore } from '@/store/useXsoStore';
import type { GiftStyle, XsoData } from '@/types/xso';

const ARM_KEY = 'xso:price-arm';
const REF_KEY = 'xso:ref';

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

/** Remembers a `?ref=recipient` visit so the offer survives the trip through the wizard. */
export function captureRef(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('ref') !== RECIPIENT_OFFER.ref) return;
    window.localStorage.setItem(REF_KEY, RECIPIENT_OFFER.ref);
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {}
}

/** True when this visitor came from a received XSO and the offer is configured. */
export function isRecipientVisitor(): boolean {
  if (typeof window === 'undefined' || !RECIPIENT_OFFER.code) return false;
  try {
    return window.localStorage.getItem(REF_KEY) === RECIPIENT_OFFER.ref;
  } catch {
    return false;
  }
}

/** Visitor-specific pricing inputs, read after mount so server and client markup match. */
export function usePricingContext() {
  const [ctx, setCtx] = useState<{ arm: string | null; recipient: boolean }>({
    arm: null,
    recipient: false,
  });
  useEffect(() => setCtx({ arm: priceArm(), recipient: isRecipientVisitor() }), []);
  return ctx;
}

export function useQuote(style: GiftStyle, cardCount: number, addOns: readonly AddOnId[] = []) {
  const { arm, recipient } = usePricingContext();
  return useMemo<Quote>(
    () => quote({ style, cardCount, addOns, arm, recipient }),
    [addOns, arm, cardCount, recipient, style],
  );
}

/** Quote for the gift draft in the store, for pages outside the customizer. */
export function useDraftQuote(style: GiftStyle) {
  const count = useXsoStore((s) => selectedCards(s as unknown as XsoData, style).length);
  return useQuote(style, count);
}
