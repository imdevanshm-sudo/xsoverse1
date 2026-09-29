import { CARTRIDGE_PRICE, CARTRIDGE_PRICE_CENTS } from '@/lib/cartridges';

/** The single product sold at checkout. */
export const XSO_PRODUCT = {
  label: 'XSO',
  blurb: 'The interactive one-of-one keepsake, ready to open the moment you pay.',
  price: CARTRIDGE_PRICE,
  priceCents: CARTRIDGE_PRICE_CENTS,
} as const;
