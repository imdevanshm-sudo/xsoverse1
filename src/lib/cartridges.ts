import type { GiftStyle } from '@/types/xso';

export interface CartridgeSpec {
  id: GiftStyle;
  code: string;
  title: string;
  subtitle: string;
  tagline: string;
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
    year: '1989',
    accent: '#3dffc0',
    accentSoft: 'rgba(61, 255, 192, 0.22)',
    labelBg: '#102820',
    ink: '#e8fff6',
  },
  {
    id: 'rewind',
    code: 'XSO-02',
    title: 'REWIND',
    subtitle: 'Time Recall',
    tagline: 'Discard, then press recall.',
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
    year: '1978',
    accent: '#ff7a45',
    accentSoft: 'rgba(255, 122, 69, 0.22)',
    labelBg: '#2a1610',
    ink: '#fff0e8',
  },
];

export const CARTRIDGE_PRICE = '$14.99';

export function getCartridge(id: GiftStyle): CartridgeSpec {
  return CARTRIDGES.find((c) => c.id === id) ?? CARTRIDGES[0];
}
