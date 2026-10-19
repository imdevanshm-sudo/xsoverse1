import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { readFileSync } from 'fs';

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
loadEnv();

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/recover-gift.mjs <giftId> [orderId]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: gift, error } = await sb.from('gifts').select('*').eq('id', id).single();
if (error) throw error;

const orderId = process.argv[3] || gift.lemon_order_id || `manual-recover-${Date.now()}`;
const { data: updated, error: e2 } = await sb
  .from('gifts')
  .update({
    status: 'paid',
    paid_at: gift.paid_at || new Date().toISOString(),
    lemon_order_id: orderId,
  })
  .eq('id', id)
  .select()
  .single();
if (e2) throw e2;

const secret =
  process.env.XSO_MANAGE_SECRET ||
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET ||
  process.env.SUPABASE_SECRET_KEY;
const manage = createHmac('sha256', secret).update(`manage:${id}`).digest('base64url').slice(0, 32);

console.log(
  JSON.stringify(
    {
      id: updated.id,
      status: updated.status,
      paid_at: updated.paid_at,
      lemon_order_id: updated.lemon_order_id,
      customerName: gift.data?.customerName,
      billerName: gift.data?.billerName,
      giftStyle: gift.data?.giftStyle,
      manageUrl: `https://www.xsoverse.app/xso/${id}/manage?key=${manage}`,
      viewUrl: `https://www.xsoverse.app/xso/${id}/view`,
    },
    null,
    2,
  ),
);
