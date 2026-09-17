'use client';

import { create } from 'zustand';
import { newId } from '@/lib/constants';
import {
  getMockXsoData,
  type AuditMetrics,
  type LineItem,
  type XsoData,
} from '@/types/xso';

type ScalarField = Exclude<
  keyof XsoData,
  'lineItems' | 'auditMetrics' | 'greenFlags' | 'redFlags' | 'photos'
>;

interface XsoActions {
  setField: <K extends ScalarField>(key: K, value: XsoData[K]) => void;
  setAuditMetric: (key: keyof AuditMetrics, value: number) => void;
  addLineItem: () => void;
  updateLineItem: (id: string, patch: Partial<Omit<LineItem, 'id'>>) => void;
  removeLineItem: (id: string) => void;
  moveLineItem: (id: string, direction: 'up' | 'down') => void;
  addFlag: (kind: 'greenFlags' | 'redFlags', value?: string) => void;
  updateFlag: (kind: 'greenFlags' | 'redFlags', index: number, value: string) => void;
  removeFlag: (kind: 'greenFlags' | 'redFlags', index: number) => void;
  addPhoto: (url?: string) => void;
  updatePhoto: (index: number, url: string) => void;
  removePhoto: (index: number) => void;
}

export type XsoStore = XsoData & XsoActions;

export const useXsoStore = create<XsoStore>((set) => ({
  ...getMockXsoData(),

  setField: (key, value) => set({ [key]: value } as Partial<XsoData>),

  setAuditMetric: (key, value) =>
    set((state) => ({
      auditMetrics: {
        ...state.auditMetrics,
        [key]: Math.min(100, Math.max(0, Math.round(value))),
      },
    })),

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
      lineItems: state.lineItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
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

  addFlag: (kind, value = 'New flag') =>
    set((state) => ({
      [kind]: [...state[kind], value],
    })),

  updateFlag: (kind, index, value) =>
    set((state) => ({
      [kind]: state[kind].map((flag, i) => (i === index ? value : flag)),
    })),

  removeFlag: (kind, index) =>
    set((state) => ({
      [kind]: state[kind].filter((_, i) => i !== index),
    })),

  addPhoto: (url = '') =>
    set((state) => ({
      photos: [...state.photos, url || 'https://placehold.co/240x320/ffe4f1/c1177a?text=PIC'],
    })),

  updatePhoto: (index, url) =>
    set((state) => ({
      photos: state.photos.map((photo, i) => (i === index ? url : photo)),
    })),

  removePhoto: (index) =>
    set((state) => ({
      photos: state.photos.filter((_, i) => i !== index),
    })),
}));
