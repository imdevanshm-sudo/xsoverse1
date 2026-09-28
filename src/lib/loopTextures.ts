import type { XsoData } from '@/types/xso';
import { formatReceiptQty, RECEIPT_MAX_ITEMS } from '@/lib/receiptFormat';

const PAPER = '#fcfaf2';

/** One 120px grain tile (2 octaves, stitched) repeated across every card. */
const GRAIN_DEFS = `
      <filter id="grain" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 0.22 0" in="n"/>
      </filter>
      <pattern id="grain-tile" width="120" height="120" patternUnits="userSpaceOnUse">
        <rect width="120" height="120" filter="url(#grain)"/>
      </pattern>`;

/** Shared defs: paper grain + torn edge for SVG memory cards. */
function paperDefs(id: string) {
  return `
    <defs>
      ${GRAIN_DEFS}
      <clipPath id="torn-${id}">
        <path d="M8,14 L28,4 L52,12 L78,3 L104,11 L132,2 L158,10 L186,4 L214,12 L242,3 L270,11 L298,2 L326,10 L354,4 L382,12 L410,3 L438,11 L466,2 L494,10 L522,4 L548,12 L572,5 L592,14 L592,806 L572,816 L548,808 L522,816 L494,807 L466,816 L438,808 L410,816 L382,807 L354,816 L326,808 L298,816 L270,807 L242,816 L214,808 L186,816 L158,807 L132,816 L104,808 L78,816 L52,807 L28,816 L8,806 Z"/>
      </clipPath>
    </defs>`;
}

function grainOverlay() {
  return `<rect width="600" height="820" fill="url(#grain-tile)" opacity="0.4"/>`;
}

function coffeeRing(cx: number, cy: number) {
  return `
    <ellipse cx="${cx}" cy="${cy}" rx="58" ry="50" fill="none" stroke="#8b5a2b" stroke-width="9" opacity="0.2"/>
    <ellipse cx="${cx}" cy="${cy}" rx="42" ry="36" fill="none" stroke="#a67c3d" stroke-width="4" opacity="0.14"/>
    <ellipse cx="${cx + 6}" cy="${cy - 4}" rx="28" ry="24" fill="none" stroke="#6e4520" stroke-width="2" opacity="0.1"/>`;
}

function dateStamp(label: string, x: number, y: number, rot = -12) {
  return `
    <g transform="translate(${x} ${y}) rotate(${rot})">
      <circle r="46" fill="none" stroke="#8b3a3a" stroke-width="3.5" opacity="0.55"/>
      <circle r="38" fill="none" stroke="#8b3a3a" stroke-width="1.2" opacity="0.35" stroke-dasharray="3 4"/>
      <text text-anchor="middle" y="-4" style="font:700 9px monospace;fill:#8b3a3a;opacity:.7;letter-spacing:1px">${escapeXml(label)}</text>
      <text text-anchor="middle" y="12" style="font:700 11px monospace;fill:#8b3a3a;opacity:.75">FILED</text>
    </g>`;
}

function handNote(text: string, x: number, y: number, rot: number, color = '#2a4a7a') {
  return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" style="font:italic 22px 'Segoe Print','Bradley Hand',cursive;fill:${color};opacity:.78">${escapeXml(text)}</text>`;
}

function dogEar() {
  return `
    <path d="M562 0 L600 0 L600 38 Z" fill="#e8e2d4"/>
    <path d="M562 0 L600 38 L562 38 Z" fill="#d4cec0" opacity="0.9"/>
    <path d="M562 0 L562 38 L600 38" fill="none" stroke="#000" stroke-opacity="0.08"/>`;
}

const MONO = "'Courier New', Courier, monospace";
/** Courier New advances exactly 0.6em per glyph, so row widths are computable. */
const ROW_FONT = 17;
const QTY_RIGHT = 84;
const DESC_LEFT = 98;
const AMOUNT_RIGHT = 566;

function ellipsize(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}

/** Qty · description · dot leaders · right-aligned amount. */
function receiptRow(
  qty: string | null,
  description: string,
  price: string,
  y: number,
  { size = ROW_FONT, cls = 'row', left = DESC_LEFT } = {},
) {
  const charW = size * 0.6;
  const amount = price.trim().slice(0, 12);
  const amountLeft = AMOUNT_RIGHT - amount.length * charW;
  const maxDesc = Math.max(4, Math.floor((amountLeft - left - 3 * charW) / charW));
  const desc = ellipsize(description.trim().toUpperCase(), maxDesc);
  const leaderStart = left + desc.length * charW + charW * 0.6;
  const leaderEnd = amountLeft - charW * 0.6;
  const leader =
    leaderEnd - leaderStart > charW
      ? `<line x1="${leaderStart.toFixed(1)}" y1="${y - 4}" x2="${leaderEnd.toFixed(1)}" y2="${y - 4}" class="dots"/>`
      : '';
  const qtyCell =
    qty === null
      ? ''
      : `<text x="${QTY_RIGHT}" y="${y}" text-anchor="end" class="${cls}">${escapeXml(
          formatReceiptQty(qty),
        )}</text>`;
  return `${qtyCell}<text x="${left}" y="${y}" class="${cls}">${escapeXml(desc)}</text>${leader}<text x="${AMOUNT_RIGHT}" y="${y}" text-anchor="end" class="${cls}">${escapeXml(
    amount,
  )}</text>`;
}

