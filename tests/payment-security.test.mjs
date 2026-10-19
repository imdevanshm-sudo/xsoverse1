/**
 * Payment-unlock security (audit P0-1). Drives the real route handlers against an isolated file
 * store, with Lemon Squeezy and Resend stubbed at the network edge; nothing leaves the machine.
 *
 *   npm test
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SECRET = 'whsec_test_only';
const STORE_ID = '1001';
const VARIANT_ID = '2002';

const workDir = mkdtempSync(path.join(tmpdir(), 'xso-payments-'));
const repoDir = process.cwd();
process.chdir(workDir);

for (const key of [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LEMONSQUEEZY_VARIANT_CLASSIC',
  'LEMONSQUEEZY_VARIANT_PREMIUM',
  'LEMONSQUEEZY_VARIANT_FULL',
  'LEMONSQUEEZY_VARIANT_MOVIEBOX',
  'LEMONSQUEEZY_VARIANT_SINGLE',
  'MAIL_FROM',
]) {
  delete process.env[key];
}
Object.assign(process.env, {
  NODE_ENV: 'test',
  NEXT_PUBLIC_APP_URL: 'https://xso.test',
  LEMONSQUEEZY_API_KEY: 'test-api-key',
  LEMONSQUEEZY_STORE_ID: STORE_ID,
  LEMONSQUEEZY_VARIANT_ID: VARIANT_ID,
  LEMONSQUEEZY_WEBHOOK_SECRET: SECRET,
  XSO_MANAGE_SECRET: 'manage-secret-test-only',
  RESEND_API_KEY: 're_test_only',
});

/** Network edge: Lemon's checkout API and Resend are the only calls these routes make. */
const network = { checkouts: [], emails: [] };
globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
  if (url.startsWith('https://api.lemonsqueezy.com/v1/checkouts')) {
    network.checkouts.push(body);
    return Response.json(
      { data: { attributes: { url: 'https://xsoverse.lemonsqueezy.com/checkout/custom/test' } } },
      { status: 201 },
    );
  }
  if (url.startsWith('https://api.resend.com/')) {
    network.emails.push(body);
    return Response.json({ id: `email_${network.emails.length}` });
  }
  throw new Error(`Unexpected network call in test: ${url}`);
};

const src = (file) => path.join(repoDir, 'src', file);
const { POST: checkoutRoute } = await import(src('app/api/checkout/route.ts'));
const { POST: webhookRoute } = await import(src('app/api/webhooks/lemonsqueezy/route.ts'));
const { POST: confirmPaidRoute } = await import(src('app/api/gifts/[id]/confirm-paid/route.ts'));
const { POST: openRoute } = await import(src('app/api/gifts/[id]/open/route.ts'));
const { GET: statusRoute } = await import(src('app/api/gifts/[id]/route.ts'));
const { getGift } = await import(src('lib/giftStore.ts'));
const { createPendingGift } = await import(src('lib/lemon.ts'));
const { manageKey } = await import(src('lib/manageKey.ts'));
const { quote } = await import(src('lib/pricing.ts'));
const { verifyPaidOrder } = await import(src('lib/lemonOrder.ts'));
const { getMockXsoData } = await import(src('types/xso.ts'));

const BASE_PRICE = quote({ style: 'loop' }).total;

function post(url, body) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Starts a real checkout through the API, as the storefront does. */
async function startCheckout() {
  const res = await checkoutRoute(
    post('https://xso.test/api/checkout', { data: { ...getMockXsoData(), giftStyle: 'loop' } }),
  );
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  const sentToLemon = network.checkouts.at(-1).data.attributes;
  return { body, giftId: sentToLemon.checkout_data.custom.gift_id, sentToLemon };
}

/** A gift whose checkout priced in the Our Song add-on. */
async function pendingGiftWithSong() {
  const addOns = ['spotify_song'];
  const price = quote({ style: 'loop', addOns });
  const gift = await createPendingGift({ ...getMockXsoData(), giftStyle: 'loop' }, addOns, {
    amount: price.total,
    currency: price.currency,
  });
  return gift.id;
}

/** The `order_created` payload Lemon signs, for one gift. */
function orderFor(giftId, overrides = {}) {
  const {
    orderId = crypto.randomUUID(),
    amount = BASE_PRICE,
    currency = 'USD',
    status = 'paid',
    storeId = STORE_ID,
    variantId = VARIANT_ID,
    testMode = false,
    addOns,
  } = overrides;
  return {
    meta: {
      event_name: 'order_created',
      test_mode: testMode,
      custom_data: { gift_id: giftId, ...(addOns ? { add_ons: addOns } : {}) },
    },
    data: {
      type: 'orders',
      id: '1',
      attributes: {
        identifier: orderId,
        order_number: 42,
        store_id: Number(storeId),
        status,
        currency,
        subtotal: amount,
        total: amount,
        total_formatted: `$${(amount / 100).toFixed(2)}`,
        refunded: false,
        test_mode: testMode,
        user_email: 'buyer@example.test',
        created_at: '2026-10-17T10:00:00.000000Z',
        first_order_item: { variant_id: Number(variantId), price: amount, test_mode: testMode },
      },
    },
  };
}

