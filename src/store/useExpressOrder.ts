import { create } from 'zustand';
import type { ThemeId } from '@/lib/themes';
import type { GiftStyle } from '@/types/xso';

interface ExpressOrderState {
  open: boolean;
  /** Pre-selection for step 1; falls back to the draft's current style/theme. */
  style: GiftStyle | null;
  theme: ThemeId | null;
  openWith: (preset?: { style?: GiftStyle; theme?: ThemeId }) => void;
  close: () => void;
}

export const useExpressOrder = create<ExpressOrderState>((set) => ({
  open: false,
  style: null,
  theme: null,
  openWith: (preset) =>
    set({ open: true, style: preset?.style ?? null, theme: preset?.theme ?? null }),
  close: () => set({ open: false }),
}));
