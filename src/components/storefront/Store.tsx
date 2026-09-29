'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useXsoStore } from '@/store/useXsoStore';
import {
  CARTRIDGE_PRICE,
  CARTRIDGES,
  displayTitle,
  getCartridge,
} from '@/lib/cartridges';
import { THEMES, type ThemeId } from '@/lib/themes';
import { DeckBox } from '@/components/storefront/DeckBox';
import type { GiftStyle } from '@/types/xso';

/** Store & template gallery: pick a format, then tap a story deck. */
export function Store() {
  const router = useRouter();
  const giftStyle = useXsoStore((s) => s.giftStyle);
  const setField = useXsoStore((s) => s.setField);
  const applyTheme = useXsoStore((s) => s.applyTheme);
  const [pending, startTransition] = useTransition();
  const format = getCartridge(giftStyle);

  const openDeck = useCallback(
    (id: ThemeId) => {
      applyTheme(id);
      const style = useXsoStore.getState().giftStyle;
      startTransition(() => {
        router.push(`/preview?style=${encodeURIComponent(style)}&theme=${id}`);
      });
    },
    [applyTheme, router],
  );

  return (
    <main className="desk min-app-h" aria-busy={pending}>
      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-6 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between gap-4">
          <p className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-[#f7f4eb]">
              XSO
            </span>
            <span className="font-receipt text-[11px] uppercase tracking-[0.2em] text-[#a89c8a]">
              Experience Souvenir
            </span>
          </p>
          <span className="rotate-[-3deg] rounded-md border-2 border-[#c85a32]/70 px-2 py-0.5 font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-[#e2b48f]">
            Est. 2026
          </span>
        </header>

        <section className="mt-10 max-w-2xl sm:mt-14">
          <h1 className="font-serif text-[2.4rem] font-semibold leading-[1.04] tracking-tight text-[#f7f4eb] sm:text-6xl">
            Keepsakes you can hold,{' '}
            <em className="font-medium text-[#e2b48f]">even through a screen.</em>
          </h1>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-[#b3a794]">
            Four printed-feel memory cards — a receipt, an audit, a photo strip
            and a letter — shuffled into one interactive souvenir, for {CARTRIDGE_PRICE}.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="format-heading">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="format-heading"
              className="font-receipt text-[11px] uppercase tracking-[0.22em] text-[#a89c8a]"
            >
              <span className="text-[#e2b48f]">1</span> · Choose how it plays
            </h2>
            <p className="shrink-0 font-receipt text-[11px] tracking-[0.14em] text-[#7d7264]">
              {format.code}
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Souvenir format"
            className="-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0"
          >
            {CARTRIDGES.map((cart) => {
              const selected = cart.id === giftStyle;
              return (
                <button
                  key={cart.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setField('giftStyle', cart.id as GiftStyle)}
                  className={`min-w-[8.5rem] shrink-0 snap-start touch-manipulation rounded-2xl border px-3.5 py-3 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.98] sm:min-w-0 ${
                    selected
                      ? 'border-[#e3d9c5] bg-[#f7f4eb] text-[#2b2825] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]'
                      : 'border-[#3a3632] bg-[#22201d] text-[#efe7d7] hover:border-[#5a534b]'
                  }`}
                >
                  <span
                    className={`block font-receipt text-[10px] uppercase tracking-[0.18em] ${
                      selected ? 'text-[#c85a32]' : 'text-[#7d7264]'
                    }`}
                  >
                    {cart.code}
                  </span>
                  <span className="mt-1 block font-serif text-[18px] font-semibold leading-tight">
                    {displayTitle(cart)}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[12px] ${
                      selected ? 'text-[#6b6257]' : 'text-[#8a7f70]'
                    }`}
                  >
                    {cart.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="decks-heading">
          <h2
            id="decks-heading"
            className="mb-3 font-receipt text-[11px] uppercase tracking-[0.22em] text-[#a89c8a]"
          >
            <span className="text-[#e2b48f]">2</span> · Pick a story deck
          </h2>
          <div className="felt px-4 pb-8 pt-10 sm:px-8">
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className="w-[78%] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none"
                >
                  <DeckBox
                    theme={theme}
                    styleLabel={displayTitle(format)}
                    onOpen={() => openDeck(theme.id)}
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center font-receipt text-[11px] uppercase tracking-[0.16em] text-[#7d7264]">
            Every deck is fully editable in the studio
          </p>
        </section>
      </div>
    </main>
  );
}

/** @deprecated Prefer `Store`. */
export const RetroStorefront = Store;
