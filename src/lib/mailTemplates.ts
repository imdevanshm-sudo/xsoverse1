import { SAMPLE_BRAND } from '@/lib/brand';

/** Shared XSOverse palette for transactional mail (inline only). */
export const MAIL_INK = {
  bg: '#1a0f14',
  card: '#24141c',
  paper: '#fff7fb',
  paperInk: '#2d1b22',
  paperMuted: '#9a6b7b',
  accent: '#ec4899',
  accentSoft: '#f9a8d4',
  text: '#fdf2f8',
  muted: '#c99aae',
  warnBg: '#3b1a24',
  warnBorder: '#be185d',
  warnText: '#fce7f3',
  line: '#3d2430',
} as const;

export interface MailReceipt {
  formatName: string;
  addOns: string;
  amountPaid: string;
  orderNumber: string;
  date: string;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
  preheader: string;
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function preheaderHidden(text: string) {
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(text)}${'&nbsp;'.repeat(40)}</div>`;
}

function brandHeader(logoUrl: string | null) {
  const mark = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="XSO" style="display:block;border:0;width:48px;height:48px" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-0.02em;color:${MAIL_INK.text};line-height:1">XSO</div>`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:0 0 20px">
          ${mark}
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${MAIL_INK.accentSoft};margin-top:10px">
            <span style="font-weight:700;color:${MAIL_INK.accentSoft}">XSOVERSE</span>
          </div>
        </td>
      </tr>
    </table>`;
}

/** Outlook-safe primary / secondary CTA. Min height ~48px. */
function bulletproofButton(options: {
  href: string;
  label: string;
  variant: 'primary' | 'secondary';
}) {
  const bg = options.variant === 'primary' ? MAIL_INK.accent : 'transparent';
  const color = options.variant === 'primary' ? '#ffffff' : MAIL_INK.accentSoft;
  const border =
    options.variant === 'primary'
      ? MAIL_INK.accent
      : MAIL_INK.accentSoft;
  const href = escapeHtml(options.href);
  const label = escapeHtml(options.label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" strokecolor="${border}" fillcolor="${options.variant === 'primary' ? bg : MAIL_INK.card}">
            <w:anchorlock/>
            <center style="color:${color};font-family:Georgia,serif;font-size:17px;font-weight:700;">${label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${href}"
             style="display:inline-block;min-height:48px;line-height:48px;padding:0 28px;box-sizing:border-box;
                    background:${bg};color:${color};border:2px solid ${border};border-radius:999px;
                    font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;
                    text-decoration:none;text-align:center;width:100%;max-width:320px;-webkit-text-size-adjust:none">
            ${label}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

function receiptBlock(receipt: MailReceipt) {
  const rows: Array<[string, string]> = [
    ['Format', receipt.formatName],
    ['Add-ons', receipt.addOns],
    ['Amount paid', receipt.amountPaid],
    ['Order', receipt.orderNumber],
    ['Date', receipt.date],
  ];
  const body = rows
    .map(
      ([label, value], i) => `
      <tr>
        <td style="padding:10px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MAIL_INK.paperMuted};border-top:${i === 0 ? '0' : `1px dashed ${MAIL_INK.line}`}">${escapeHtml(label)}</td>
        <td align="right" style="padding:10px 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:${MAIL_INK.paperInk};border-top:${i === 0 ? '0' : `1px dashed ${MAIL_INK.line}`}">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="background:${MAIL_INK.paper};border-radius:12px;margin:24px 0 0">
      <tr>
        <td style="padding:18px 20px">
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${MAIL_INK.accent};margin-bottom:8px">Receipt</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${body}
          </table>
        </td>
      </tr>
    </table>`;
}

function footer(options: {
  giftId: string;
  supportEmail: string;
  extra?: string;
}) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px">
      <tr>
        <td style="border-top:1px solid ${MAIL_INK.line};padding-top:18px;font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:1.5;color:${MAIL_INK.muted};text-align:center">
          ${options.extra ? `<div style="margin-bottom:10px">${options.extra}</div>` : ''}
          <div>Questions? Reply to this email or write <a href="mailto:${escapeHtml(options.supportEmail)}" style="color:${MAIL_INK.accentSoft};text-decoration:underline">${escapeHtml(options.supportEmail)}</a></div>
          <div style="margin-top:8px;letter-spacing:0.16em;text-transform:uppercase;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;color:${MAIL_INK.muted}">XSOVERSE · ${escapeHtml(SAMPLE_BRAND.domain)}</div>
          <div style="margin-top:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;color:#7a5262">Gift ID ${escapeHtml(options.giftId)}</div>
        </td>
      </tr>
    </table>`;
}

