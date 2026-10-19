import { promises as fs } from 'fs';
import path from 'path';
import type { XsoData } from '@/types/xso';
import { completeXso } from '@/lib/xsoRecord';
import { sanitizeAddOns, type AddOnId } from '@/lib/pricing';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabaseServer';
import type { ExpectedPayment } from '@/lib/lemonOrder';

export type GiftStatus = 'pending' | 'paid';

/** Add-ons priced into the checkout, and those a paid order has confirmed. */
export interface GiftAddOns {
  requested: AddOnId[];
  paid: AddOnId[];
}

export interface StoredGift {
  id: string;
  data: XsoData;
  status: GiftStatus;
  createdAt: string;
  paidAt?: string;
  lemonOrderId?: string;
  addOns?: GiftAddOns;
  /** What the checkout charged; a webhook order must match it before the gift is paid. */
  expectedPayment?: ExpectedPayment;
}

/**
 * Add-on and expected-payment state ride in the `data` column under keys no gift payload uses;
 * they are split off on read, so they never reach the recipient and the sender's payload can't
 * set them.
 */
const ADD_ONS_KEY = '__addOns';
const PAYMENT_KEY = '__payment';
type RowData = XsoData & {
  [ADD_ONS_KEY]?: Partial<GiftAddOns>;
  [PAYMENT_KEY]?: Partial<ExpectedPayment>;
};

interface GiftRow {
  id: string;
  data: RowData;
  status: GiftStatus;
  created_at: string;
  paid_at: string | null;
  lemon_order_id: string | null;
}

const TABLE = 'gifts';

function splitData(raw: RowData): {
  data: XsoData;
  addOns?: GiftAddOns;
  expectedPayment?: ExpectedPayment;
} {
  const { [ADD_ONS_KEY]: addOns, [PAYMENT_KEY]: payment, ...data } = (raw ?? {}) as RowData;
  return {
    data: completeXso(data as XsoData),
    addOns: addOns
      ? { requested: sanitizeAddOns(addOns.requested), paid: sanitizeAddOns(addOns.paid) }
      : undefined,
    expectedPayment: readExpectedPayment(payment),
  };
}

function readExpectedPayment(value: unknown): ExpectedPayment | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { amount, currency } = value as Partial<ExpectedPayment>;
  if (!Number.isInteger(amount) || (amount as number) < 0) return undefined;
  if (typeof currency !== 'string' || !currency) return undefined;
  return { amount: amount as number, currency };
}

function joinData(gift: StoredGift): RowData {
  return {
    ...gift.data,
    ...(gift.addOns ? { [ADD_ONS_KEY]: gift.addOns } : {}),
    ...(gift.expectedPayment ? { [PAYMENT_KEY]: gift.expectedPayment } : {}),
  };
}

/** Only add-ons that were priced into this gift's checkout can be confirmed by its order. */
function confirmAddOns(gift: StoredGift, confirmed: readonly AddOnId[]): GiftAddOns | undefined {
  if (!gift.addOns) return undefined;
  const { requested } = gift.addOns;
  return { requested, paid: requested.filter((id) => confirmed.includes(id)) };
}

/** Whether the paid order for this gift includes the add-on. */
export function hasPaidAddOn(gift: StoredGift, id: AddOnId): boolean {
  return gift.status === 'paid' && Boolean(gift.addOns?.paid.includes(id));
}

function fromRow(row: GiftRow): StoredGift {
  const { data, addOns, expectedPayment } = splitData(row.data);
  return {
    id: row.id,
    data,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    lemonOrderId: row.lemon_order_id ?? undefined,
    addOns,
    expectedPayment,
  };
}

function toRow(gift: StoredGift): GiftRow {
  return {
    id: gift.id,
    data: joinData(gift),
    status: gift.status,
    created_at: gift.createdAt,
    paid_at: gift.paidAt ?? null,
    lemon_order_id: gift.lemonOrderId ?? null,
  };
}

function shouldUseSupabase(): boolean {
  if (isSupabaseConfigured()) return true;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Gift storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.',
    );
  }
  return false;
}

export async function saveGift(gift: StoredGift): Promise<StoredGift> {
  if (!shouldUseSupabase()) return fileStore.save(gift);

  const { data, error } = await getSupabaseServer()
    .from(TABLE)
    .upsert(toRow(gift))
    .select()
    .single<GiftRow>();
  if (error) throw new Error(`Failed to save gift: ${error.message}`);
  return fromRow(data);
}

export async function getGift(id: string): Promise<StoredGift | null> {
  if (!shouldUseSupabase()) return fileStore.get(id);

  const { data, error } = await getSupabaseServer()
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle<GiftRow>();
  if (error) throw new Error(`Failed to load gift: ${error.message}`);
  return data ? fromRow(data) : null;
}

