'use client';

import { memo } from 'react';
import { FORMAT_CARDS, type CardId } from '@/lib/formatCards';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { formatPrice, TIERS, type Quote } from '@/lib/pricing';
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
      </ul>
      <p className="flex flex-wrap justify-between gap-x-3 border-t border-[#2d1b22] pt-2 text-[14px] font-bold">
        <span>Priceless</span>
        <span className="tabular-nums text-[#be185d]">(billed: {money(price.total)})</span>
      </p>
    </div>
  );
});
