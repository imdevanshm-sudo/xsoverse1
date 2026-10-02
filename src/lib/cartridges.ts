import type { GiftStyle } from '@/types/xso';

export interface CartridgeSpec {
  id: GiftStyle;
  code: string;
  title: string;
  subtitle: string;
  tagline: string;
  /** Short human caption shown under the title on the style tabs. */
  caption: string;
  /** One-line explanation of how this format plays, for the storefront. */
  description: string;
  year: string;
  /** Muted studio-light tint for the storefront showcase glow (warm-desk safe). */
  glow: string;
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
    caption: 'Always finds its way back',
    tagline: 'The ones that keep coming back.',
    description:
      'Four keepsakes in one hand-held stack. Flick one away and it slides back under the pile, like the thing you meant to say that keeps circling back at 2am.',
    year: '1989',
    glow: '#9daf88',
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
    caption: 'Play it one more time',
    tagline: "For the days you'd live again.",
    description:
      'Set each memory down, then press recall and watch them rush back into your hand. For the moments you’d replay just to say what you didn’t the first time.',
    year: '1991',
    glow: '#e0a84f',
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
    caption: 'Proof, scattered softly',
    tagline: 'Proof that it all happened.',
    description:
      'Receipts, photos and a letter scattered like a shoebox of secret history. Every scrap is a quiet confession of something only you two know.',
    year: '1993',
    glow: '#d98a8a',
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
    caption: 'Nothing left unsaid',
    tagline: 'One unbroken thread.',
    description:
      'Every memory folded into one paper ribbon, so nothing gets left out. Pull it open and everything you held back unfolds in a single breath.',
    year: '1995',
    glow: '#b8c77a',
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
    caption: 'Your story on a reel',
    tagline: 'Your story, frame by frame.',
    description:
      'Each memory becomes a frame on a hand-cranked reel. Turn it slowly and the scenes you never talked about finally get their screening.',
    year: '1978',
    glow: '#e0784a',
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
