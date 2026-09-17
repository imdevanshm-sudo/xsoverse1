# XSO Storefront

Retro game-console landing page and portrait souvenir studio for XSO.

## Routes

- `/` — Choose Your Cartridge storefront (CRT handheld shell)
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

Without Lemon Squeezy env vars, **BUY XSO ($14.99)** runs in preview mode: it saves the souvenir and opens `/gift/[uniqueId]` directly.

## Lemon Squeezy

Copy `.env.example` → `.env.local` and set:

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

Webhook endpoint: `POST /api/webhooks/lemonsqueezy` (subscribe to `order_created`).

## Stack

Next.js 14 · Tailwind · Zustand · Framer Motion · React Three Fiber · Lemon Squeezy
