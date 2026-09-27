# XSO Storefront

Retro game-console landing page and portrait souvenir studio for XSO.

## Routes

- `/` — Choose Your Cartridge storefront
- `/preview?style=loop` — Immersive interactive souvenir preview (Step 1)
- `/studio?style=loop` — Customize lore + Lock & Checkout (Step 2)
- `/checkout/success` — Post-payment confirm → shareable gift
- `/gift/[id]` — Gift unboxing experience

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Lemon Squeezy env vars, **BUY XSO ($14.99)** runs in preview mode: it saves the souvenir, marks it paid, and shows the shareable `/gift/[uniqueId]` link on `/checkout/success`.

## Gift storage (Supabase)

Gifts are stored in a Supabase Postgres `gifts` table. Set in `.env.local`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the client)

Create the table by running [`supabase/migrations/0001_gifts.sql`](supabase/migrations/0001_gifts.sql) in the Supabase SQL editor, or with the CLI: `supabase db push`.

In local development, if these vars are unset, gifts fall back to `.data/gifts.json`. In production they are required.

## Lemon Squeezy

Copy `.env.example` → `.env.local` and set:

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

Webhook endpoint: `POST /api/webhooks/lemonsqueezy` (subscribe to `order_created`).

## Stack

Next.js 14 · Tailwind · Zustand · Framer Motion · React Three Fiber · Lemon Squeezy · Supabase