function shell(options: {
  preheader: string;
  logoUrl: string | null;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>XSO</title>
</head>
<body style="margin:0;padding:0;background:${MAIL_INK.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  ${preheaderHidden(options.preheader)}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${MAIL_INK.bg}">
    <tr>
      <td align="center" style="padding:28px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:${MAIL_INK.card};border-radius:20px;border:1px solid ${MAIL_INK.line}">
          <tr>
            <td style="padding:28px 24px 32px">
              ${brandHeader(options.logoUrl)}
              ${options.body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderBuyerGiftReady(options: {
  recipientName: string;
  manageUrl: string;
  giftUrl: string;
  giftId: string;
  receipt: MailReceipt;
  supportEmail: string;
  logoUrl?: string | null;
}): RenderedMail {
  const who = options.recipientName.trim() || 'them';
  const subject = `Your XSO for ${who} is sealed 💌`;
  const preheader = `It's ready. Preview it first, then send it to ${who} whenever you like.`;
  const heading = `Your keepsake for ${who} is sealed.`;
  const bodyCopy = `It's ready. Preview it first, then send it to ${who} whenever you like.`;

  const html = shell({
    preheader,
    logoUrl: options.logoUrl ?? null,
    body: `
      <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;font-weight:600;color:${MAIL_INK.text};text-align:center">
        ${escapeHtml(heading)}
      </h1>
      <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:${MAIL_INK.muted};text-align:center">
        ${escapeHtml(bodyCopy)}
      </p>
      ${bulletproofButton({ href: options.manageUrl, label: 'Preview & send it', variant: 'primary' })}
      ${bulletproofButton({ href: options.giftUrl, label: 'Copy gift link', variant: 'secondary' })}
      <p style="margin:4px 0 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:${MAIL_INK.muted};text-align:center;word-break:break-all">
        Gift link:<br />
        <a href="${escapeHtml(options.giftUrl)}" style="color:${MAIL_INK.accentSoft};text-decoration:underline">${escapeHtml(options.giftUrl)}</a>
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 0;background:${MAIL_INK.warnBg};border:1px solid ${MAIL_INK.warnBorder};border-radius:12px">
        <tr>
          <td style="padding:14px 16px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.45;color:${MAIL_INK.warnText}">
            <strong style="display:block;margin-bottom:4px;letter-spacing:0.04em;text-transform:uppercase;font-size:11px;font-family:ui-monospace,Menlo,Consolas,monospace">Keep this private</strong>
            Only share the gift link. Your dashboard link is private to you; anyone who has it can edit and resend your keepsake.
          </td>
        </tr>
      </table>
      ${receiptBlock(options.receipt)}
      ${footer({ giftId: options.giftId, supportEmail: options.supportEmail })}
    `,
  });

  const text = [
    heading,
    '',
    bodyCopy,
    '',
    `Preview & send it (private dashboard): ${options.manageUrl}`,
    `Gift link (share this): ${options.giftUrl}`,
    '',
    'WARNING: Only share the gift link. Your dashboard link is private to you; anyone who has it can edit and resend your keepsake.',
    '',
    'Receipt',
    `Format: ${options.receipt.formatName}`,
    `Add-ons: ${options.receipt.addOns}`,
    `Amount paid: ${options.receipt.amountPaid}`,
    `Order: ${options.receipt.orderNumber}`,
    `Date: ${options.receipt.date}`,
    '',
    `Support: ${options.supportEmail}`,
    `XSOVERSE · ${SAMPLE_BRAND.domain}`,
    `Gift ID: ${options.giftId}`,
  ].join('\n');

  return { subject, html, text, preheader };
}

export function renderReceiverGiftLink(options: {
  recipientName: string;
  senderName: string;
  giftUrl: string;
  giftId: string;
  supportEmail: string;
  reportUrl: string;
  logoUrl?: string | null;
}): RenderedMail {
  const fromName = options.senderName.trim() || 'Someone';
  const toName = options.recipientName.trim() || 'you';
  const subject = `${fromName} sent you a keepsake`;
  const preheader = `${fromName} made you something to open when you have a quiet minute.`;

  const html = shell({
    preheader,
    logoUrl: options.logoUrl ?? null,
    body: `
      <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;font-weight:600;color:${MAIL_INK.text};text-align:center">
        ${escapeHtml(fromName)} sent you a keepsake
      </h1>
      <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:${MAIL_INK.muted};text-align:center">
        Hi ${escapeHtml(toName)} — open it when you have a quiet minute.
      </p>
      ${bulletproofButton({ href: options.giftUrl, label: 'Open it', variant: 'primary' })}
      <p style="margin:8px 0 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:${MAIL_INK.muted};text-align:center;word-break:break-all">
        <a href="${escapeHtml(options.giftUrl)}" style="color:${MAIL_INK.accentSoft};text-decoration:underline">${escapeHtml(options.giftUrl)}</a>
      </p>
      ${footer({
        giftId: options.giftId,
        supportEmail: options.supportEmail,
        extra: `<a href="${escapeHtml(options.reportUrl)}" style="color:${MAIL_INK.muted};text-decoration:underline">Didn't expect this? Report</a>`,
      })}
    `,
  });

  const text = [
    `${fromName} sent you a keepsake`,
    '',
    `Hi ${toName} — open it when you have a quiet minute.`,
    '',
    `Open it: ${options.giftUrl}`,
    '',
    `Didn't expect this? Report: ${options.reportUrl}`,
    '',
    `Support: ${options.supportEmail}`,
    `XSOVERSE · ${SAMPLE_BRAND.domain}`,
    `Gift ID: ${options.giftId}`,
  ].join('\n');

  return { subject, html, text, preheader };
}
