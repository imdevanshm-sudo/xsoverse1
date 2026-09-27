import { promises as fs } from 'fs';
import path from 'path';
import type { XsoData } from '@/types/xso';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabaseServer';

export type GiftStatus = 'pending' | 'paid';

export interface StoredGift {
  id: string;
  data: XsoData;
  status: GiftStatus;
  createdAt: string;
  paidAt?: string;
  lemonOrderId?: string;
}

interface GiftRow {
  id: string;
  data: XsoData;
  status: GiftStatus;
  created_at: string;
  paid_at: string | null;
  lemon_order_id: string | null;
}

const TABLE = 'gifts';

function fromRow(row: GiftRow): StoredGift {
  return {
    id: row.id,
    data: row.data,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    lemonOrderId: row.lemon_order_id ?? undefined,
  };
}

function toRow(gift: StoredGift): GiftRow {
  return {
    id: gift.id,
    data: gift.data,
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

export async function markGiftPaid(
  id: string,
  lemonOrderId?: string,
): Promise<StoredGift | null> {
  if (!shouldUseSupabase()) return fileStore.markPaid(id, lemonOrderId);

  const update: Partial<GiftRow> = {
    status: 'paid',
    paid_at: new Date().toISOString(),
  };
  if (lemonOrderId) update.lemon_order_id = lemonOrderId;

  const { data, error } = await getSupabaseServer()
    .from(TABLE)
    .update(update)
    .eq('id', id)
    .select()
    .maybeSingle<GiftRow>();
  if (error) throw new Error(`Failed to update gift: ${error.message}`);
  return data ? fromRow(data) : null;
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
    return gifts[id] ?? null;
  },

  async markPaid(id: string, lemonOrderId?: string): Promise<StoredGift | null> {
    const gifts = await fileStore.readAll();
    const gift = gifts[id];
    if (!gift) return null;
    gift.status = 'paid';
    gift.paidAt = new Date().toISOString();
    if (lemonOrderId) gift.lemonOrderId = lemonOrderId;
    await fileStore.writeAll(gifts);
    return gift;
  },
};
