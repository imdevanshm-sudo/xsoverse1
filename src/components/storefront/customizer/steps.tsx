'use client';

import { memo } from 'react';
import { Check, Clapperboard, Lock, RotateCcw } from 'lucide-react';
import { CARTRIDGES, displayTitle } from '@/lib/cartridges';
import { DEFAULT_CARDS, FORMAT_CARDS, MIN_CARDS, type CardId } from '@/lib/formatCards';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import { ORDER_FORMATS, toGiftStyle, type OrderFormat } from '@/types/order';
import { formatPrice, styleTier, TIERS, type Quote } from '@/lib/pricing';

const LABEL = 'font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]';

/** Step 1: the five formats, each with its still, tagline and how it plays. */
export const FormatStep = memo(function FormatStep({
  format,
  onFormat,
}: {
  format: OrderFormat;
  onFormat: (format: OrderFormat) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Format" className="grid gap-2.5">
      {ORDER_FORMATS.map((id, i) => {
        const style = toGiftStyle(id);
        const cart = CARTRIDGES.find((c) => c.id === style);
        if (!cart) return null;
        const selected = id === format;
        const deluxe = styleTier(style) === 'deluxe';
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onFormat(id)}
            className={`flex items-stretch gap-3 rounded-2xl border p-2.5 text-left transition-transform active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4] ${
              selected
                ? deluxe
                  ? 'border-[#fbbf24] bg-[#2a1a10]'
                  : 'border-[#ec4899] bg-[#2e1620]'
                : deluxe
                  ? 'border-[#fbbf24]/35 bg-[#21131b]'
                  : 'border-white/10 bg-[#21131b]'
            }`}
          >
            <span className="relative w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-[#1a0f14] [aspect-ratio:4/5]">
              <StyleThumb style={style} sizes="72px" priority={i < 3} />
            </span>
            <span className="min-w-0 flex-1 py-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-receipt text-[12px] font-bold uppercase tracking-[0.12em] text-[#fdf2f8]">
                    {displayTitle(cart)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-receipt text-[9.5px] font-bold uppercase tracking-[0.14em] ${
                      deluxe ? 'bg-[#fbbf24] text-[#2a1a10]' : 'bg-white/10 text-[#c99aae]'
                    }`}
                  >
                    {deluxe ? TIERS.deluxe.name : 'Included'}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? deluxe
                        ? 'border-[#fbbf24] bg-[#fbbf24]'
                        : 'border-[#ec4899] bg-[#ec4899]'
                      : 'border-white/25'
                  }`}
                >
                  {selected ? (
                    <Check
                      className={`h-3 w-3 ${deluxe ? 'text-[#2a1a10]' : 'text-white'}`}
                      strokeWidth={3}
                    />
                  ) : null}
                </span>
              </span>
              <span className="mt-0.5 block font-serif text-[15px] font-semibold leading-snug text-[#fed7aa]">
                {cart.tagline}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
});

/**
 * Which cards the format deals. The last cards a format needs are locked on;
 * `chips` is the compact row under the final preview.
 */
export const CardChecklist = memo(function CardChecklist({
  format,
  cards,
  onCards,
  variant = 'list',
}: {
  format: OrderFormat;
  cards: CardId[];
  onCards: (cards: CardId[], toggled?: CardId) => void;
  variant?: 'list' | 'chips';
}) {
  const style = toGiftStyle(format);
  const all = FORMAT_CARDS[style];
  const atMin = cards.length <= MIN_CARDS[style];
  const toggle = (id: CardId) => {
    const on = cards.includes(id);
    if (on && atMin) return;
    const next = all.map((c) => c.id).filter((c) => (c === id ? !on : cards.includes(c)));
    onCards(next, on ? undefined : id);
  };
  const isDefault =
    cards.length === DEFAULT_CARDS[style].length &&
    DEFAULT_CARDS[style].every((id) => cards.includes(id));

  if (variant === 'chips') {
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cards in your XSO">
        {all.map((card) => {
          const on = cards.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              aria-pressed={on}
              disabled={on && atMin}
              onClick={() => toggle(card.id)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed ${
                on
                  ? 'border-[#ec4899] bg-[#ec4899]/15 text-[#fdf2f8]'
                  : 'border-white/15 text-[#c99aae] hover:border-white/30'
              }`}
            >
              {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
              {card.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className={LABEL}>
          {cards.length} of {all.length} cards
        </p>
        <button
          type="button"
          onClick={() => onCards([...DEFAULT_CARDS[style]])}
          disabled={isDefault}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[12.5px] font-semibold text-[#e0b4c6] transition-colors hover:border-white/30 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset
        </button>
      </div>
      <ul className="mt-2 grid gap-2">
        {all.map((card) => {
          const on = cards.includes(card.id);
          const locked = on && atMin;
          return (
            <li key={card.id}>
              <label
                className={`flex min-h-[3.5rem] cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors ${
                  on ? 'border-[#ec4899]/70 bg-[#2e1620]' : 'border-white/10 bg-[#21131b]'
                } ${locked ? 'cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={on}
                  disabled={locked}
                  onChange={() => toggle(card.id)}
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
                  <span className="block text-[15px] font-semibold leading-tight text-[#fdf2f8]">
                    {card.label}
                  </span>
                  <span className="block text-[12.5px] leading-snug text-[#c99aae]">
                    {card.detail}
                  </span>
                </span>
                {locked ? (
                  <Lock className="h-4 w-4 shrink-0 text-[#9a6a7e]" aria-label="Required" />
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

/** Live total under the stack: which tier the picks land in, and the one step up from it. */
export const TierMeter = memo(function TierMeter({
  format,
  cards,
  price,
  onDeluxe,
}: {
  format: OrderFormat;
  cards: CardId[];
  price: Quote;
  onDeluxe: () => void;
}) {
  const total = FORMAT_CARDS[toGiftStyle(format)].length;
  const tier = TIERS[price.tier];
  const step =
    price.tier === 'single'
      ? `Add another card for the Full Stack (+${formatPrice(TIERS.full.prices[price.currency] - price.base, price.currency)}).`
      : price.tier === 'full' && cards.length < total
        ? 'The Full Stack includes every card. Add the rest at no extra cost.'
        : price.tier === 'deluxe'
          ? 'Deluxe includes background music.'
          : null;
  return (
    <div className="mt-4 grid gap-3">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#21131b] px-4 py-3"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-[16px] font-semibold text-[#fdf2f8]">{tier.name}</span>
            {tier.badge ? (
              <span className="rounded-full bg-[#ec4899]/20 px-2 py-0.5 font-receipt text-[10px] uppercase tracking-[0.14em] text-[#f9a8d4]">
                {tier.badge}
              </span>
            ) : null}
          </span>
          {step ? (
            <span className="mt-0.5 block text-[12.5px] leading-snug text-[#c99aae]">{step}</span>
          ) : null}
        </span>
        <span className="shrink-0 font-receipt text-[17px] font-bold tabular-nums text-[#fdba74]">
          {formatPrice(price.base, price.currency)}
        </span>
      </div>
      {price.tier !== 'deluxe' ? (
        <button
          type="button"
          onClick={onDeluxe}
          className="flex min-h-[3rem] items-center gap-3 rounded-2xl border border-dashed border-[#fbbf24]/40 px-4 py-2.5 text-left transition-colors hover:border-[#fbbf24]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
        >
          <Clapperboard className="h-4 w-4 shrink-0 text-[#fbbf24]" aria-hidden />
          <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#e0b4c6]">
            <span className="font-semibold text-[#fde68a]">Go Deluxe</span>: play it as a Movie Box,
            with background music.
          </span>
          <span className="shrink-0 font-receipt text-[12px] font-bold tabular-nums text-[#fde68a]">
            {formatPrice(TIERS.deluxe.prices[price.currency], price.currency)}
          </span>
        </button>
      ) : null}
    </div>
  );
});
