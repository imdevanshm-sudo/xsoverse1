import { CARTRIDGE_PRICE, CARTRIDGE_PRICE_CENTS } from '@/lib/cartridges';

export type Delivery = 'digital' | 'physical';

/** Placeholder until final print pricing is set; change here only. */
export const PHYSICAL_PRICE_CENTS = 3499;
export const PHYSICAL_PRICE = '$34.99';

export const DELIVERY_OPTIONS: Record<
  Delivery,
  { label: string; blurb: string; price: string; priceCents: number }
> = {
  digital: {
    label: 'Digital souvenir link',
    blurb: 'A private link to the interactive keepsake, ready the moment you pay.',
    price: CARTRIDGE_PRICE,
    priceCents: CARTRIDGE_PRICE_CENTS,
  },
  physical: {
    label: 'Printed keepsake box + digital link',
    blurb: 'All four cards printed on thick linen stock, boxed and shipped — plus the link.',
    price: PHYSICAL_PRICE,
    priceCents: PHYSICAL_PRICE_CENTS,
  },
};

export function isDelivery(value: unknown): value is Delivery {
  return value === 'digital' || value === 'physical';
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export const EMPTY_SHIPPING: ShippingAddress = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
};

const REQUIRED: (keyof ShippingAddress)[] = [
  'name',
  'line1',
  'city',
  'postalCode',
  'country',
];

export const SHIPPING_LABELS: Record<keyof ShippingAddress, string> = {
  name: 'Full name',
  line1: 'Address',
  line2: 'Apartment, suite (optional)',
  city: 'City',
  region: 'State / region',
  postalCode: 'Postal code',
  country: 'Country',
};

/** Trims, caps length and reports the first missing required field. */
export function normalizeShipping(
  input: unknown,
): { ok: true; value: ShippingAddress } | { ok: false; field: keyof ShippingAddress } {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const value = { ...EMPTY_SHIPPING };
  for (const key of Object.keys(EMPTY_SHIPPING) as (keyof ShippingAddress)[]) {
    const raw = source[key];
    value[key] = typeof raw === 'string' ? raw.trim().slice(0, 120) : '';
  }
  const missing = REQUIRED.find((key) => !value[key]);
  return missing ? { ok: false, field: missing } : { ok: true, value };
}
