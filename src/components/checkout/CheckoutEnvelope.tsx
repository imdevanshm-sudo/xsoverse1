'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Mail, Package } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { getTheme, THEMES } from '@/lib/themes';
import {
  DELIVERY_OPTIONS,
  EMPTY_SHIPPING,
  SHIPPING_LABELS,
  normalizeShipping,
  type Delivery,
  type ShippingAddress,
} from '@/lib/orders';
import { DeskDock } from '@/components/desk/DeskDock';
import { MatteCta } from '@/components/desk/MatteCta';
import type { GiftStyle } from '@/types/xso';

const SHIPPING_LAYOUT: { key: keyof ShippingAddress; span: string; auto: string }[] = [
  { key: 'name', span: 'sm:col-span-2', auto: 'name' },
  { key: 'line1', span: 'sm:col-span-2', auto: 'address-line1' },
  { key: 'line2', span: 'sm:col-span-2', auto: 'address-line2' },
  { key: 'city', span: '', auto: 'address-level2' },
  { key: 'region', span: '', auto: 'address-level1' },
  { key: 'postalCode', span: '', auto: 'postal-code' },
  { key: 'country', span: '', auto: 'country-name' },
];

function centsToPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Short, stable invoice number derived from the draft id. */
function invoiceNo(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return String(hash % 10000).padStart(4, '0');
}

