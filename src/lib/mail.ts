import { Resend } from 'resend';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { manageKey } from '@/lib/manageKey';
import { managePath, viewPath } from '@/lib/giftLinks';
import { getAppUrl } from '@/lib/lemon';
import { ADD_ONS, formatPrice, quote, type CurrencyCode } from '@/lib/pricing';
import {
  renderBuyerGiftReady,
  renderReceiverGiftLink,
  type MailReceipt,
} from '@/lib/mailTemplates';
import type { GiftStyle } from '@/types/xso';
import type { AddOnId } from '@/lib/pricing';

/** From display name must stay "XSO"; address must be on the verified domain. */
const FROM = process.env.MAIL_FROM?.trim() || 'XSO <xso@xsoverse.app>';
const SUPPORT = process.env.MAIL_REPLY_TO?.trim() || 'xsoverse@gmail.com';

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function mailSupportAddress(): string {
  return SUPPORT;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Loose but practical; rejects empty / obvious junk before hitting Resend. */
export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim()) && value.trim().length <= 254;
}

function appOrigin(requestUrl?: string) {
  return getAppUrl(requestUrl);
}

function logoUrl(origin: string) {
  return `${origin}/brand/xso-mark.svg`;
}

function reportUrl(origin: string, giftId: string) {
  return `${origin}/report?gift=${encodeURIComponent(giftId)}`;
}

export function formatAddOnsLabel(ids: readonly AddOnId[] | undefined): string {
  if (!ids?.length) return 'None';
  return ids.map((id) => ADD_ONS[id]?.label ?? id).join(', ');
}

export function formatMailDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

/** Build a receipt block from gift + optional Lemon order fields. */
export function buildMailReceipt(options: {
  style: GiftStyle;
  addOns?: readonly AddOnId[];
  amountPaid?: string | null;
  orderNumber?: string | null;
  dateIso?: string | null;
  currency?: CurrencyCode;
}): MailReceipt {
  const styleName = displayTitle(getCartridge(options.style));
  const formatName = `The ${styleName}`;
  const addOns = formatAddOnsLabel(options.addOns);
  let amountPaid = options.amountPaid?.trim() || '';
  if (!amountPaid) {
    const q = quote({ style: options.style, addOns: options.addOns, currency: options.currency });
    amountPaid = formatPrice(q.total, q.currency);
  }
  return {
    formatName,
    addOns,
    amountPaid,
    orderNumber: options.orderNumber?.trim() || '—',
    date: formatMailDate(options.dateIso),
  };
}

/**
 * After checkout: the buyer gets the private manage dashboard and the recipient view link.
 * Failures are thrown so callers can log without failing the webhook.
 */
export async function sendBuyerGiftReady(options: {
  to: string;
  giftId: string;
  recipientName: string;
  senderName?: string;
  style: GiftStyle;
  addOns?: readonly AddOnId[];
  amountPaid?: string | null;
  orderNumber?: string | null;
  dateIso?: string | null;
  currency?: CurrencyCode;
  requestUrl?: string;
}): Promise<{ id: string } | null> {
  const client = resend();
  if (!client) return null;

  const origin = appOrigin(options.requestUrl);
  const manageUrl = `${origin}${managePath(options.giftId, manageKey(options.giftId))}`;
  const giftUrl = `${origin}${viewPath(options.giftId)}`;
  const mail = renderBuyerGiftReady({
    recipientName: options.recipientName,
    manageUrl,
    giftUrl,
    giftId: options.giftId,
    receipt: buildMailReceipt(options),
    supportEmail: SUPPORT,
    logoUrl: logoUrl(origin),
  });

  const { data, error } = await client.emails.send({
    from: FROM,
    to: options.to.trim(),
    replyTo: SUPPORT,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: {
      'X-Entity-Ref-ID': options.giftId,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Optional: the buyer asks us to email the recipient the view link only.
 * Never includes the manage key.
 */
export async function sendReceiverGiftLink(options: {
  to: string;
  giftId: string;
  recipientName: string;
  senderName: string;
  requestUrl?: string;
}): Promise<{ id: string } | null> {
  const client = resend();
  if (!client) return null;

  const origin = appOrigin(options.requestUrl);
  const giftUrl = `${origin}${viewPath(options.giftId)}`;
  const mail = renderReceiverGiftLink({
    recipientName: options.recipientName,
    senderName: options.senderName,
    giftUrl,
    giftId: options.giftId,
    supportEmail: SUPPORT,
    reportUrl: reportUrl(origin, options.giftId),
    logoUrl: logoUrl(origin),
  });

  const { data, error } = await client.emails.send({
    from: FROM,
    to: options.to.trim(),
    replyTo: SUPPORT,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: {
      'X-Entity-Ref-ID': options.giftId,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Preview helpers for /dev/email-preview (no send). */
export function previewBuyerGiftReady(options: {
  origin: string;
  giftId: string;
  recipientName: string;
  style: GiftStyle;
  addOns?: readonly AddOnId[];
  amountPaid?: string;
  orderNumber?: string;
  dateIso?: string;
}) {
  const manageUrl = `${options.origin}${managePath(options.giftId, manageKey(options.giftId))}`;
  const giftUrl = `${options.origin}${viewPath(options.giftId)}`;
  return renderBuyerGiftReady({
    recipientName: options.recipientName,
    manageUrl,
    giftUrl,
    giftId: options.giftId,
    receipt: buildMailReceipt(options),
    supportEmail: SUPPORT,
    logoUrl: logoUrl(options.origin),
  });
}

export function previewReceiverGiftLink(options: {
  origin: string;
  giftId: string;
  recipientName: string;
  senderName: string;
}) {
  return renderReceiverGiftLink({
    recipientName: options.recipientName,
    senderName: options.senderName,
    giftUrl: `${options.origin}${viewPath(options.giftId)}`,
    giftId: options.giftId,
    supportEmail: SUPPORT,
    reportUrl: reportUrl(options.origin, options.giftId),
    logoUrl: logoUrl(options.origin),
  });
}
