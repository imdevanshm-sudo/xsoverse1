import { create } from 'zustand';
import type { ThemeId } from '@/lib/themes';
import type { GiftStyle } from '@/types/xso';

interface CustomizerModalState {
  isOpen: boolean;
  /** Pre-selected format; falls back to the draft's current style. */
  format: GiftStyle | null;
  /** Story pack the CTA was showing; falls back to the draft's current pack. */
  theme: ThemeId | null;
  open: (preset?: { format?: GiftStyle; theme?: ThemeId }) => void;
  close: () => void;
}

export const useCustomizerModal = create<CustomizerModalState>((set) => ({
  isOpen: false,
  format: null,
  theme: null,
  open: (preset) =>
    set({ isOpen: true, format: preset?.format ?? null, theme: preset?.theme ?? null }),
  close: () => set({ isOpen: false }),
}));
