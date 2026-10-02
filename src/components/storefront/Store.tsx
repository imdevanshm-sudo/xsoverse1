'use client';

import Link from 'next/link';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useTransition,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, Zap } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { useExpressOrder } from '@/store/useExpressOrder';
import { useMediaQuery } from '@/hooks/useTouchSpring';
import {
  CARTRIDGE_PRICE,
  CARTRIDGES,
  displayTitle,
  getCartridge,
  type CartridgeSpec,
} from '@/lib/cartridges';
import { THEMES, getTheme, type ThemeId } from '@/lib/themes';
import { DeckBox } from '@/components/storefront/DeckBox';
import { StyleDemo } from '@/components/storefront/StyleDemo';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import { HeroReel } from '@/components/storefront/HeroReel';
import { StickyExpressBar } from '@/components/storefront/StickyExpressBar';
import { ExpressOrderHost } from '@/components/storefront/ExpressOrderHost';
import { MatteCta } from '@/components/desk/MatteCta';
import { CINEMATIC, FORMAT_SWAP } from '@/lib/motion';
import type { GiftStyle } from '@/types/xso';

const previewHref = (style: GiftStyle, theme: ThemeId) =>
  `/preview?style=${encodeURIComponent(style)}&theme=${theme}`;
const customizeHref = (style: GiftStyle) => `/customize?style=${encodeURIComponent(style)}`;

