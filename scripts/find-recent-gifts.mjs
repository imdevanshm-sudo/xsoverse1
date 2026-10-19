import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  } catch {}
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('supabase', !!url, 'key', key ? key.slice(0, 8) + '…' : 'missing');
const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb
  .from('gifts')
  .select('id,status,created_at,paid_at,lemon_order_id,data')
  .order('created_at', { ascending: false })
  .limit(20);
if (error) { console.error(error); process.exit(1); }
for (const g of data || []) {
  const d = g.data || {};
  console.log([g.status, g.id, g.lemon_order_id || '-', g.created_at, g.paid_at || '-', JSON.stringify(d.customerName), JSON.stringify(d.billerName), d.giftStyle].join('\t'));
}
