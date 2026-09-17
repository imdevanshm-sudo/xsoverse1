import { promises as fs } from 'fs';
import path from 'path';
import type { XsoData } from '@/types/xso';

export type GiftStatus = 'pending' | 'paid';

export interface StoredGift {
  id: string;
  data: XsoData;
  status: GiftStatus;
  createdAt: string;
  paidAt?: string;
  lemonOrderId?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const GIFTS_FILE = path.join(DATA_DIR, 'gifts.json');

type GiftMap = Record<string, StoredGift>;

declare global {
  // eslint-disable-next-line no-var
  var __xsoGiftCache: GiftMap | undefined;
}

function cache(): GiftMap {
  if (!global.__xsoGiftCache) {
    global.__xsoGiftCache = {};
  }
  return global.__xsoGiftCache;
}

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(GIFTS_FILE);
  } catch {
    await fs.writeFile(GIFTS_FILE, '{}', 'utf8');
  }
}

async function readAll(): Promise<GiftMap> {
  const memory = cache();
  try {
    await ensureStore();
    const raw = await fs.readFile(GIFTS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}') as GiftMap;
    Object.assign(memory, parsed);
    return memory;
  } catch {
    return memory;
  }
}

async function writeAll(gifts: GiftMap): Promise<void> {
  global.__xsoGiftCache = gifts;
  await ensureStore();
  await fs.writeFile(GIFTS_FILE, JSON.stringify(gifts, null, 2), 'utf8');
}

export async function saveGift(gift: StoredGift): Promise<StoredGift> {
  const gifts = await readAll();
  gifts[gift.id] = gift;
  await writeAll(gifts);
  return gift;
}

export async function getGift(id: string): Promise<StoredGift | null> {
  const gifts = await readAll();
  return gifts[id] ?? null;
}

export async function markGiftPaid(
  id: string,
  lemonOrderId?: string,
): Promise<StoredGift | null> {
  const gifts = await readAll();
  const gift = gifts[id];
  if (!gift) return null;

  gift.status = 'paid';
  gift.paidAt = new Date().toISOString();
  if (lemonOrderId) gift.lemonOrderId = lemonOrderId;
  gifts[id] = gift;
  await writeAll(gifts);
  return gift;
}