function speckles(width: number, height: number, count: number, seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const patches = Array.from({ length: 5 }, () =>
    `<ellipse cx="${(rand() * width).toFixed(0)}" cy="${(rand() * height).toFixed(0)}" rx="${(30 + rand() * 50).toFixed(0)}" ry="${(10 + rand() * 18).toFixed(0)}" fill="#000" fill-opacity="${(0.12 + rand() * 0.18).toFixed(2)}"/>`,
  ).join('');
  const holes = Array.from({ length: count }, () =>
    `<circle cx="${(rand() * width).toFixed(1)}" cy="${(rand() * height).toFixed(1)}" r="${(0.6 + rand() * 2).toFixed(1)}" fill="#000" fill-opacity="${(0.55 + rand() * 0.45).toFixed(2)}"/>`,
  ).join('');
  return patches + holes;
}

const STAMP_W = 360;
const STAMP_H = 96;
const STAMP_SPECKLES = speckles(STAMP_W, STAMP_H, 110, 11);

/** Angled rubber stamp: double border, uneven ink, static speckle mask. */
function inkStamp(id: string, text: string, x: number, y: number, rotate: number, color: string) {
  const label = ellipsize(text.trim().toUpperCase() || 'CERTIFIED BESTIE', 20);
  const fontSize = label.length > 16 ? 22 : 26;
  return `
    <defs>
      <mask id="ink-${id}" maskUnits="userSpaceOnUse" x="${-STAMP_W / 2 - 10}" y="${-STAMP_H / 2 - 10}" width="${STAMP_W + 20}" height="${STAMP_H + 20}">
        <rect x="${-STAMP_W / 2 - 10}" y="${-STAMP_H / 2 - 10}" width="${STAMP_W + 20}" height="${STAMP_H + 20}" fill="#fff"/>
        <g transform="translate(${-STAMP_W / 2} ${-STAMP_H / 2})">${STAMP_SPECKLES}</g>
      </mask>
    </defs>
    <g transform="translate(${x} ${y}) rotate(${rotate})" opacity="0.88">
      <g mask="url(#ink-${id})">
        <rect x="${-STAMP_W / 2 + 2}" y="${-STAMP_H / 2 + 2}" width="${STAMP_W - 4}" height="${STAMP_H - 4}" rx="10" fill="none" stroke="${color}" stroke-opacity="0.25" stroke-width="12"/>
        <rect x="${-STAMP_W / 2 + 2}" y="${-STAMP_H / 2 + 2}" width="${STAMP_W - 4}" height="${STAMP_H - 4}" rx="10" fill="none" stroke="${color}" stroke-width="7"/>
        <rect x="${-STAMP_W / 2 + 14}" y="${-STAMP_H / 2 + 14}" width="${STAMP_W - 28}" height="${STAMP_H - 28}" rx="5" fill="none" stroke="${color}" stroke-width="2.5"/>
        <text y="${fontSize * 0.36}" text-anchor="middle" style="font:900 ${fontSize}px 'Arial Black',Arial,sans-serif;letter-spacing:3px;fill:${color}">${escapeXml(label)}</text>
      </g>
    </g>`;
}

