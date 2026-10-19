/** Sample / preview storefront brand for landing cards, wizard live preview, and mock data. */
export const SAMPLE_BRAND = {
  storeName: 'XSOVERSE · KEEPSAKE DEPT.',
  cashier: 'THE XSO TEAM',
  stamp: 'XSO CERTIFIED',
  domain: 'xsoverse.app',
  movieTagline: 'XSOVERSE. I kept every receipt.',
} as const;

export function sampleFooter(domain: string = SAMPLE_BRAND.domain): string {
  return `NO REFUNDS / NO RETURNS · ${domain}`;
}