export function CheckoutEnvelope({ lockedStyle }: { lockedStyle: GiftStyle }) {
  const reduce = useReducedMotion();
  const cart = getCartridge(lockedStyle);
  const theme = getTheme(useXsoStore((s) => s.themeId)) ?? THEMES[0];
  const draftId = useXsoStore((s) => s.id);
  const customerName = useXsoStore((s) => s.customerName);
  const billerName = useXsoStore((s) => s.billerName);
  const occasion = useXsoStore((s) => s.occasion);

  const [delivery, setDelivery] = useState<Delivery>('physical');
  const [shipping, setShipping] = useState<ShippingAddress>(EMPTY_SHIPPING);
  const [missing, setMissing] = useState<keyof ShippingAddress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const option = DELIVERY_OPTIONS[delivery];
  const digital = DELIVERY_OPTIONS.digital;
  const printExtra = option.priceCents - digital.priceCents;
  const invoice = useMemo(() => invoiceNo(draftId), [draftId]);

  const pay = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    setError(null);

    let address: ShippingAddress | undefined;
    if (delivery === 'physical') {
      const result = normalizeShipping(shipping);
      if (!result.ok) {
        setMissing(result.field);
        setError(`${SHIPPING_LABELS[result.field]} is required for printed delivery.`);
        formRef.current
          ?.querySelector<HTMLInputElement>(`[name="${result.field}"]`)
          ?.focus();
        return;
      }
      address = result.value;
    }

    setBusy(true);
    try {
      const snapshot = useXsoStore.getState();
      const data = pickXsoPayload({ ...snapshot, giftStyle: lockedStyle });
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, delivery, shipping: address }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !json.checkoutUrl) {
        throw new Error(json.error || 'Checkout failed');
      }
      window.location.assign(json.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:pt-10">
        {/* Envelope with the invoice tucked inside */}
        <section aria-label="Invoice" className="lg:sticky lg:top-[calc(var(--xso-header-h)+2rem)]">
          <p className="mb-3 font-receipt text-[11px] uppercase tracking-[0.24em] text-[#a89c8a]">
            Your order · sealed for delivery
          </p>
          <div className="relative mx-auto max-w-[420px] pt-2 lg:pt-10">
            <motion.div
              initial={reduce ? false : { y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.1 }}
              className="relative z-10 mx-4 -mb-24 sm:mx-6"
            >
              <div className="paper-card rotate-[-1.2deg] px-5 pb-28 pt-5 font-receipt text-[13px] text-[#2b2825]">
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-[#cbbd9f] pb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#8a7b66]">Invoice</p>
                    <p className="font-serif text-[22px] font-semibold leading-tight">{theme.title}</p>
                  </div>
                  <p className="shrink-0 text-right text-[10px] uppercase leading-relaxed tracking-[0.16em] text-[#8a7b66]">
                    No. {invoice}
                    <br />
                    {theme.code}
                  </p>
                </div>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 py-3 text-[12px] uppercase">
                  <dt className="text-[#8a7b66]">For</dt>
                  <dd className="truncate text-right">{customerName || '—'}</dd>
                  <dt className="text-[#8a7b66]">From</dt>
                  <dd className="truncate text-right">{billerName || '—'}</dd>
                  <dt className="text-[#8a7b66]">Occasion</dt>
                  <dd className="truncate text-right">{occasion || '—'}</dd>
                  <dt className="text-[#8a7b66]">Plays as</dt>
                  <dd className="truncate text-right">{displayTitle(cart)}</dd>
                </dl>
                <div className="space-y-1 border-t border-dashed border-[#cbbd9f] pt-3">
                  <p className="flex justify-between gap-3">
                    <span>Souvenir deck · 4 memories</span>
                    <span className="tabular-nums">{digital.price}</span>
                  </p>
                  {printExtra > 0 ? (
                    <p className="flex justify-between gap-3">
                      <span>Printed box + shipping</span>
                      <span className="tabular-nums">+{centsToPrice(printExtra)}</span>
                    </p>
                  ) : null}
                  <p className="mt-2 flex justify-between gap-3 border-t border-[#2b2825] pt-2 text-[15px] font-bold">
                    <span>Total</span>
                    <span className="tabular-nums text-[#c85a32]">{option.price}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="kraft relative z-20 h-44 overflow-hidden rounded-b-[18px] rounded-t-[6px]">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-full bg-[#8a6746]/60"
                style={{ clipPath: 'polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)' }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                <p className="font-hand text-[22px] leading-none text-[#3a2a1b]/80">
                  for {customerName || 'someone special'}
                </p>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c85a32] font-serif text-[15px] font-bold italic text-[#f7f4eb] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3),0_3px_8px_rgba(0,0,0,0.35)]">
                  X
                </span>
              </div>
            </div>
          </div>
        </section>

        <form ref={formRef} onSubmit={pay} noValidate className="space-y-6">
          <div>
            <h1 className="font-serif text-[30px] font-semibold leading-[1.1] text-[#f7f4eb]">
              How should it <em className="font-normal text-[#e2b48f]">arrive?</em>
            </h1>
            <p className="mt-2 text-[15px] text-[#b3a794]">
              Every order includes the private digital link. Add the printed box for a keepsake they can hold.
            </p>
          </div>

          <fieldset>
            <legend className="sr-only">Delivery</legend>
            <div className="grid gap-3">
              {(['digital', 'physical'] as const).map((id) => {
                const item = DELIVERY_OPTIONS[id];
                const selected = delivery === id;
                const Icon = id === 'digital' ? Mail : Package;
                return (
                  <label
                    key={id}
                    className={`delivery-option relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-[background-color,border-color,transform] duration-150 active:scale-[0.99] ${
                      selected
                        ? 'border-[#c85a32] bg-[#f7f4eb] text-[#2b2825] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]'
                        : 'border-[#3a3632] bg-[#22201d] text-[#efe7d7] hover:border-[#5a534b]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={id}
                      checked={selected}
                      onChange={() => {
                        setDelivery(id);
                        setError(null);
                      }}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        selected ? 'bg-[#c85a32] text-[#f7f4eb]' : 'bg-[#2c2926] text-[#a89c8a]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-serif text-[18px] font-semibold leading-tight">{item.label}</span>
                        <span
                          className={`shrink-0 font-receipt text-[15px] font-bold tabular-nums ${
                            selected ? 'text-[#c85a32]' : 'text-[#e2b48f]'
                          }`}
                        >
                          {item.price}
                        </span>
                      </span>
                      <span
                        className={`mt-1 block text-[13px] leading-snug ${
                          selected ? 'text-[#6b6257]' : 'text-[#a89c8a]'
                        }`}
                      >
                        {item.blurb}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {delivery === 'physical' ? (
            <motion.fieldset
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="paper-panel p-4 sm:p-5"
            >
              <legend className="sr-only">Shipping address</legend>
              <p className="mb-3 font-serif text-[20px] font-semibold text-[#2b2825]">Ship the box to</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SHIPPING_LAYOUT.map(({ key, span, auto }) => (
                  <label key={key} className={`grid gap-1.5 ${span}`}>
                    <span className="font-receipt text-[11px] uppercase tracking-[0.14em] text-[#7a6c58]">
                      {SHIPPING_LABELS[key]}
                    </span>
                    <input
                      name={key}
                      autoComplete={`shipping ${auto}`}
                      className="paper-field"
                      value={shipping[key]}
                      maxLength={120}
                      aria-invalid={missing === key || undefined}
                      onChange={(e) => {
                        const value = e.target.value;
                        setShipping((prev) => ({ ...prev, [key]: value }));
                        if (missing === key) {
                          setMissing(null);
                          setError(null);
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-[#7a6c58]">
                Printed on linen card stock and shipped within 5–7 business days.
              </p>
            </motion.fieldset>
          ) : null}

          <p className="flex items-center gap-2 font-receipt text-[11px] uppercase tracking-[0.14em] text-[#7d7264]">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Secure payment by Lemon Squeezy
          </p>
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </div>

      <DeskDock>
        <div className="flex items-center justify-between gap-3 font-receipt text-[11px] uppercase tracking-[0.12em] text-[#b3a794]">
          <span className="truncate">{option.label}</span>
          <span className="shrink-0 font-bold tabular-nums text-[#efe7d7]">{option.price}</span>
        </div>
        {error ? (
          <p role="alert" className="-mt-1 text-center text-[12px] text-[#f0a383]">
            {error}
          </p>
        ) : null}
        <MatteCta
          onClick={() => void pay()}
          loading={busy}
          label="Pay & seal it"
          price={option.price}
          loadingLabel="Sealing the envelope…"
          ariaLabel={`Pay ${option.price} for ${option.label}`}
        />
      </DeskDock>
    </>
  );
}
