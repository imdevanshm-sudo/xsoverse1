import type { AuditMetrics, LineItem, XsoData } from '@/types/xso';

const METRICS: (keyof AuditMetrics)[] = ['chaos', 'loyalty', 'snacking', 'advice', 'support'];

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const list = <T>(value: unknown, keep: (item: unknown) => item is T): T[] =>
  Array.isArray(value) ? value.filter(keep) : [];
const isString = (item: unknown): item is string => typeof item === 'string';
const isLineItem = (item: unknown): item is LineItem =>
  typeof item === 'object' && item !== null && typeof (item as LineItem).description === 'string';

/**
 * Stored gifts can predate fields the formats now read unconditionally; one missing array
 * or metric throws mid-render and blanks the recipient's screen. Fill gaps with empty values,
 * never invented content.
 */
export function completeXso(raw: XsoData): XsoData {
  const source = (raw ?? {}) as Partial<XsoData>;
  const metrics = (source.auditMetrics ?? {}) as Partial<AuditMetrics>;
  return {
    ...source,
    id: text(source.id),
    giftStyle: source.giftStyle ?? 'loop',
    billerName: text(source.billerName),
    customerName: text(source.customerName),
    occasion: text(source.occasion),
    timestamp: text(source.timestamp),
    merchantName: text(source.merchantName),
    cashier: text(source.cashier),
    lineItems: list(source.lineItems, isLineItem),
    subtotal: text(source.subtotal),
    emotionalTax: text(source.emotionalTax),
    total: text(source.total),
    auditMetrics: Object.fromEntries(
      METRICS.map((key) => [key, Number.isFinite(metrics[key]) ? Number(metrics[key]) : 0]),
    ) as unknown as AuditMetrics,
    greenFlags: list(source.greenFlags, isString),
    redFlags: list(source.redFlags, isString),
    certifiedStampText: text(source.certifiedStampText),
    photos: list(source.photos, isString),
    birthdayMessage: text(source.birthdayMessage),
    scratchOffReward: text(source.scratchOffReward),
  };
}
