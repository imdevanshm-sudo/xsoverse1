import { getMockXsoData, svgPhoto, type GiftStyle, type XsoData } from '@/types/xso';

export type ThemeId = 'bestie-roast' | 'anniversary-lore' | 'late-night-receipts';

/** Editable souvenir content a theme prefills (everything except id/style). */
export type ThemeContent = Omit<XsoData, 'id' | 'giftStyle'>;

export interface ThemePack {
  id: ThemeId;
  code: string;
  title: string;
  blurb: string;
  /** Style the deck opens in when the shopper hasn't picked one. */
  defaultStyle: GiftStyle;
  box: { body: string; band: string; ink: string; label: string };
  content: () => ThemeContent;
}

function bestieRoast(): ThemeContent {
  const { id: _id, giftStyle: _style, ...rest } = getMockXsoData();
  return rest;
}

function anniversaryLore(): ThemeContent {
  return {
    billerName: 'Sam',
    customerName: 'Jordan',
    occasion: 'Anniversary',
    timestamp: '06/21/2026 07:30 PM',
    merchantName: 'THE LONG HAUL LTD.',
    cashier: 'Cupid (Overworked)',
    lineItems: [
      { id: 'an-1', qty: '3y', description: 'STEALING THE BLANKET', price: 'FORGIVEN' },
      { id: 'an-2', qty: '1095', description: 'GOOD MORNING TEXTS', price: '$0.00' },
      { id: 'an-3', qty: '12x', description: 'WRONG TURNS, SAME CAR', price: 'WORTH IT' },
      { id: 'an-4', qty: '1', description: 'SHARED PLAYLIST CUSTODY', price: 'JOINT' },
      { id: 'an-5', qty: '∞', description: 'INSIDE JOKES ON FILE', price: 'SEALED' },
    ],
    subtotal: '$1,095.00',
    emotionalTax: '$0.00',
    total: 'FOREVER',
    auditMetrics: { chaos: 41, loyalty: 100, snacking: 83, advice: 67, support: 98 },
    greenFlags: [
      'Saves the last bite for me',
      'Remembers the little dates',
      'Laughs at the same bad movie every time',
    ],
    redFlags: [
      'Hogs the duvet like it pays rent',
      'Says "five minutes" and means forty',
      'Spoils the ending with their face',
    ],
    certifiedStampText: 'CERTIFIED KEEPER ♥',
    photos: [
      svgPhoto('FIRST DATE', '#f6e1d3', '#9e4424'),
      svgPhoto('ROAD TRIP', '#dfe6d3', '#4d5e3f'),
      svgPhoto('RAINY PICNIC', '#e9dcc5', '#6b4f2f'),
      svgPhoto('NEW KEYS', '#f3d9c9', '#8a3a1f'),
    ],
    birthdayMessage:
      "Happy anniversary. Three years of blanket theft, wrong turns and the same four songs — I'd do every single one of them again. Here's to the next chapter of our lore.",
    voiceNoteUrl: undefined,
    scratchOffReward: 'CODE: FOREVER-YOURS • One breakfast in bed, no questions asked',
  };
}

function lateNightReceipts(): ThemeContent {
  return {
    billerName: 'Mia',
    customerName: 'Theo',
    occasion: 'Just Because',
    timestamp: '11/02/2026 03:12 AM',
    merchantName: '3AM DINER & REGRETS',
    cashier: 'The Night Shift',
    lineItems: [
      { id: 'ln-1', qty: '4x', description: 'MOZZARELLA STICKS', price: '$23.96' },
      { id: 'ln-2', qty: '1', description: 'ILL-ADVISED KARAOKE', price: 'LEGEND' },
      { id: 'ln-3', qty: '2h', description: 'PARKING LOT PHILOSOPHY', price: 'DEEP' },
      { id: 'ln-4', qty: '9x', description: '"ONE MORE EPISODE"', price: 'LIES' },
      { id: 'ln-5', qty: '1', description: 'SUNRISE WE DIDN\'T PLAN', price: 'FREE' },
    ],
    subtotal: '$23.96',
    emotionalTax: '$3.00',
    total: 'NO REGRETS',
    auditMetrics: { chaos: 97, loyalty: 92, snacking: 100, advice: 34, support: 90 },
    greenFlags: [
      'Always down for a midnight drive',
      'Knows every 24h spot in the city',
      'Answers the 2am call on ring one',
    ],
    redFlags: [
      'Orders "just fries" then eats mine',
      'Thinks 4am is a reasonable bedtime',
      'Narrates the drive-thru menu',
    ],
    certifiedStampText: 'CERTIFIED NIGHT OWL ☾',
    photos: [
      svgPhoto('NEON DINER', '#221b2e', '#f5b76b'),
      svgPhoto('GAS STATION', '#1d2622', '#9daf88'),
      svgPhoto('KARAOKE', '#2b1d1a', '#e58a5c'),
      svgPhoto('SUNRISE', '#f3d9b6', '#8a3a1f'),
    ],
    birthdayMessage:
      "To my favorite 3am person — for every diner booth, every wrong exit and every sunrise we didn't plan. The receipts are faded, but I kept all of them.",
    voiceNoteUrl: undefined,
    scratchOffReward: 'CODE: NIGHT-OWL-01 • One sunrise drive, snacks on me',
  };
}

export const THEMES: ThemePack[] = [
  {
    id: 'bestie-roast',
    code: 'PACK-01',
    title: 'The Bestie Roast',
    blurb: 'An itemised bill for years of chaos, snacks and therapy you never charged for.',
    defaultStyle: 'loop',
    box: { body: '#c85a32', band: '#f7f4eb', ink: '#2b2825', label: '#fbe9dc' },
    content: bestieRoast,
  },
  {
    id: 'anniversary-lore',
    code: 'PACK-02',
    title: 'Anniversary Lore',
    blurb: 'Three years of blanket theft, wrong turns and the same four songs.',
    defaultStyle: 'loop',
    box: { body: '#6f8160', band: '#f7f4eb', ink: '#2b2825', label: '#eef2e6' },
    content: anniversaryLore,
  },
  {
    id: 'late-night-receipts',
    code: 'PACK-03',
    title: 'Late Night Receipts',
    blurb: 'Diner booths, parking-lot philosophy and sunrises nobody planned.',
    defaultStyle: 'loop',
    box: { body: '#3b3531', band: '#a8845a', ink: '#f7f4eb', label: '#e9d9c1' },
    content: lateNightReceipts,
  },
];

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function getTheme(id: string | null | undefined): ThemePack | null {
  return THEMES.find((theme) => theme.id === id) ?? null;
}