/** Static studio shadow + tinted rim; only the layer's opacity animates between styles. */
/** Store & template gallery: pick a format, then tap a story deck. */
export function Store() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const giftStyle = useXsoStore((s) => s.giftStyle);
  const themeId = useXsoStore((s) => s.themeId);
  const setField = useXsoStore((s) => s.setField);
  const applyTheme = useXsoStore((s) => s.applyTheme);
  const openExpress = useExpressOrder((s) => s.openWith);
  const desktop = useMediaQuery('(min-width: 768px)');
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

  const onTabKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
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
    },
    [selectStyle],
  );

  const setTabRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    tabRefs.current[index] = el;
  }, []);

  const expressStyle = useCallback(
    () => openExpress({ style: useXsoStore.getState().giftStyle }),
    [openExpress],
  );
  const expressDeck = useCallback(
    (id: ThemeId) => openExpress({ style: useXsoStore.getState().giftStyle, theme: id }),
    [openExpress],
  );

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
  const openDeck = useCallback((id: ThemeId) => goWithDeck(id, 'preview'), [goWithDeck]);
  const customizeDeck = useCallback((id: ThemeId) => goWithDeck(id, 'customize'), [goWithDeck]);

  return (
    <main className="desk min-app-h" aria-busy={pending}>
      <div className="mx-auto w-full max-w-5xl px-5 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-8 sm:pt-8 md:pb-20">
        <header className="flex items-center justify-between gap-4 border-b border-[#4a2a35]/70 pb-4">
          <Link
            href="/"
            className="group flex min-h-[44px] min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f9a8d4]"
            aria-label="XSO by XSOVERSE, home"
          >
            <span className="font-serif text-[1.7rem] font-bold leading-none tracking-tight text-[#fdf2f8]">
              XSO
            </span>
            <span aria-hidden className="h-7 w-px shrink-0 bg-[#5a3442]" />
            <span className="min-w-0 font-receipt text-[10px] uppercase leading-tight tracking-[0.22em] text-[#c99aae] sm:text-[11px]">
              <span className="font-bold text-[#f9a8d4]">XSOVERSE</span>
              <span className="text-[#7f5466]">{' // '}</span>
              <span className="block sm:inline">Experience Souvenir</span>
            </span>
          </Link>
          <span className="hidden shrink-0 rotate-[-3deg] rounded-md border-2 border-[#ec4899]/70 px-2 py-0.5 font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-[#f9a8d4] min-[400px]:inline-block">
            Est. 2026
          </span>
        </header>

        <section className="mt-4 max-md:block md:hidden" aria-labelledby="hook-heading">
          <h1
            id="hook-heading"
            className="text-balance font-serif text-[1.9rem] font-semibold leading-[1.02] tracking-[-0.02em] text-[#fdf2f8]"
          >
            Your story, turned into a gift{' '}
            <em className="font-medium text-[#f9a8d4]">they can play.</em>
          </h1>
          <div className="mt-3 [&>div]:max-w-[min(360px,46svh)]">
            {desktop ? null : <HeroReel />}
          </div>
          <p className="mt-3 text-pretty text-[15px] leading-snug text-[#e0b4c6]">
            A digital keepsake of your story: receipts, photos and a letter, sent as a link they
            open and play.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={expressStyle}
              className="matte-cta flex min-h-[3.25rem] flex-1 touch-manipulation items-center justify-center gap-2 rounded-full px-5 font-serif text-[17px] font-semibold"
            >
              <Zap className="h-4 w-4" aria-hidden />
              Express Order
            </button>
            <span className="shrink-0 rounded-full border border-[#fdba74]/40 px-3 py-1.5 font-receipt text-[13px] font-bold tabular-nums text-[#fdba74]">
              {CARTRIDGE_PRICE}
            </span>
          </div>
          <p className="mt-2 text-center font-receipt text-[10px] uppercase tracking-[0.16em] text-[#9a6a7e]">
            60 seconds · 3 steps · ready to send
          </p>
        </section>

        <section className="mt-6 hidden max-w-2xl sm:mt-12 md:block">
          <p className="mb-2.5 font-receipt text-[10px] uppercase tracking-[0.22em] text-[#fdba74] sm:mb-4 sm:text-[11px]">
            Experience + Souvenir <span className="text-[#7f5466]">=</span> XSO
          </p>
          <h1 className="text-balance font-serif text-[2.15rem] font-semibold leading-[1.02] tracking-[-0.02em] text-[#fdf2f8] sm:text-6xl">
            Keepsakes for the words <em className="font-medium text-[#f9a8d4]">you never said.</em>
          </h1>
          <p className="mt-3 max-w-lg text-pretty text-[15px] leading-[1.6] text-[#e0b4c6] sm:mt-4 sm:text-[16px]">
            Some feelings don&apos;t fit in a text. An XSO gives them a shape you can hold: a
            receipt of the moments you shared, an audit of who they are to you, a strip of faces and
            a letter that finally says it. Made once, for one person, for {CARTRIDGE_PRICE}.
          </p>
        </section>

        <section className="mt-7 sm:mt-10" aria-labelledby="format-heading">
          <div className="mb-2 flex items-baseline justify-between gap-3 sm:mb-3">
            <h2
              id="format-heading"
              className="font-receipt text-[11px] uppercase tracking-[0.22em] text-[#c99aae]"
            >
              <span className="text-[#f9a8d4]">1</span> · How should it unfold?
            </h2>
            <p className="shrink-0 font-receipt text-[11px] tracking-[0.14em] text-[#9a6a7e]">
              {format.code}
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Souvenir format"
            className="relative -mx-5 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-2 pt-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0"
          >
            {CARTRIDGES.map((cart, index) => (
              <StyleChip
                key={cart.id}
                cart={cart}
                index={index}
                selected={cart.id === giftStyle}
                onSelect={selectStyle}
                onKey={onTabKey}
                setRef={setTabRef}
              />
            ))}
          </div>

          <div className="relative mt-3 sm:mt-4">
            <AnimatePresence initial={false}>
              <motion.div
                key={`glow-${giftStyle}`}
                aria-hidden
                className="studio-glow pointer-events-none absolute inset-0 rounded-3xl"
                style={{ '--glow': format.glow } as CSSProperties}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduce ? { duration: 0 } : CINEMATIC}
              />
            </AnimatePresence>
            <div
              className="relative grid overflow-hidden rounded-3xl border border-[#4a2a35] bg-[#211218] md:grid-cols-[1.1fr_1fr]"
              aria-live="polite"
            >
              {desktop ? (
                <StyleDemo style={giftStyle} glow={format.glow} />
              ) : (
                <Link
                  href={previewHref(giftStyle, themeId)}
                  className="felt group relative block h-[220px] overflow-hidden"
                  aria-label={`Watch ${displayTitle(format)} in motion`}
                >
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={giftStyle}
                      className="absolute inset-0"
                      initial={reduce ? false : FORMAT_SWAP.initial}
                      animate={FORMAT_SWAP.animate}
                      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : FORMAT_SWAP.exit}
                      transition={CINEMATIC}
                    >
                      <StyleThumb style={giftStyle} sizes="(max-width: 768px) 100vw, 480px" />
                    </motion.span>
                  </AnimatePresence>
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#180e15]/90 px-3 py-1.5 font-receipt text-[11px] font-bold uppercase tracking-[0.14em] text-[#fdf2f8]">
                    <Play className="h-3 w-3" aria-hidden /> Watch it
                  </span>
                </Link>
              )}
              <div className="relative flex flex-col p-4 sm:p-7 md:min-h-[260px]">
                <div className="grid flex-1">
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={giftStyle}
                      initial={reduce ? false : FORMAT_SWAP.initial}
                      animate={FORMAT_SWAP.animate}
                      exit={
                        reduce
                          ? { opacity: 0, transition: { duration: 0 } }
                          : { ...FORMAT_SWAP.exit, transition: { ...CINEMATIC, duration: 0.5 } }
                      }
                      transition={CINEMATIC}
                      className="col-start-1 row-start-1 flex origin-top-left flex-col"
                    >
                      <p
                        className="font-receipt text-[10px] uppercase tracking-[0.22em]"
                        style={{ color: format.glow }}
                      >
                        {format.code} · {format.year} · {format.subtitle}
                      </p>
                      <h3 className="mt-1.5 font-serif text-[1.75rem] font-semibold leading-none tracking-[-0.015em] text-[#fdf2f8] sm:mt-2 sm:text-[1.9rem]">
                        {displayTitle(format)}
                      </h3>
                      <p className="mt-1.5 font-hand text-[20px] leading-tight text-[#f9a8d4] sm:mt-2 sm:text-[21px]">
                        {format.tagline}
                      </p>
                      <p className="mt-2.5 text-pretty text-[14.5px] leading-[1.6] text-[#e0b4c6] sm:mt-3 sm:text-[15px]">
                        {format.description}
                      </p>
                      <p className="mt-3.5 font-receipt text-[10px] uppercase tracking-[0.16em] text-[#a8798c] sm:mt-4 sm:text-[11px]">
                        <span className="inline-flex items-center gap-1.5 text-[#fdba74]">
                          <span className="led-peach" aria-hidden />
                          Slot A · Ready
                        </span>
                        <span className="text-[#6b3f4f]"> / </span>
                        <span className="font-bold text-[#fce7f3]">{activeTheme.title}</span>
                      </p>
                      <p className="mt-1 font-serif text-[14px] italic text-[#a8798c]">
                        Loaded, and waiting for your words.
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-4 grid gap-2 sm:mt-5 sm:gap-2.5">
                  <MatteCta
                    onClick={expressStyle}
                    label={`Express Order · ${displayTitle(format)}`}
                    narrowLabel="Express Order"
                    price={CARTRIDGE_PRICE}
                    loadingLabel="Opening…"
                    ariaLabel={`Express order ${displayTitle(format)} with ${activeTheme.title}, ${CARTRIDGE_PRICE}`}
                  />
                  <Link
                    href={previewHref(giftStyle, themeId)}
                    prefetch
                    className="flex min-h-[44px] touch-manipulation items-center justify-center rounded-full px-5 font-receipt text-[11px] font-bold uppercase tracking-[0.16em] text-[#c99aae] underline decoration-[#6b3f4f] underline-offset-4 transition-colors hover:text-[#fdf2f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
                  >
                    Customize first →
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
              className="font-receipt text-[11px] uppercase tracking-[0.22em] text-[#c99aae]"
            >
              <span className="text-[#f9a8d4]">2</span> · Start from a story
            </h2>
            <p className="shrink-0 font-receipt text-[11px] tracking-[0.14em] text-[#9a6a7e]">
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
                    onOpen={openDeck}
                    onExpress={expressDeck}
                    onCustomize={customizeDeck}
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center font-receipt text-[11px] uppercase tracking-[0.16em] text-[#9a6a7e]">
            Every deck is just a first draft · the words are yours
          </p>
        </section>
      </div>
      <StickyExpressBar />
      <ExpressOrderHost />
    </main>
  );
}

