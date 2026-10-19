/**
 * Decides whether a signed Lemon Squeezy `order_created` payload is a real, settled payment for
 * the price we quoted. Pure, so it can be tested without Lemon, Supabase or Next.
 *
 * Which gift an order pays for comes from `meta.custom_data.gift_id`, set by our checkout route
 * and covered by the webhook signature. Lemon's Orders API does not return custom data, so the
 * signed webhook is the only trusted link between an order and a gift.
 */

/** The charge a gift's checkout was created for, in minor units (cents). */
export interface ExpectedPayment {
  amount: number;
  currency: string;
}

export interface LemonOrderPayload {
  meta?: {
    event_name?: string;
    test_mode?: boolean;
    custom_data?: {
      gift_id?: string;
      giftId?: string;
      add_ons?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      identifier?: string;
      order_number?: number | string;
      store_id?: number | string;
      currency?: string;
      subtotal?: number;
      total?: number;
      total_formatted?: string;
      refunded?: boolean;
      test_mode?: boolean;
      created_at?: string;
      user_email?: string;
      customer_email?: string;
      email?: string;
      first_order_item?: {
        variant_id?: number | string;
        price?: number;
        test_mode?: boolean;
      };
    };
  };
}

export interface OrderPolicy {
  storeId: string;
  variantId: string;
  expected: ExpectedPayment | undefined;
  /** Test-mode orders are paid with test cards; never accept them in production. */
  allowTestMode: boolean;
  /**
   * The owner's own test purchases: a test-mode order from one of these (lowercased) emails is
   * accepted even where `allowTestMode` is off. Anyone else's test-card order stays rejected.
   */
  testEmails?: readonly string[];
}

export type OrderRejection =
  | 'malformed'
  | 'wrong_store'
  | 'not_paid'
  | 'refunded'
  | 'test_mode'
  | 'wrong_variant'
  | 'no_expected_amount'
  | 'amount_mismatch'
  | 'currency_mismatch';

export type OrderVerdict =
  | { ok: true; orderId: string }
  | { ok: false; reason: OrderRejection; orderId?: string };

export function verifyPaidOrder(payload: LemonOrderPayload, policy: OrderPolicy): OrderVerdict {
  const attrs = payload.data?.attributes;
  const rawId = attrs?.identifier || payload.data?.id;
  const orderId = rawId ? String(rawId) : undefined;
  const reject = (reason: OrderRejection): OrderVerdict => ({ ok: false, reason, orderId });

  if (!attrs || !orderId) return reject('malformed');
  if (String(attrs.store_id ?? '') !== String(policy.storeId)) return reject('wrong_store');
  if (attrs.status !== 'paid') return reject('not_paid');
  if (attrs.refunded === true) return reject('refunded');

  const testMode =
    attrs.test_mode === true ||
    payload.meta?.test_mode === true ||
    attrs.first_order_item?.test_mode === true;
  if (testMode && !policy.allowTestMode) {
    const buyer = String(attrs.user_email || attrs.customer_email || '').trim().toLowerCase();
    if (!buyer || !policy.testEmails?.includes(buyer)) return reject('test_mode');
  }

  const item = attrs.first_order_item;
  if (!item || String(item.variant_id ?? '') !== String(policy.variantId)) {
    return reject('wrong_variant');
  }

  const expected = policy.expected;
  if (!expected) return reject('no_expected_amount');
  /** The item price is our `custom_price`; tax and discount codes only change the order total. */
  const charged = typeof item.price === 'number' ? item.price : attrs.subtotal;
  if (charged !== expected.amount) return reject('amount_mismatch');
  if (String(attrs.currency ?? '').toUpperCase() !== expected.currency.toUpperCase()) {
    return reject('currency_mismatch');
  }

  return { ok: true, orderId };
}