export function buildMemoryTextureUrls(data: XsoData) {
  const stampDate =
    (data.timestamp.split(/[\s/]/)[0] || '03.15') + " · FILED";
  const shownItems = data.lineItems.slice(0, RECEIPT_MAX_ITEMS);
  const hiddenCount = data.lineItems.length - shownItems.length;
  const receiptLines =
    shownItems
      .map((item, index) =>
        receiptRow(item.qty, item.description, item.price, 176 + index * 26),
      )
      .join('') +
    (hiddenCount > 0
      ? `<text x="${DESC_LEFT}" y="${176 + shownItems.length * 26}" class="row" opacity=".65">+${hiddenCount} MORE</text>`
      : '');
  const metricLines = Object.entries(data.auditMetrics)
    .map(
      ([label, score], index) =>
        `<text x="44" y="${210 + index * 55}" class="label">${label.toUpperCase()}</text><rect x="200" y="${
          192 + index * 55
        }" width="330" height="18" fill="#111" opacity=".12"/><rect x="200" y="${
          192 + index * 55
        }" width="${score * 3.3}" height="18" fill="#111"/><text x="550" y="${
          210 + index * 55
        }" class="label">${score}</text>`,
    )
    .join('');
  const letterLines = wrapWords(data.birthdayMessage, 34)
    .slice(0, 8)
    .map(
      (line, index) =>
        `<text x="52" y="${168 + index * 40}" class="body">${escapeXml(line)}</text>`,
    )
    .join('');
  // Keep photo as a direct TextureLoader URL — nesting data-URLs in SVG breaks.
  const photo = data.photos[0] ?? emptyPhoto();

  return [
    // 0 — Receipt
    svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820">
      ${paperDefs('r')}
      <rect width="600" height="820" fill="${PAPER}"/>
      <g clip-path="url(#torn-r)">
        <rect width="600" height="820" fill="${PAPER}"/>
        ${grainOverlay()}
        <style>.mono{font:700 22px ${MONO};fill:#242424}.row{font:${ROW_FONT}px ${MONO};fill:#2c2c2c}.meta{font:15px ${MONO};fill:#4a4a4a}.dots{stroke:#2c2c2c;stroke-width:2;stroke-linecap:round;stroke-dasharray:0.1 7;opacity:.5}</style>
        <text x="300" y="62" text-anchor="middle" class="mono">${escapeXml(data.merchantName.toUpperCase())}</text>
        <text x="34" y="98" class="meta">CUSTOMER: ${escapeXml(ellipsize(data.customerName.toUpperCase(), 40))}</text>
        <text x="34" y="120" class="meta">${escapeXml(ellipsize(data.timestamp.toUpperCase(), 44))}</text>
        <path d="M30 140H570" stroke="#333" stroke-width="1.5" stroke-dasharray="8 7" opacity=".6"/>
        ${receiptLines}
        <path d="M30 408H570" stroke="#333" stroke-width="1.5" stroke-dasharray="8 7" opacity=".6"/>
        ${receiptRow(null, 'TOTAL', data.total, 448, { size: 22, cls: 'mono', left: 34 })}
        <rect x="130" y="478" width="340" height="80" fill="url(#bars)"/>
        <defs><pattern id="bars" width="13" height="1" patternUnits="userSpaceOnUse"><rect width="4" height="80" fill="#222"/><rect x="7" width="2" height="80" fill="#222"/></pattern></defs>
        ${inkStamp('r', data.certifiedStampText, 300, 626, -10, '#c21d24')}
        <text x="300" y="728" text-anchor="middle" class="meta">ITEMIZED CHAOS · NO REFUNDS, EVER</text>
        ${handNote('lol remember this??', 420, 760, -8)}
        ${coffeeRing(120, 720)}
      </g>
      ${dogEar()}
    </svg>`),

    // 1 — Audit
    svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820">
      ${paperDefs('a')}
      <rect width="600" height="820" fill="#f3e4a0"/>
      <style>.title{font:900 34px sans-serif;fill:#111}.label{font:700 17px monospace;fill:#111}</style>
      ${grainOverlay()}
      <rect x="22" y="22" width="556" height="776" fill="none" stroke="#111" stroke-width="7"/>
      <text x="300" y="82" text-anchor="middle" class="title">FRIENDSHIP AUDIT</text>
      <text x="300" y="132" text-anchor="middle" class="label">${escapeXml(data.customerName.toUpperCase())}</text>
      ${metricLines}
      ${inkStamp('a', data.certifiedStampText, 300, 590, -11, '#b62b32')}
      ${handNote('never let them navigate', 48, 760, -4, '#5a2a2a')}
      ${dateStamp(stampDate, 500, 740, -18)}
      ${dogEar()}
    </svg>`),

    // 2 — Polaroid face (framed in 3D; texture is the photo itself)
    photo,

    // 3 — Letter (scratch foil is interactive overlay; texture shows paper + hint)
    svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820">
      ${paperDefs('l')}
      <defs>
        <linearGradient id="paper-l" x2="1" y2="1">
          <stop stop-color="${PAPER}"/>
          <stop offset="1" stop-color="#f0ebe0"/>
        </linearGradient>
      </defs>
      <rect width="600" height="820" fill="url(#paper-l)"/>
      ${grainOverlay()}
      <style>.head{font:800 32px Georgia,serif;fill:#302b28}.body{font:23px Georgia,serif;fill:#403936}</style>
      <text x="52" y="78" class="head">DEAR ${escapeXml(data.customerName.toUpperCase())},</text>
      ${letterLines}
      <text x="52" y="560" class="body">Always, ${escapeXml(data.billerName)}</text>
      ${handNote('ps. bring snacks', 380, 600, 6)}
      ${coffeeRing(500, 120)}
      ${dateStamp(stampDate, 520, 520, 8)}
      <rect x="48" y="640" width="504" height="120" rx="14" fill="#d0cbc3" stroke="#9a948a" stroke-width="2"/>
      <rect x="56" y="648" width="488" height="104" rx="10" fill="#b9b3aa"/>
      <text x="300" y="698" text-anchor="middle" style="font:700 16px monospace;fill:#fff;opacity:.9">SILVER FOIL · SCRATCH BELOW</text>
      <text x="300" y="728" text-anchor="middle" style="font:italic 18px 'Segoe Print',cursive;fill:#fff;opacity:.55">a little secret for you</text>
      ${dogEar()}
    </svg>`),
  ];
}

export function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function emptyPhoto() {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820"><rect width="600" height="820" fill="#c8c1b5"/><text x="300" y="410" text-anchor="middle" style="font:700 22px monospace;fill:#666">PHOTO</text></svg>`,
  );
}

function wrapWords(value: string, max: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    if (`${line} ${word}`.trim().length > max) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) lines.push(line);
  return lines;
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