function signedWebhook(payload, { signature } = {}) {
  const raw = JSON.stringify(payload);
  const valid = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return webhookRoute(
    new Request('https://xso.test/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: { 'x-signature': signature ?? valid },
      body: raw,
    }),
  );
}

const ctx = (id) => ({ params: { id } });
const confirmPaid = (id, body) =>
  confirmPaidRoute(post(`https://xso.test/api/gifts/${id}/confirm-paid?paid=1`, body), ctx(id));
const openGift = (id) => openRoute(post(`https://xso.test/api/gifts/${id}/open`), ctx(id));
const giftStatus = (id) =>
  statusRoute(new Request(`https://xso.test/api/gifts/${id}`), ctx(id));

async function assertLocked(giftId) {
  const gift = await getGift(giftId);
  assert.equal(gift.status, 'pending');
  assert.equal(gift.paidAt, undefined);
  assert.equal(gift.lemonOrderId, undefined);
  assert.equal((await openGift(giftId)).status, 402);
  assert.equal((await giftStatus(giftId)).status, 402);
}

before(() => {
  network.checkouts.length = 0;
  network.emails.length = 0;
});

after(() => {
  process.chdir(repoDir);
  rmSync(workDir, { recursive: true, force: true });
});

describe('payment unlock (P0-1)', () => {
  test('1. an unpaid checkout cannot unlock its gift', async () => {
    const { body, giftId, sentToLemon } = await startCheckout();
    const key = manageKey(giftId);

    assert.equal(body.redirectUrl, undefined, 'checkout must not return the dashboard link');
    assert.ok(!JSON.stringify(body).includes(key), 'checkout must not leak the manage key');
    assert.equal(sentToLemon.custom_price, BASE_PRICE);
    assert.deepEqual((await getGift(giftId)).expectedPayment, {
      amount: BASE_PRICE,
      currency: 'USD',
    });

    /** Even holding the real manage key (it is in Lemon's return URL), nothing unlocks. */
    const res = await confirmPaid(giftId, { key });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'pending');
    await assertLocked(giftId);
  });

  test('2. a forged paid flag cannot unlock a gift', async () => {
    const { giftId } = await startCheckout();
    const key = manageKey(giftId);
    const emailsBefore = network.emails.length;

    const forged = await confirmPaid(giftId, {
      key,
      paid: true,
      status: 'paid',
      email: 'attacker@example.test',
    });
    assert.equal((await forged.json()).status, 'pending');

    const unsigned = await signedWebhook(orderFor(giftId), { signature: 'f'.repeat(64) });
    assert.equal(unsigned.status, 401);

    const unpaid = await signedWebhook(orderFor(giftId, { status: 'pending' }));
    assert.equal((await unpaid.json()).ignored, 'not_paid');

    await assertLocked(giftId);
    assert.equal(network.emails.length, emailsBefore, 'no email for an unpaid gift');
  });

  test('3. a payment for another gift cannot unlock this gift', async () => {
    const { giftId: target } = await startCheckout();
    const { giftId: other } = await startCheckout();

    const res = await signedWebhook(orderFor(other));
    assert.equal((await res.json()).status, 'paid');
    assert.equal((await getGift(other)).status, 'paid');

    for (const [overrides, reason] of [
      [{ storeId: '9999' }, 'wrong_store'],
      [{ variantId: '9999' }, 'wrong_variant'],
      [{ amount: 100 }, 'amount_mismatch'],
      [{ currency: 'EUR' }, 'currency_mismatch'],
    ]) {
      const rejected = await signedWebhook(orderFor(target, overrides));
      assert.equal((await rejected.json()).ignored, reason);
    }
    await assertLocked(target);
  });

  test('4. a valid paid order unlocks the intended gift', async () => {
    const { giftId } = await startCheckout();
    const orderId = crypto.randomUUID();
    const emailsBefore = network.emails.length;

    const res = await signedWebhook(orderFor(giftId, { orderId }));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'paid');
    assert.equal(body.emailed, 'sent');

    const gift = await getGift(giftId);
    assert.equal(gift.status, 'paid');
    assert.equal(gift.lemonOrderId, orderId);
    assert.ok(gift.paidAt);

    const opened = await openGift(giftId);
    assert.equal(opened.status, 200);
    assert.ok((await opened.json()).data);
    assert.equal((await giftStatus(giftId)).status, 200);

    assert.equal(network.emails.length, emailsBefore + 1);
    assert.equal(network.emails.at(-1).to, 'buyer@example.test');

    /** The buyer dashboard's "Email me" still works once the gift is genuinely paid. */
    const resend = await confirmPaid(giftId, { key: manageKey(giftId), email: 'me@example.test' });
    assert.deepEqual(await resend.json(), { id: giftId, status: 'paid', emailed: 'sent' });
  });

  test('5. duplicate webhooks and confirmations do not duplicate fulfilment', async () => {
    const { giftId } = await startCheckout();
    const order = orderFor(giftId);
    const emailsBefore = network.emails.length;

    await signedWebhook(order);
    const first = await getGift(giftId);

    const retry = await (await signedWebhook(order)).json();
    assert.equal(retry.duplicate, true);
    const secondOrder = await (await signedWebhook(orderFor(giftId))).json();
    assert.equal(secondOrder.duplicate, true);
    for (let i = 0; i < 3; i += 1) {
      const confirm = await (await confirmPaid(giftId, { key: manageKey(giftId) })).json();
      assert.equal(confirm.emailed, 'skipped');
    }

    const after = await getGift(giftId);
    assert.equal(after.status, 'paid');
    assert.equal(after.paidAt, first.paidAt, 'paid date is not rewritten');
    assert.equal(after.lemonOrderId, order.data.attributes.identifier, 'first order is kept');
    assert.equal(network.emails.length, emailsBefore + 1, 'buyer is emailed exactly once');
  });

  test('6. requested add-ons are not fulfilled without verified payment', async () => {
    const giftId = await pendingGiftWithSong();
    const songPrice = quote({ style: 'loop', addOns: ['spotify_song'] }).total;
    const key = manageKey(giftId);

    await confirmPaid(giftId, { key, paid: true });
    for (const overrides of [
      { status: 'failed', addOns: 'spotify_song' },
      { amount: songPrice + 500, addOns: 'spotify_song' },
      { storeId: '9999', addOns: 'spotify_song' },
    ]) {
      await signedWebhook(orderFor(giftId, { amount: songPrice, ...overrides }));
    }
    let gift = await getGift(giftId);
    assert.equal(gift.status, 'pending');
    assert.deepEqual(gift.addOns, { requested: ['spotify_song'], paid: [] });

    /** A paid order whose signed data doesn't carry the add-on confirms the gift, not the add-on. */
    await signedWebhook(orderFor(giftId, { amount: songPrice }));
    gift = await getGift(giftId);
    assert.equal(gift.status, 'paid');
    assert.deepEqual(gift.addOns.paid, []);

    const withSong = await pendingGiftWithSong();
    await signedWebhook(orderFor(withSong, { amount: songPrice, addOns: 'spotify_song' }));
    assert.deepEqual((await getGift(withSong)).addOns.paid, ['spotify_song']);
  });
});

