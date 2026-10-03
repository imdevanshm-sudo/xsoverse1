'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { FORMAT_CARDS, type CardId } from '@/lib/formatCards';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { ADD_ONS, addOnsFor, formatPrice, TIERS, type AddOnId, type Quote } from '@/lib/pricing';
import type { GiftStyle } from '@/types/xso';

const LABEL = 'font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]';

/** The order as a receipt: what's in it, what it's worth, and what it costs. */
export const OrderReceipt = memo(function OrderReceipt({
  style,
  cards,
  price,
}: {
  style: GiftStyle;
  cards: CardId[];
  price: Quote;
}) {
  const picked = FORMAT_CARDS[style].filter((c) => cards.includes(c.id));
  const money = (n: number) => formatPrice(n, price.currency);
  return (
    <div className="paper-card rotate-[-0.6deg] px-5 py-4 font-receipt text-[12.5px] uppercase text-[#2d1b22]">
      <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#e8bfd0] pb-2">
        <span className="font-bold tracking-[0.08em]">{TIERS[price.tier].name}</span>
        <span className="text-[10px] tracking-[0.16em] text-[#9a6b7b]">
          {displayTitle(getCartridge(style))}
        </span>
      </div>
      <ul className="space-y-0.5 py-2">
        {picked.map((card) => (
          <li key={card.id} className="flex justify-between gap-3">
            <span className="truncate">1x {card.label}</span>
            <span className="shrink-0 text-[#9a6b7b]">incl.</span>
          </li>
        ))}
        {price.addOns.map((addOn) => (
          <li key={addOn.id} className="flex justify-between gap-3">
            <span className="truncate">+ {ADD_ONS[addOn.id].name}</span>
            <span className="shrink-0 tabular-nums">
              {addOn.amount ? money(addOn.amount) : 'incl.'}
            </span>
          </li>
        ))}
        {price.discount ? (
          <li className="flex justify-between gap-3 text-[#be185d]">
            <span className="truncate">Gift-back offer</span>
            <span className="shrink-0 tabular-nums">−{money(price.discount)}</span>
          </li>
        ) : null}
      </ul>
      <p className="flex flex-wrap justify-between gap-x-3 border-t border-[#2d1b22] pt-2 text-[14px] font-bold">
        <span>Priceless</span>
        <span className="tabular-nums text-[#be185d]">(billed: {money(price.total)})</span>
      </p>
    </div>
  );
});

/** Optional extras, each priced from the pricing config. */
export const AddOnPicker = memo(function AddOnPicker({
  price,
  selected,
  onToggle,
  deliverAt,
  onDeliverAt,
}: {
  price: Quote;
  selected: AddOnId[];
  onToggle: (id: AddOnId) => void;
  deliverAt: string;
  onDeliverAt: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className={`mb-2 ${LABEL}`}>Add-ons</legend>
      <ul className="grid gap-2">
        {addOnsFor(price.tier).map((addOn) => {
          const on = selected.includes(addOn.id);
          return (
            <li key={addOn.id}>
              <label
                className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors ${
                  on ? 'border-[#ec4899]/70 bg-[#2e1620]' : 'border-white/10 bg-[#21131b]'
                }`}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={on}
                  onChange={() => onToggle(addOn.id)}
                />
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#f9a8d4] ${
                    on ? 'border-[#ec4899] bg-[#ec4899]' : 'border-white/25'
                  }`}
                >
                  {on ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold leading-tight text-[#fdf2f8]">
                    {addOn.name}
                  </span>
                  <span className="block text-[12.5px] leading-snug text-[#c99aae]">
                    {addOn.detail}
                  </span>
                </span>
                <span className="shrink-0 font-receipt text-[12.5px] font-bold tabular-nums text-[#fdba74]">
                  +{formatPrice(addOn.prices[price.currency], price.currency)}
                </span>
              </label>
              {addOn.id === 'schedule' && on ? (
                <label className="mt-2 block pl-1">
                  <span className={LABEL}>Send on</span>
                  <input
                    type="datetime-local"
                    value={deliverAt}
                    min={localNow()}
                    onChange={(e) => onDeliverAt(e.target.value)}
                    className="mt-1 block min-h-[2.75rem] w-full rounded-xl border border-white/15 bg-[#21131b] px-3 text-[15px] text-[#fdf2f8] [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
                  />
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
});

/** `datetime-local` value for the current minute in the visitor's time zone. */
function localNow(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/** A scheduled time is usable once it's set and still in the future. */
export function validDeliverAt(value: string): boolean {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > Date.now();
}
