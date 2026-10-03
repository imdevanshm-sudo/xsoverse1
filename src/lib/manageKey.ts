import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signs sender dashboard links so a recipient can't reach `/manage` by editing their `/view`
 * URL. Derived, not stored: rotating the secret invalidates every existing dashboard link.
 */
function secret() {
  const value =
    process.env.XSO_MANAGE_SECRET ||
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET ||
    process.env.SUPABASE_SECRET_KEY;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set XSO_MANAGE_SECRET to sign sender dashboard links.');
  }
  return 'xso-local-manage-secret';
}

export function manageKey(giftId: string) {
  return createHmac('sha256', secret()).update(`manage:${giftId}`).digest('base64url').slice(0, 32);
}

export function isManageKey(giftId: string, key: string | string[] | undefined | null) {
  if (typeof key !== 'string' || !key) return false;
  const expected = Buffer.from(manageKey(giftId));
  const given = Buffer.from(key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