const StyleChip = memo(function StyleChip({
  cart,
  index,
  selected,
  onSelect,
  onKey,
  setRef,
}: {
  cart: CartridgeSpec;
  index: number;
  selected: boolean;
  onSelect: (style: GiftStyle) => void;
  onKey: (e: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  setRef: (index: number, el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={(el) => setRef(index, el)}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(cart.id as GiftStyle)}
      onKeyDown={(e) => onKey(e, index)}
      className={`min-h-[76px] min-w-[8.5rem] shrink-0 snap-start touch-manipulation rounded-2xl border px-3.5 py-3 text-left transition-transform duration-200 ease-out will-change-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4] active:scale-[0.97] sm:min-w-0 ${
        selected
          ? 'sunset-ring text-[#2d1b22]'
          : 'border-[#4a2a35] bg-[#241419] text-[#fce7f3] hover:-translate-y-0.5 hover:border-[#7d4a5c] hover:bg-[#2e1a21]'
      }`}
    >
      <span
        className={`block font-receipt text-[10px] uppercase tracking-[0.18em] ${
          selected ? 'text-[#ec4899]' : 'text-[#9a6a7e]'
        }`}
      >
        {cart.code}
      </span>
      <span className="mt-1 block font-serif text-[18px] font-semibold leading-tight">
        {displayTitle(cart)}
      </span>
      <span
        className={`mt-0.5 block text-[12px] leading-snug ${
          selected ? 'text-[#7a5563]' : 'text-[#a8798c]'
        }`}
      >
        {cart.caption}
      </span>
    </button>
  );
});

/** @deprecated Prefer `Store`. */
export const RetroStorefront = Store;
