'use client';

import { memo, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { FORMAT_CARDS, type CardId } from '@/lib/formatCards';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import {
  ADD_ONS,
  ADD_ON_ORDER,
  addOnPrice,
  formatPrice,
  TIERS,
  type AddOnId,
  type CurrencyCode,
  type Quote,
} from '@/lib/pricing';
import type { GiftStyle } from '@/types/xso';

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
        {price.addOns.map((line) => (
          <li key={line.id} className="flex justify-between gap-3">
            <span className="truncate">+ {line.label}</span>
            <span className="shrink-0 tabular-nums">
              {line.amount ? money(line.amount) : 'free'}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap justify-between gap-x-3 border-t border-[#2d1b22] pt-2 text-[14px] font-bold">
        <span>Priceless</span>
        <span className="tabular-nums text-[#be185d]">(billed: {money(price.total)})</span>
      </p>
    </div>
  );
});

/** Optional extras at the final check; a checked one unfolds its own fields underneath. */
export function AddOnChecklist({
  selected,
  onToggle,
  currency,
  details,
}: {
  selected: readonly AddOnId[];
  onToggle: (id: AddOnId, on: boolean) => void;
  currency: CurrencyCode;
  details?: (id: AddOnId) => ReactNode;
}) {
  return (
    <section aria-labelledby="addons-title" className="grid gap-2">
      <h3 id="addons-title" className="font-serif text-[1.05rem] font-semibold leading-tight">
        Add-ons
      </h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {ADD_ON_ORDER.map((id) => {
          const spec = ADD_ONS[id];
          const on = selected.includes(id);
          return (
            <li
              key={id}
              className={`rounded-2xl border ${on ? 'border-[#ec4899]/55 bg-[#2a1520]' : 'border-white/10 bg-[#21131b]'}`}
            >
              {/* `relative` keeps the sr-only checkbox in this row; otherwise focusing it scrolls the dialog. */}
              <label className="relative flex min-h-[3.5rem] cursor-pointer items-center gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => onToggle(id, e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#f9a8d4] ${on ? 'border-[#ec4899] bg-[#ec4899] text-white' : 'border-white/25'}`}
                >
                  {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold leading-tight text-[#fdf2f8]">
                    {spec.label}
                  </span>
                  <span className="block text-[12.5px] leading-snug text-[#c99aae]">
                    {spec.description}
                  </span>
                </span>
                <span className="shrink-0 font-receipt text-[13px] font-bold tabular-nums text-[#fdf2f8]">
                  {addOnPrice(id, currency)}
                </span>
              </label>
              {on && details ? <div className="px-3 pb-3">{details(id)}</div> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
