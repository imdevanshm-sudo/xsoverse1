'use client';

import { create } from 'zustand';
import {
  DEFAULT_LINE_ITEMS,
  VIBES,
  clampDescription,
  formatTimestamp,
  newId,
} from '@/lib/constants';
import type {
  BestieBillState,
  GenerateBillResponse,
  LineItem,
  ThemeId,
  VibeId,
} from '@/lib/types';

function seedItems(): LineItem[] {
  return DEFAULT_LINE_ITEMS.map((item) => ({
    id: newId(),
    qty: item.qty,
    description: clampDescription(item.description),
    price: item.price,
  }));
}

interface BillActions {
  setField: <K extends keyof BestieBillState>(
    key: K,
    value: BestieBillState[K],
  ) => void;
  setTheme: (theme: ThemeId) => void;
  setVibe: (vibe: VibeId) => void;
  addLineItem: () => void;
  updateLineItem: (id: string, patch: Partial<Omit<LineItem, 'id'>>) => void;
  removeLineItem: (id: string) => void;
  moveLineItem: (id: string, direction: 'up' | 'down') => void;
  applyAiBill: (payload: GenerateBillResponse) => void;
  generateWithAi: () => Promise<void>;
  regenerateTimestamp: () => void;
}

export const useBillStore = create<BestieBillState & BillActions>((set, get) => ({
  billerName: 'Sarah',
  customerName: 'Alex',
  occasion: '25th Birthday Roast',
  vibe: VIBES[0],
  insideJokes: 'crying over exes, 2am boba, taking 45 mins to order food, getting lost in Target',
  merchantName: 'EMOTIONAL DAMAGE CO.',
  cashier: 'Trauma Bonding',
  footerQuote: 'THANK YOU FOR TOLERATING ME',
  theme: 'y2k',
  lineItems: seedItems(),
  subtotal: '$420.00 + CHAOS',
  emotionalTax: '100% LOYALTY SURCHARGE',
  delusionTax: 'DELUSION TAX ($0.00)',
  tipSuggestion: '100% MANDATORY (PAYABLE IN ICED COFFEE)',
  total: 'PRICELESS',
  timestamp: formatTimestamp(),
  barcodeId: `BB-${Date.now().toString().slice(-8)}`,
  isGenerating: false,
  error: null,

  setField: (key, value) => set({ [key]: value } as Partial<BestieBillState>),
  setTheme: (theme) => set({ theme }),
  setVibe: (vibe) => set({ vibe }),

  addLineItem: () =>
    set((state) => ({
      lineItems: [
        ...state.lineItems,
        {
          id: newId(),
          qty: '1x',
          description: 'NEW CHAOS ITEM',
          price: '$0.00',
        },
      ],
    })),

  updateLineItem: (id, patch) =>
    set((state) => ({
      lineItems: state.lineItems.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.description !== undefined) {
          next.description = clampDescription(patch.description);
        }
        return next;
      }),
    })),

  removeLineItem: (id) =>
    set((state) => ({
      lineItems: state.lineItems.filter((item) => item.id !== id),
    })),

  moveLineItem: (id, direction) =>
    set((state) => {
      const index = state.lineItems.findIndex((item) => item.id === id);
      if (index < 0) return state;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= state.lineItems.length) return state;
      const next = [...state.lineItems];
      [next[index], next[target]] = [next[target], next[index]];
      return { lineItems: next };
    }),

  applyAiBill: (payload) =>
    set({
      merchantName: payload.merchant_name,
      cashier: payload.cashier,
      footerQuote: payload.footer_quote,
      subtotal: payload.subtotal,
      total: payload.total,
      timestamp: formatTimestamp(),
      barcodeId: `BB-${Date.now().toString().slice(-8)}`,
      lineItems: payload.line_items.slice(0, 12).map((item) => ({
        id: newId(),
        qty: item.qty,
        description: clampDescription(item.description),
        price: item.price,
      })),
      error: null,
    }),

  regenerateTimestamp: () =>
    set({
      timestamp: formatTimestamp(),
      barcodeId: `BB-${Date.now().toString().slice(-8)}`,
    }),

  generateWithAi: async () => {
    const state = get();
    set({ isGenerating: true, error: null });
    try {
      const res = await fetch('/api/generate-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          biller_name: state.billerName,
          customer_name: state.customerName,
          occasion: state.occasion,
          vibe: state.vibe,
          inside_jokes: state.insideJokes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate bill');
      }

      get().applyAiBill(data as GenerateBillResponse);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Generation failed',
      });
    } finally {
      set({ isGenerating: false });
    }
  },
}));
