import { create } from 'zustand';
import { playSound } from '@/lib/sound';

/** Written on the back of a print; the lightbox offers a flip when present. */
export interface PolaroidBack {
  meta?: string;
  text: string;
  note?: string;
  footer?: string;
  signoff?: string;
}

/** Where the thumbnail sat on screen, so the enlarged print can grow out of it. */
export interface PolaroidOrigin {
  x: number;
  y: number;
  width: number;
  rotate?: number;
}

export interface PolaroidData {
  /** Lets the opener hide its own copy while the enlarged one is out. */
  id: string;
  src: string;
  alt: string;
  caption?: string;
  back?: PolaroidBack;
  origin?: PolaroidOrigin;
}

interface PolaroidState {
  isOpen: boolean;
  /** Kept through the close animation and cleared by `settle`, so the print can fly home. */
  activePolaroidData: PolaroidData | null;
  open: (data: PolaroidData) => void;
  close: () => void;
  settle: () => void;
}

export const usePolaroidStore = create<PolaroidState>((set) => ({
  isOpen: false,
  activePolaroidData: null,
  open: (data) => {
    playSound('photo.pop');
    set({ isOpen: true, activePolaroidData: data });
  },
  close: () =>
    set((state) => {
      if (state.isOpen) playSound('photo.close');
      return { isOpen: false };
    }),
  settle: () => set((state) => (state.isOpen ? state : { activePolaroidData: null })),
}));

/** Measures a thumbnail for `PolaroidData.origin`. */
export function originOf(node: Element | null, rotate = 0): PolaroidOrigin | undefined {
  if (!node) return undefined;
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, rotate };
}
