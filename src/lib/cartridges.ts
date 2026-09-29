import type { GiftStyle } from '@/types/xso';

export interface CartridgeSpec {
  id: GiftStyle;
  code: string;
  title: string;
  subtitle: string;
  tagline: string;
  /** One-line explanation of how this format plays, for the storefront. */
  description: string;
  year: string;
  accent: string;
  accentSoft: string;
  labelBg: string;
  ink: string;
}

export const CARTRIDGES: CartridgeSpec[] = [
  {
    id: 'loop',
    code: 'XSO-01',
    title: 'LOOP',
    subtitle: 'Infinite Stack',
    tagline: 'Toss. Cycle. Never ends.',
    description: 'A hand-held stack of four cards. Tap or swipe to flick the top one under the pile, over and over.',
    year: '1989',
    accent: '#00ff66',
    accentSoft: 'rgba(0, 255, 102, 0.22)',
    labelBg: '#0b2416',
    ink: '#e6ffef',
  },
  {
    id: 'rewind',
    code: 'XSO-02',
    title: 'REWIND',
    subtitle: 'Time Recall',
    tagline: 'Discard, then press recall.',
    description: 'Toss each memory aside, then hit recall and watch every card rewind back into your hand.',
    year: '1991',
    accent: '#ffc857',
    accentSoft: 'rgba(255, 200, 87, 0.22)',
    labelBg: '#2a2110',
    ink: '#fff6e0',
  },
  {
    id: 'scrapbook',
    code: 'XSO-03',
    title: 'SCRAPBOOK',
    subtitle: 'Flat-Lay Fan',
    tagline: 'Scatter into a messy collage.',
    description: 'The four keepsakes spill across a desk like a scrapbook spread, ready to pick up and study.',
    year: '1993',
    accent: '#ff6b9d',
    accentSoft: 'rgba(255, 107, 157, 0.22)',
    labelBg: '#2a1420',
    ink: '#ffe8f1',
  },
  {
    id: 'accordion',
    code: 'XSO-04',
    title: 'ACCORDION',
    subtitle: 'Ribbon Fold',
    tagline: 'One continuous memory strip.',
    description: 'All four memories joined into one ribbon that folds and unfolds like a paper accordion.',
    year: '1995',
    accent: '#b8ff4a',
    accentSoft: 'rgba(184, 255, 74, 0.2)',
    labelBg: '#1c2610',
    ink: '#f4ffe8',
  },
  {
    id: 'moviebox',
    code: 'XSO-05',
    title: 'MOVIE BOX',
    subtitle: 'Crank Projector',
    tagline: 'Hand-crank the film strip.',
    description: 'Each memory is a frame on a film strip. Turn the crank to project them one after another.',
    year: '1978',
    accent: '#ff7a45',
    accentSoft: 'rgba(255, 122, 69, 0.22)',
    labelBg: '#2a1610',
    ink: '#fff0e8',
  },
];

/** Charged amount in cents; checkout sends this to Lemon Squeezy as a custom price. */
export const CARTRIDGE_PRICE_CENTS = 1499;
export const CARTRIDGE_PRICE = `$${(CARTRIDGE_PRICE_CENTS / 100).toFixed(2)}`;

export function getCartridge(id: GiftStyle): CartridgeSpec {
  return CARTRIDGES.find((c) => c.id === id) ?? CARTRIDGES[0];
}

/** "MOVIE BOX" → "Movie Box" for serif display. */
export function displayTitle(cart: CartridgeSpec): string {
  return cart.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
