import { CARTRIDGE_PRICE, CARTRIDGE_PRICE_CENTS } from '@/lib/cartridges';

/** The single product sold at checkout. */
export const XSO_PRODUCT = {
  label: 'XSO',
  blurb: 'One of one, made for one person. Ready to open the moment it’s sealed.',
  price: CARTRIDGE_PRICE,
  priceCents: CARTRIDGE_PRICE_CENTS,
} as const;
