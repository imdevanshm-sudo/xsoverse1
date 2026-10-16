import { Resend } from 'resend';
import { manageKey } from '@/lib/manageKey';
import { managePath, viewPath } from '@/lib/giftLinks';
import { getAppUrl } from '@/lib/lemon';

/** Shown as the From name; the address must be verified in Resend for xsoverse.app. */
const FROM = process.env.MAIL_FROM?.trim() || 'XSO <xso@xsoverse.app>';

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Loose but practical; rejects empty / obvious junk before hitting Resend. */
export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim()) && value.trim().length <= 254;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function appOrigin(requestUrl?: string) {
  return getAppUrl(requestUrl);
}

/**
 * After checkout: the buyer (sender) gets both the private manage dashboard and the
 * recipient view link. Failures are thrown so callers can log without failing the webhook.
 */
export async function sendBuyerGiftReady(options: {
  to: string;
  giftId: string;
  recipientName: string;
  senderName?: string;
  requestUrl?: string;
}): Promise<{ id: string } | null> {
  const client = resend();
  if (!client) return null;

  const origin = appOrigin(options.requestUrl);
  const manageUrl = `${origin}${managePath(options.giftId, manageKey(options.giftId))}`;
  const giftUrl = `${origin}${viewPath(options.giftId)}`;
  const who = options.recipientName.trim() || 'them';
  const subject = `Your XSO for ${who} is ready`;

  const html = `
    <div style="font-family:Georgia,serif;color:#2d1b22;line-height:1.5;max-width:520px">
      <p style="font-size:22px;margin:0 0 12px">Your keepsake is sealed.</p>
      <p style="margin:0 0 16px;color:#5a3a48">
        ${escapeHtml(who)}'s gift is ready to send. Keep your dashboard private —
        share only the gift link.
      </p>
      <p style="margin:0 0 8px">
        <a href="${escapeHtml(manageUrl)}" style="color:#be185d">Open your dashboard</a>
        <span style="color:#9a6b7b"> — manage, preview, and email them</span>
      </p>
      <p style="margin:0 0 16px">
        <a href="${escapeHtml(giftUrl)}" style="color:#be185d">Gift link for ${escapeHtml(who)}</a>
        <span style="color:#9a6b7b"> — what they open</span>
      </p>
      <p style="font-size:12px;color:#9a6b7b;margin:24px 0 0">
        Gift ID ${escapeHtml(options.giftId)} · XSOVERSE
      </p>
    </div>
  `;

  const text = [
    `Your keepsake for ${who} is sealed.`,
    '',
    `Dashboard (private): ${manageUrl}`,
    `Gift link (share this): ${giftUrl}`,
    '',
    `Gift ID: ${options.giftId}`,
  ].join('\n');

  const { data, error } = await client.emails.send({
    from: FROM,
    to: options.to.trim(),
    subject,
    html,
    text,
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
  const fromName = options.senderName.trim() || 'Someone who loves you';
  const toName = options.recipientName.trim() || 'you';
  const subject = `${fromName} sent you something`;

  const html = `
    <div style="font-family:Georgia,serif;color:#2d1b22;line-height:1.5;max-width:520px">
      <p style="font-size:22px;margin:0 0 12px">Hi ${escapeHtml(toName)},</p>
      <p style="margin:0 0 16px;color:#5a3a48">
        ${escapeHtml(fromName)} made you a keepsake. Open it when you have a quiet minute.
      </p>
      <p style="margin:0 0 16px">
        <a href="${escapeHtml(giftUrl)}"
           style="display:inline-block;background:#ec4899;color:#fff;text-decoration:none;
                  padding:14px 22px;border-radius:999px;font-family:system-ui,sans-serif;font-weight:600">
          Open your gift
        </a>
      </p>
      <p style="font-size:12px;color:#9a6b7b;margin:24px 0 0">
        Sent with XSO · xsoverse.app
      </p>
    </div>
  `;

  const text = [
    `Hi ${toName},`,
    '',
    `${fromName} made you a keepsake.`,
    `Open it here: ${giftUrl}`,
    '',
    'Sent with XSO · xsoverse.app',
  ].join('\n');

  const { data, error } = await client.emails.send({
    from: FROM,
    to: options.to.trim(),
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message);
  return data;
}