/** Marks the gift paid, along with whichever of its add-ons the order confirms. */
export async function markGiftPaid(
  id: string,
  lemonOrderId?: string,
  confirmedAddOns: readonly AddOnId[] = [],
): Promise<StoredGift | null> {
  if (!shouldUseSupabase()) return fileStore.markPaid(id, lemonOrderId, confirmedAddOns);

  const update: Partial<GiftRow> = {
    status: 'paid',
    paid_at: new Date().toISOString(),
  };
  if (lemonOrderId) update.lemon_order_id = lemonOrderId;
  if (confirmedAddOns.length) {
    const gift = await getGift(id);
    if (!gift) return null;
    update.data = joinData({ ...gift, addOns: confirmAddOns(gift, confirmedAddOns) });
  }

  const { data, error } = await getSupabaseServer()
    .from(TABLE)
    .update(update)
    .eq('id', id)
    .select()
    .maybeSingle<GiftRow>();
  if (error) throw new Error(`Failed to update gift: ${error.message}`);
  return data ? fromRow(data) : null;
}

export type PaymentFulfillment =
  | { outcome: 'fulfilled'; gift: StoredGift }
  | { outcome: 'already_paid'; gift: StoredGift }
  | { outcome: 'not_found' };

/**
 * Moves a gift from pending to paid exactly once, for an order the caller has already verified.
 * The update only matches a pending row, so retried or concurrent webhooks find the gift already
 * paid and leave it (and its order, add-ons and paid date) untouched.
 */
export async function fulfillGiftPayment(
  gift: StoredGift,
  lemonOrderId: string,
  confirmedAddOns: readonly AddOnId[],
): Promise<PaymentFulfillment> {
  if (gift.status === 'paid') return { outcome: 'already_paid', gift };
  if (!shouldUseSupabase()) return fileStore.fulfill(gift.id, lemonOrderId, confirmedAddOns);

  const update: Partial<GiftRow> = {
    status: 'paid',
    paid_at: new Date().toISOString(),
    lemon_order_id: lemonOrderId,
  };
  if (gift.addOns) {
    update.data = joinData({ ...gift, addOns: confirmAddOns(gift, confirmedAddOns) });
  }

  const { data, error } = await getSupabaseServer()
    .from(TABLE)
    .update(update)
    .eq('id', gift.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle<GiftRow>();
  if (error) throw new Error(`Failed to update gift: ${error.message}`);
  if (data) return { outcome: 'fulfilled', gift: fromRow(data) };

  const current = await getGift(gift.id);
  return current ? { outcome: 'already_paid', gift: current } : { outcome: 'not_found' };
}

// Local development fallback when Supabase env vars are absent.
const DATA_DIR = path.join(process.cwd(), '.data');
const GIFTS_FILE = path.join(DATA_DIR, 'gifts.json');

type GiftMap = Record<string, StoredGift>;

const fileStore = {
  async readAll(): Promise<GiftMap> {
    try {
      const raw = await fs.readFile(GIFTS_FILE, 'utf8');
      return JSON.parse(raw || '{}') as GiftMap;
    } catch {
      return {};
    }
  },

  async writeAll(gifts: GiftMap): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(GIFTS_FILE, JSON.stringify(gifts, null, 2), 'utf8');
  },

  async save(gift: StoredGift): Promise<StoredGift> {
    const gifts = await fileStore.readAll();
    gifts[gift.id] = gift;
    await fileStore.writeAll(gifts);
    return gift;
  },

  async get(id: string): Promise<StoredGift | null> {
    const gifts = await fileStore.readAll();
    const gift = gifts[id];
    return gift ? { ...gift, data: completeXso(gift.data) } : null;
  },

  async markPaid(
    id: string,
    lemonOrderId: string | undefined,
    confirmedAddOns: readonly AddOnId[],
  ): Promise<StoredGift | null> {
    const gifts = await fileStore.readAll();
    const gift = gifts[id];
    if (!gift) return null;
    gift.status = 'paid';
    gift.paidAt = new Date().toISOString();
    if (lemonOrderId) gift.lemonOrderId = lemonOrderId;
    if (confirmedAddOns.length) gift.addOns = confirmAddOns(gift, confirmedAddOns);
    await fileStore.writeAll(gifts);
    return gift;
  },

  async fulfill(
    id: string,
    lemonOrderId: string,
    confirmedAddOns: readonly AddOnId[],
  ): Promise<PaymentFulfillment> {
    const gifts = await fileStore.readAll();
    const gift = gifts[id];
    if (!gift) return { outcome: 'not_found' };
    if (gift.status === 'paid') {
      return { outcome: 'already_paid', gift: { ...gift, data: completeXso(gift.data) } };
    }
    gift.status = 'paid';
    gift.paidAt = new Date().toISOString();
    gift.lemonOrderId = lemonOrderId;
    if (gift.addOns) gift.addOns = confirmAddOns(gift, confirmedAddOns);
    await fileStore.writeAll(gifts);
    return { outcome: 'fulfilled', gift: { ...gift, data: completeXso(gift.data) } };
  },
};