describe('verifyPaidOrder', () => {
  const policy = {
    storeId: STORE_ID,
    variantId: VARIANT_ID,
    expected: { amount: BASE_PRICE, currency: 'USD' },
    allowTestMode: false,
  };

  test('accepts a settled order for the quoted price', () => {
    const order = orderFor('xso_any');
    assert.deepEqual(verifyPaidOrder(order, policy), {
      ok: true,
      orderId: order.data.attributes.identifier,
    });
  });

  test('rejects test-mode, refunded, malformed and unpriced orders', () => {
    assert.equal(verifyPaidOrder(orderFor('x', { testMode: true }), policy).reason, 'test_mode');
    const refunded = orderFor('x');
    refunded.data.attributes.refunded = true;
    assert.equal(verifyPaidOrder(refunded, policy).reason, 'refunded');
    assert.equal(verifyPaidOrder({ meta: {} }, policy).reason, 'malformed');
    assert.equal(
      verifyPaidOrder(orderFor('x'), { ...policy, expected: undefined }).reason,
      'no_expected_amount',
    );
  });

  test('allows test-mode orders only when the policy does (local development)', () => {
    assert.equal(
      verifyPaidOrder(orderFor('x', { testMode: true }), { ...policy, allowTestMode: true }).ok,
      true,
    );
  });

  test("in production, test-mode orders unlock only for the owner's listed test emails", () => {
    const test = orderFor('x', { testMode: true });
    const owner = { ...policy, testEmails: ['buyer@example.test'] };
    assert.equal(verifyPaidOrder(test, owner).ok, true);
    test.data.attributes.user_email = '  Buyer@Example.TEST ';
    assert.equal(verifyPaidOrder(test, owner).ok, true, 'email match ignores case and spaces');

    const stranger = orderFor('x', { testMode: true });
    stranger.data.attributes.user_email = 'someone@else.test';
    assert.equal(verifyPaidOrder(stranger, owner).reason, 'test_mode');

    const anonymous = orderFor('x', { testMode: true });
    delete anonymous.data.attributes.user_email;
    assert.equal(verifyPaidOrder(anonymous, owner).reason, 'test_mode');

    assert.equal(verifyPaidOrder(orderFor('x', { testMode: true }), policy).reason, 'test_mode');
    assert.equal(
      verifyPaidOrder(orderFor('x', { testMode: true, amount: 1 }), owner).reason,
      'amount_mismatch',
      'listed test orders still have to match the quoted price',
    );
  });
});
