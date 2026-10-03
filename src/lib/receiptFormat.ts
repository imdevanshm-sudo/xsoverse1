/** Normalise "1x", "3", " 12 X" to a right-aligned "1x" / "12x" column. */
export function formatReceiptQty(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  const match = /^(\d{1,3})\s*x?$/i.exec(trimmed);
  if (match) return `${match[1]}x`;
  return trimmed.slice(0, 4).toUpperCase();
}

export const RECEIPT_MAX_ITEMS = 8;
