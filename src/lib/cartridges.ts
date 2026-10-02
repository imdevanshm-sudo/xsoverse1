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
    tagline: 'The ones that keep coming back.',
    description:
      'Four keepsakes in one hand-held stack. Flick the top one away and it slides back under the pile, the way the moments that matter always find their way back.',
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
    tagline: "For the days you'd live again.",
    description:
      'Set each memory down one by one, then press recall and watch them all rush back into your hand. For the moments you wish you could play one more time.',
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
    tagline: 'Proof that it all happened.',
    description:
      'The receipt, the photos, the letter, spilled across the desk like a shoebox you finally opened. Every scrap is evidence of something only you two shared.',
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
    tagline: 'One unbroken thread.',
    description:
      'Every memory folded into a single paper ribbon, so none of them stands alone. Pull it open and the whole story unfolds at once, the way it felt at the time.',
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
    tagline: 'Your story, frame by frame.',
    description:
      'Each memory becomes a frame on a hand-cranked reel. Turn it slowly and watch your history flicker back to life, one quiet scene at a time.',
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
