'use client';

import { create } from 'zustand';
import { newId } from '@/lib/constants';
import { getTheme, type ThemeId } from '@/lib/themes';
import { FRAMES_PER_STRIP, MAX_STRIPS, blankFrame, stripCount } from '@/lib/photoStrips';
import { scrapbookDefaults } from '@/lib/scrapbook';
import {
  getMockXsoData,
  type AuditMetrics,
  type LineItem,
  type ScrapbookLayers,
  type XsoData,
} from '@/types/xso';

type ScalarField = Exclude<
  keyof XsoData,
  'lineItems' | 'auditMetrics' | 'greenFlags' | 'redFlags' | 'photos' | 'scrapbook'
>;

interface XsoActions {
  setField: <K extends ScalarField>(key: K, value: XsoData[K]) => void;
  setScrapbook: (patch: Partial<ScrapbookLayers>) => void;
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
  /** Sets a photo-strip frame, padding empty frames when needed. */
  setPhotoAt: (index: number, url: string) => void;
  /** Appends four blank frames as a new purikura strip (up to MAX_STRIPS). */
  addPhotoStrip: () => void;
  removePhotoStrip: (strip: number) => void;
  /** Replaces all editable content with a theme pack's copy. */
  applyTheme: (id: ThemeId) => void;
}

export type XsoStore = XsoData & XsoActions & { themeId: ThemeId; scrapbook: ScrapbookLayers };

const initial = getMockXsoData();

export const useXsoStore = create<XsoStore>((set) => ({
  ...initial,
  scrapbook: scrapbookDefaults(initial),
  themeId: 'bestie-roast',

  applyTheme: (id) => {
    const theme = getTheme(id);
    if (!theme) return;
    const content = theme.content();
    set({
      ...content,
      lineItems: content.lineItems.map((item) => ({ ...item, id: newId() })),
      scrapbook: scrapbookDefaults(content),
      themeId: id,
    });
  },

  setScrapbook: (patch) => set((state) => ({ scrapbook: { ...state.scrapbook, ...patch } })),

  setPhotoAt: (index, url) =>
    set((state) => {
      const photos = [...state.photos];
      while (photos.length <= index) photos.push('');
      photos[index] = url;
      return { photos };
    }),

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
      lineItems: state.lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
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

  addPhotoStrip: () =>
    set((state) => {
      const strips = stripCount(state.photos);
      if (strips >= MAX_STRIPS) return {};
      const photos = state.photos.slice(0, strips * FRAMES_PER_STRIP);
      while (photos.length < strips * FRAMES_PER_STRIP) photos.push(blankFrame(photos.length));
      for (let i = 0; i < FRAMES_PER_STRIP; i += 1) photos.push(blankFrame(photos.length));
      return { photos };
    }),

  removePhotoStrip: (strip) =>
    set((state) => {
      if (stripCount(state.photos) <= 1) return {};
      const photos = [...state.photos];
      photos.splice(strip * FRAMES_PER_STRIP, FRAMES_PER_STRIP);
      return { photos };
    }),
}));
