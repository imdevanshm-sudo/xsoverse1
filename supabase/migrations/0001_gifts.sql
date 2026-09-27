create table if not exists public.gifts (
  id text primary key,
  data jsonb not null,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  lemon_order_id text
);

-- Server-only access via the service role key; no public policies.
alter table public.gifts enable row level security;
