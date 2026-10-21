import type { GiftStyle, XsoData } from '@/types/xso';
import { sanitizeScrapbook } from '@/lib/scrapbook';
import { sanitizeAuditLabels, sanitizeFormat } from '@/lib/formats';
import { sanitizeVoiceNote } from '@/lib/soundtracks';
import { sanitizeSong } from '@/lib/spotify';

export const GIFT_STYLES: GiftStyle[] = ['loop', 'scrapbook', 'rewind', 'accordion', 'moviebox'];

export function isGiftStyle(value: string | null | undefined): value is GiftStyle {
  return !!value && (GIFT_STYLES as string[]).includes(value);
}

export function parseGiftStyle(
  value: string | null | undefined,
  fallback: GiftStyle = 'loop',
): GiftStyle {
  return isGiftStyle(value) ? value : fallback;
}

/** A photo card's caption: plain text, one short line. */
export const PHOTO_CAPTION_MAX = 80;

/** One caption per photo at most, trimmed and capped; nothing at all when none were written. */
export function sanitizePhotoCaptions(value: unknown, photos: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const captions = value
    .slice(0, photos)
    .map((c) => (typeof c === 'string' ? c.replace(/\s+/g, ' ').trim().slice(0, PHOTO_CAPTION_MAX) : ''));
  return captions.some(Boolean) ? captions : undefined;
}

export function pickXsoPayload(data: XsoData): XsoData {
  /** Retired styles (e.g. the old hybrid) open as a Loop rather than failing. */
  const giftStyle = parseGiftStyle(data.giftStyle);
  return {
    id: data.id,
    giftStyle,
    billerName: data.billerName,
    customerName: data.customerName,
    occasion: data.occasion,
    timestamp: data.timestamp,
    merchantName: data.merchantName,
    cashier: data.cashier,
    lineItems: data.lineItems,
    subtotal: data.subtotal,
    emotionalTax: data.emotionalTax,
    total: data.total,
    auditMetrics: data.auditMetrics,
    auditLabels: sanitizeAuditLabels(data.auditLabels),
    greenFlags: data.greenFlags,
    redFlags: data.redFlags,
    certifiedStampText: data.certifiedStampText,
    photos: data.photos,
    photoCaptions: sanitizePhotoCaptions(data.photoCaptions, data.photos?.length ?? 0),
    birthdayMessage: data.birthdayMessage,
    voiceNoteUrl: sanitizeVoiceNote(data.voiceNoteUrl),
    scratchOffReward: data.scratchOffReward,
    song: sanitizeSong(data.song),
    scrapbook: giftStyle === 'scrapbook' ? sanitizeScrapbook(data.scrapbook, data) : undefined,
    ...sanitizeFormat(giftStyle, data),
  };
}
