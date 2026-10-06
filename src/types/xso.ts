export interface LineItem {
  id: string;
  qty: string;
  description: string;
  price: string;
}

export interface AuditMetrics {
  chaos: number;
  loyalty: number;
  snacking: number;
  advice: number;
  support: number;
}

export type GiftStyle = 'loop' | 'scrapbook' | 'rewind' | 'accordion' | 'moviebox';

export const SCRAPBOOK_ELEMENTS = [
  'receipt',
  'polaroids',
  'sticky',
  'letter',
  'ticket',
  'voice',
] as const;

export type ScrapbookElement = (typeof SCRAPBOOK_ELEMENTS)[number];

export type StickyColor = 'pink' | 'amber' | 'cream';

/** Which artifacts sit on the scrapbook desk, plus the copy only the desk uses. */
export interface ScrapbookLayers {
  elements: ScrapbookElement[];
  polaroidCaption: string;
  secretNote: string;
  stickyColor: StickyColor;
  ticketTitle: string;
  ticketPlace: string;
  ticketWhen: string;
  /** Normalized open.spotify.com link, or empty. */
  songUrl: string;
}

export const LOOP_CARDS = ['receipt', 'audit', 'photos', 'letter'] as const;
export type LoopCard = (typeof LOOP_CARDS)[number];

/** Loop: which of the four stack cards are dealt. */
export interface LoopLayers {
  cards: LoopCard[];
}

export type RewindCard = LoopCard | 'liner';

/** Rewind: the cassette label and the liner-notes card. */
export interface RewindLayers {
  sideA: string;
  sideB: string;
  tapeDate: string;
  review: string;
  /** Absent on older gifts, which show every card. */
  cards?: RewindCard[];
  /** `track:<id>`, a stored upload or voice note (`storage:…`), an inline clip, or '' for silence. */
  soundtrack?: string;
  /** The soundtrack is the sender's own voice note rather than music. */
  voice?: boolean;
  /** What the voice note says, for anyone who can't or would rather not listen. */
  transcript?: string;
  /** Signed, expiring URL for a stored soundtrack: added when the gift is opened, never saved. */
  soundtrackUrl?: string;
}

/** Accordion: the handwritten line under the bill's total. */
export interface AccordionLayers {
  sentiment: string;
  cards?: LoopCard[];
}

export interface MovieScene {
  title: string;
  caption: string;
  /** Optional still for the frame (data URL), or empty. */
  image: string;
}

/** Movie Box: four scenes and the critic's score. */
export interface MovieLayers {
  scenes: MovieScene[];
  stars: number;
  /** `track:<id>` for a bundled soundtrack, an uploaded audio data URL, or '' for silence. */
  soundtrack?: string;
  cards?: LoopCard[];
}

export interface XsoData {
  id: string;
  giftStyle: GiftStyle;
  billerName: string;
  customerName: string;
  occasion: string;
  timestamp: string;
  merchantName: string;
  cashier: string;
  lineItems: LineItem[];
  subtotal: string;
  emotionalTax: string;
  total: string;
  auditMetrics: AuditMetrics;
  /** Custom names for the audit categories (e.g. from the AI craft); absent means the defaults. */
  auditLabels?: Partial<Record<keyof AuditMetrics, string>>;
  greenFlags: string[];
  redFlags: string[];
  certifiedStampText: string;
  photos: string[];
  birthdayMessage: string;
  voiceNoteUrl?: string;
  scratchOffReward: string;
  /** Absent on gifts made before modular scrapbooks; see `resolveScrapbook`. */
  scrapbook?: ScrapbookLayers;
  loop?: LoopLayers;
  rewind?: RewindLayers;
  accordion?: AccordionLayers;
  moviebox?: MovieLayers;
}

export type XsoSideIndex = 0 | 1 | 2 | 3;

export const XSO_SIDES = [
  { index: 0 as const, emoji: '🧾', label: 'Receipt' },
  { index: 1 as const, emoji: '📊', label: 'Audit' },
  { index: 2 as const, emoji: '📸', label: 'Photo Strip' },
  { index: 3 as const, emoji: '🎁', label: 'Letter & Scratch-off' },
] as const;

export function svgPhoto(label: string, bg: string, fg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320">
    <rect width="240" height="320" fill="${bg}"/>
    <rect x="16" y="16" width="208" height="248" fill="${fg}" opacity="0.15"/>
    <text x="120" y="160" text-anchor="middle" fill="${fg}" font-family="monospace" font-size="18" font-weight="700">${label}</text>
    <text x="120" y="290" text-anchor="middle" fill="${fg}" font-family="monospace" font-size="12" opacity="0.7">Y2K • 2000</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** The theme's stand-in cards (from `svgPhoto`), as opposed to a photo the sender uploaded. */
export function isPlaceholderPhoto(src: string): boolean {
  return src.startsWith('data:image/svg');
}

export function getMockXsoData(): XsoData {
  return {
    id: 'xso-mock-001',
    giftStyle: 'loop',
    billerName: 'Sarah',
    customerName: 'Alex',
    occasion: 'Birthday Roast',
    timestamp: '03/15/2026 02:47 AM',
    merchantName: 'EMOTIONAL DAMAGE CO.',
    cashier: 'Trauma Bonding',
    lineItems: [
      { id: 'li-1', qty: '42x', description: 'LATE-NIGHT BOBA RUNS', price: '$69.00' },
      { id: 'li-2', qty: '150h', description: 'BEING YOUR THERAPIST', price: 'UNPAID' },
      { id: 'li-3', qty: '3x', description: 'ALMOST GOT ARRESTED', price: 'LORE' },
      { id: 'li-4', qty: '247x', description: 'TIKTOKS SENT AT 2AM', price: 'CHAOS' },
      { id: 'li-5', qty: '1', description: 'SHARED BRAIN CELL FEE', price: 'FRAGILE' },
      { id: 'li-6', qty: '∞', description: '100% LOYALTY SURCHARGE', price: 'OWED' },
    ],
    subtotal: '$420.00',
    emotionalTax: '$69.00',
    total: 'PRICELESS',
    auditMetrics: {
      chaos: 94,
      loyalty: 99,
      snacking: 88,
      advice: 76,
      support: 100,
    },
    greenFlags: [
      'Shows up with snacks unprompted',
      'Remembers every inside joke',
      'Defends you in the group chat',
    ],
    redFlags: [
      'Sends voice notes at 3am',
      'Steals your fries then denies it',
      'Plans chaos then acts shocked',
    ],
    certifiedStampText: 'CERTIFIED BESTIE ★',
    photos: [
      svgPhoto('MISSED THE TRAIN', '#ffe4f1', '#c1177a'),
      svgPhoto('2AM ROAD TRIP', '#e8ff4a', '#1a1814'),
      svgPhoto('BEACH FRIES', '#071428', '#00f5ff'),
      svgPhoto('AIRPORT FLOOR', '#ff4db8', '#ffffff'),
    ],
    birthdayMessage:
      "Happy birthday, chaos goblin. Another year of lore, late-night runs, and unpaid emotional labor. Don't change — or do, and I'll still be here with snacks and receipts.",
    voiceNoteUrl: undefined,
    scratchOffReward: 'CODE: BESTIE-4-LIFE • One free emergency pep talk',
  };
}
