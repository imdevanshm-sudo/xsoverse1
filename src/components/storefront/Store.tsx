'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useTransition, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useXsoStore } from '@/store/useXsoStore';
import { CARTRIDGE_PRICE, CARTRIDGES, displayTitle, getCartridge } from '@/lib/cartridges';
import { THEMES, getTheme, type ThemeId } from '@/lib/themes';
import { DeckBox } from '@/components/storefront/DeckBox';
import { StyleDemo } from '@/components/storefront/StyleDemo';
import { MatteCta } from '@/components/desk/MatteCta';
import type { GiftStyle } from '@/types/xso';

const previewHref = (style: GiftStyle, theme: ThemeId) =>
  `/preview?style=${encodeURIComponent(style)}&theme=${theme}`;
const customizeHref = (style: GiftStyle) => `/customize?style=${encodeURIComponent(style)}`;

/** Static studio shadow + tinted rim; only the layer's opacity animates between styles. */
const studioShadow = (glow: string) =>
  [
    '0 44px 80px -32px rgba(0,0,0,0.9)',
    '0 18px 36px -18px rgba(0,0,0,0.7)',
    `0 0 0 1px ${glow}55`,
    `0 0 56px -12px ${glow}66`,
  ].join(', ');

/** Store & template gallery: pick a format, then tap a story deck. */
export function Store() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const giftStyle = useXsoStore((s) => s.giftStyle);
  const themeId = useXsoStore((s) => s.themeId);
  const setField = useXsoStore((s) => s.setField);
  const applyTheme = useXsoStore((s) => s.applyTheme);
  const [pending, startTransition] = useTransition();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const format = getCartridge(giftStyle);
  const activeTheme = getTheme(themeId) ?? THEMES[0];

  useEffect(() => {
    router.prefetch('/preview');
    router.prefetch('/customize');
    router.prefetch('/checkout');
  }, [router]);

  const selectStyle = useCallback((style: GiftStyle) => setField('giftStyle', style), [setField]);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = CARTRIDGES.length;
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % count,
      ArrowDown: (index + 1) % count,
      ArrowLeft: (index - 1 + count) % count,
      ArrowUp: (index - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectStyle(CARTRIDGES[next].id as GiftStyle);
    tabRefs.current[next]?.focus({ preventScroll: true });
  };

  // Keep the selected format visible inside the horizontally scrolling tab row (mobile),
  // without scrolling the page itself.
  useEffect(() => {
    const tab = tabRefs.current[CARTRIDGES.findIndex((c) => c.id === giftStyle)];
    const row = tab?.parentElement;
    if (!tab || !row || row.scrollWidth <= row.clientWidth) return;
    const left = tab.offsetLeft - 20;
    const right = tab.offsetLeft + tab.offsetWidth + 20 - row.clientWidth;
    if (row.scrollLeft > left) row.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
    else if (row.scrollLeft < right)
      row.scrollTo({ left: right, behavior: reduce ? 'auto' : 'smooth' });
  }, [giftStyle, reduce]);

  const goWithDeck = useCallback(
    (id: ThemeId, destination: 'preview' | 'customize') => {
      applyTheme(id);
      const style = useXsoStore.getState().giftStyle;
      startTransition(() => {
        router.push(destination === 'preview' ? previewHref(style, id) : customizeHref(style));
      });
    },
    [applyTheme, router],
  );

  return (
    <main className="desk min-app-h" aria-busy={pending}>
      <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-5 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between gap-4 border-b border-[#3a3632]/70 pb-4">
          <Link
            href="/"
            className="group flex min-h-[44px] min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2b48f]"
            aria-label="XSO by XSOVERSE, home"
          >
            <span className="font-serif text-[1.7rem] font-bold leading-none tracking-tight text-[#f7f4eb]">
              XSO
            </span>
            <span aria-hidden className="h-7 w-px shrink-0 bg-[#4a443d]" />
            <span className="min-w-0 font-receipt text-[10px] uppercase leading-tight tracking-[0.22em] text-[#a89c8a] sm:text-[11px]">
              <span className="font-bold text-[#e2b48f]">XSOVERSE</span>
              <span className="text-[#6f665a]">{' // '}</span>
              <span className="block sm:inline">Experience Souvenir</span>
            </span>
          </Link>
          <span className="hidden shrink-0 rotate-[-3deg] rounded-md border-2 border-[#c85a32]/70 px-2 py-0.5 font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-[#e2b48f] min-[400px]:inline-block">
            Est. 2026
          </span>
        </header>

        <section className="mt-6 max-w-2xl sm:mt-12">
          <p className="mb-2.5 font-receipt text-[10px] uppercase tracking-[0.22em] text-[#9daf88] sm:mb-4 sm:text-[11px]">
            Experience + Souvenir <span className="text-[#6f665a]">=</span> XSO
          </p>
          <h1 className="text-balance font-serif text-[2.15rem] font-semibold leading-[1.02] tracking-[-0.02em] text-[#f7f4eb] sm:text-6xl">
            Keepsakes for the words <em className="font-medium text-[#e2b48f]">you never said.</em>
          </h1>
          <p className="mt-3 max-w-lg text-pretty text-[15px] leading-[1.6] text-[#b3a794] sm:mt-4 sm:text-[16px]">
            Some feelings don&apos;t fit in a text. An XSO gives them a shape you can hold: a
            receipt of the moments you shared, an audit of who they are to you, a strip of faces and
            a letter that finally says it. Made once, for one person, for {CARTRIDGE_PRICE}.
          </p>
        </section>

        <section className="mt-7 sm:mt-10" aria-labelledby="format-heading">
          <div className="mb-2 flex items-baseline justify-between gap-3 sm:mb-3">
            <h2
              id="format-heading"
              className="font-receipt text-[11px] uppercase tracking-[0.22em] text-[#a89c8a]"
            >
              <span className="text-[#e2b48f]">1</span> · How should it unfold?
            </h2>
            <p className="shrink-0 font-receipt text-[11px] tracking-[0.14em] text-[#7d7264]">
              {format.code}
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Souvenir format"
            className="relative -mx-5 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-2 pt-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0"
          >
            {CARTRIDGES.map((cart, index) => {
              const selected = cart.id === giftStyle;
              return (
                <button
                  key={cart.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectStyle(cart.id as GiftStyle)}
                  onKeyDown={(e) => onTabKey(e, index)}
                  className={`min-h-[76px] min-w-[8.5rem] shrink-0 snap-start touch-manipulation rounded-2xl border px-3.5 py-3 text-left transition-transform duration-200 ease-out will-change-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2b48f] active:scale-[0.97] sm:min-w-0 ${
                    selected
                      ? 'border-[#e3d9c5] bg-[#f7f4eb] text-[#2b2825] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]'
                      : 'border-[#3a3632] bg-[#22201d] text-[#efe7d7] hover:-translate-y-0.5 hover:border-[#6a6158] hover:bg-[#2a2723]'
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
                    className={`mt-0.5 block text-[12px] leading-snug ${
                      selected ? 'text-[#6b6257]' : 'text-[#8a7f70]'
                    }`}
                  >
                    {cart.caption}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative mt-3 sm:mt-4">
            <AnimatePresence initial={false}>
              <motion.div
                key={`glow-${giftStyle}`}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{ boxShadow: studioShadow(format.glow) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: 'easeOut' }}
              />
            </AnimatePresence>
            <div
              className="relative grid overflow-hidden rounded-3xl border border-[#3a3632] bg-[#1f1d1a] md:grid-cols-[1.1fr_1fr]"
              aria-live="polite"
            >
              <StyleDemo style={giftStyle} glow={format.glow} />
              <div className="relative flex flex-col p-4 sm:p-7 md:min-h-[260px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={giftStyle}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p
                      className="font-receipt text-[10px] uppercase tracking-[0.22em]"
                      style={{ color: format.glow }}
                    >
                      {format.code} · {format.year} · {format.subtitle}
                    </p>
                    <h3 className="mt-1.5 font-serif text-[1.75rem] font-semibold leading-none tracking-[-0.015em] text-[#f7f4eb] sm:mt-2 sm:text-[1.9rem]">
                      {displayTitle(format)}
                    </h3>
                    <p className="mt-1.5 font-hand text-[20px] leading-tight text-[#e2b48f] sm:mt-2 sm:text-[21px]">
                      {format.tagline}
                    </p>
                    <p className="mt-2.5 text-pretty text-[14.5px] leading-[1.6] text-[#b3a794] sm:mt-3 sm:text-[15px]">
                      {format.description}
                    </p>
                    <p className="mt-3.5 font-receipt text-[10px] uppercase tracking-[0.16em] text-[#8a7f70] sm:mt-4 sm:text-[11px]">
                      <span style={{ color: format.glow }}>● Slot A · Ready</span>
                      <span className="text-[#5a534b]"> / </span>
                      <span className="font-bold text-[#efe7d7]">{activeTheme.title}</span>
                    </p>
                    <p className="mt-1 font-serif text-[14px] italic text-[#8a7f70]">
                      Loaded, and waiting for your words.
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-4 grid gap-2 sm:mt-5 sm:gap-2.5">
                  <MatteCta
                    key={`preview-${giftStyle}-${themeId}`}
                    href={previewHref(giftStyle, themeId)}
                    label={`Experience this ${displayTitle(format)}`}
                    narrowLabel="Experience it"
                    price={CARTRIDGE_PRICE}
                    loadingLabel="Inserting the cartridge…"
                    ariaLabel={`Preview ${displayTitle(format)} with ${activeTheme.title}, ${CARTRIDGE_PRICE}`}
                  />
                  <Link
                    href={customizeHref(giftStyle)}
                    prefetch
                    className="paper-button flex min-h-[48px] touch-manipulation items-center justify-center rounded-2xl px-5 font-receipt text-[12px] font-bold uppercase tracking-[0.16em] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2b48f] active:scale-[0.98]"
                  >
                    Craft this {displayTitle(format)} XSO →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 sm:mt-12" aria-labelledby="decks-heading">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="decks-heading"
              className="font-receipt text-[11px] uppercase tracking-[0.22em] text-[#a89c8a]"
            >
              <span className="text-[#e2b48f]">2</span> · Start from a story
            </h2>
            <p className="shrink-0 font-receipt text-[11px] tracking-[0.14em] text-[#7d7264]">
              Unfolds as {displayTitle(format)}
            </p>
          </div>
          <div className="felt px-4 pb-6 pt-12 sm:px-8">
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pt-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className="w-[78%] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none"
                >
                  <DeckBox
                    theme={theme}
                    styleLabel={displayTitle(format)}
                    loaded={theme.id === themeId}
                    onOpen={() => goWithDeck(theme.id, 'preview')}
                    onCustomize={() => goWithDeck(theme.id, 'customize')}
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center font-receipt text-[11px] uppercase tracking-[0.16em] text-[#7d7264]">
            Every deck is just a first draft · the words are yours
          </p>
        </section>
      </div>
    </main>
  );
}

/** @deprecated Prefer `Store`. */
export const RetroStorefront = Store;
