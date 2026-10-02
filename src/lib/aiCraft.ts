import { newId } from '@/lib/constants';
import { AUDIT_KEYS, FORMAT_LIMITS, halfStar } from '@/lib/formats';
import type { PackContent } from '@/store/useXsoStore';
import type { CardId } from '@/lib/formatCards';
import type { AuditMetrics, GiftStyle } from '@/types/xso';

export const RELATIONSHIPS = ['Best Friend', 'Partner', 'Sibling', 'Situationship'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const CRAFT_TONES = [
  { id: 'roast', label: 'Unhinged Roast', emoji: '🌶️' },
  { id: 'soft', label: 'Wholesome & Soft', emoji: '💖' },
  { id: 'chaos', label: 'Inside Joke Chaos', emoji: '🌀' },
] as const;
export type CraftTone = (typeof CRAFT_TONES)[number]['id'];

export const ADJUSTMENTS = [
  { id: 'sweeter', label: 'Make it sweeter', emoji: '🥹' },
  { id: 'funnier', label: 'Make it funnier', emoji: '😂' },
] as const;
export type Adjustment = (typeof ADJUSTMENTS)[number]['id'];

export const CRAFT_LIMITS = { name: 40, memory: 600, minMemory: 8, question: 120 } as const;

export interface QuestionsResponse {
  questions: string[];
  source: 'ai' | 'template';
}

export interface CraftInput {
  recipientName: string;
  relationship: Relationship;
  tone: CraftTone;
  memoryText: string;
  format: GiftStyle;
  /** The cards the sender kept, so the copy lands where it will be seen. */
  cards?: CardId[];
  /** The AI question the memory answers, if one was picked. */
  question?: string;
  adjust?: Adjustment;
}

type Rating = { label: string; stars: number };

/** The generator's output, already clipped to what the souvenir can show. */
export interface CraftedStory {
  storeName: string;
  cashier: string;
  occasion: string;
  /** MM/DD/YYYY */
  receiptDate: string;
  lineItems: { qty: string; description: string; price: string }[];
  total: string;
  audit: Record<keyof AuditMetrics, Rating>;
  greenFlags: string[];
  redFlags: string[];
  stampText: string;
  letter: string;
  scratchOffReward: string;
  scrapbook?: {
    secretNote: string;
    polaroidCaption: string;
    ticketTitle: string;
    ticketPlace: string;
    ticketWhen: string;
  };
  accordion?: { sentiment: string };
  rewind?: { sideA: string; sideB: string; review: string };
  moviebox?: {
    scenes: { title: string; timestamp: string; description: string }[];
    verdict: string;
    stars: number;
  };
}

export interface CraftResponse {
  story: CraftedStory;
  /** `template` when no model was reachable and the story was assembled from the answers. */
  source: 'ai' | 'template';
}

const MONEY = /^\$?(\d{1,6}(?:\.\d{1,2})?)$/;

/** Maps a crafted story onto the draft, keeping photos, stills and toggles the user already set. */
export function storyToPatch(story: CraftedStory, base: PackContent): Partial<PackContent> {
  const time = base.timestamp.split(' ').slice(1).join(' ') || '02:47 AM';
  const amounts = story.lineItems
    .map((item) => item.price.trim().match(MONEY)?.[1])
    .filter((v): v is string => Boolean(v));
  const subtotal = amounts.length
    ? `$${amounts.reduce((sum, v) => sum + Number(v), 0).toFixed(2)}`
    : base.subtotal;

  const patch: Partial<PackContent> = {
    merchantName: story.storeName,
    cashier: story.cashier,
    occasion: story.occasion,
    timestamp: `${story.receiptDate} ${time}`,
    lineItems: story.lineItems.map((item) => ({ id: newId(), ...item })),
    subtotal,
    total: story.total,
    auditMetrics: Object.fromEntries(
      AUDIT_KEYS.map((key) => [key, story.audit[key].stars * 20]),
    ) as unknown as AuditMetrics,
    auditLabels: Object.fromEntries(AUDIT_KEYS.map((key) => [key, story.audit[key].label])),
    greenFlags: story.greenFlags,
    redFlags: story.redFlags,
    certifiedStampText: story.stampText,
    birthdayMessage: story.letter,
    scratchOffReward: story.scratchOffReward,
  };

  if (story.scrapbook) patch.scrapbook = { ...base.scrapbook, ...story.scrapbook };
  if (story.accordion) patch.accordion = { ...base.accordion, ...story.accordion };
  if (story.rewind) {
    patch.rewind = { ...base.rewind, ...story.rewind, tapeDate: story.receiptDate };
  }
  if (story.moviebox) {
    const { scenes, verdict } = story.moviebox;
    const stars = halfStar(story.moviebox.stars);
    patch.moviebox = {
      stars,
      scenes: scenes.map((scene, i) => ({
        title: scene.title,
        caption: (i === 1
          ? `Rated ${stars} out of 5. ${verdict}`
          : `${scene.timestamp} · ${scene.description}`
        ).slice(0, FORMAT_LIMITS.sceneCaption),
        image: base.moviebox.scenes[i]?.image ?? '',
      })),
    };
  }
  return patch;
}
