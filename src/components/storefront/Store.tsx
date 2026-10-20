'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { useCustomizerModal } from '@/store/useCustomizerModal';
import { getCartridge } from '@/lib/cartridges';
import { track } from '@/lib/analytics';
import { captureRef } from '@/lib/pricingClient';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import { StickyCreateBar } from '@/components/storefront/StickyCreateBar';
import { XSOCustomizerHost } from '@/components/storefront/XSOCustomizerHost';
import { isGiftStyle } from '@/lib/xsoPayload';
import { addOnPrice, formatPrice, quote } from '@/lib/pricing';
import { ReceiverPreview } from '@/components/xso/LazyReceiverPreview';
import { offeredStyle } from '@/types/order';
import type { GiftStyle } from '@/types/xso';

interface BentoFormat {
  style: GiftStyle;
  name: string;
  /** What the recipient actually does with it. */
  blurb: string;
}

/** Only the formats offered for new gifts are shown, the Movie Box first. */
const BENTO: BentoFormat[] = (
  [
    {
      style: 'moviebox',
      name: 'The Movie Box',
      blurb: 'They open a wooden box and your story plays like a film.',
    },
    {
      style: 'loop',
      name: 'The Loop',
      blurb: 'They flick through a receipt of your inside jokes, photos and a letter.',
    },
    {
      style: 'accordion',
      name: 'The Accordion',
      blurb: 'They unfold one long paper, memory by memory, to your letter.',
    },
    {
      style: 'rewind',
      name: 'The Rewind',
      blurb: 'They rewind through a cassette of your memories.',
    },
    {
      style: 'scrapbook',
      name: 'The Scrapbook',
      blurb: 'They untie a scrapbook and open each memory inside.',
    },
  ] satisfies BentoFormat[]
).filter((format) => offeredStyle(format.style) === format.style);

/** What one souvenir costs, from the pricing config: one price, or the lowest if they differ. */
function launchPrice(): string {
  const prices = BENTO.map((format) => quote({ style: format.style }).base);
  const low = Math.min(...prices);
  return prices.every((price) => price === low) ? formatPrice(low) : `From ${formatPrice(low)}`;
}

const HOW_IT_WORKS = ['Choose a format', 'Personalize it', 'Pay and send'];

/** Link-in-bio storefront: what it is, one button, the formats on offer. Nothing else. */
export function Store() {
  const router = useRouter();
  const setField = useXsoStore((s) => s.setField);
  const openCustomizer = useCustomizerModal((s) => s.open);

  const createXso = useCallback(
    () => openCustomizer({ format: offeredStyle(useXsoStore.getState().giftStyle) }),
    [openCustomizer],
  );
  const onHeroCta = useCallback(() => {
    track('cta_click', { source: 'hero' });
    createXso();
  }, [createXso]);
  const createWithFormat = useCallback(
    (asked: GiftStyle) => {
      const style = offeredStyle(asked);
      setField('giftStyle', style);
      openCustomizer({ format: style });
    },
    [openCustomizer, setField],
  );
  const pickFromCard = useCallback(
    (style: GiftStyle) => {
      track('cta_click', { source: 'aesthetic_card', aesthetic: style });
      createWithFormat(style);
    },
    [createWithFormat],
  );
  /** The real recipient experience on the sample gift. */
  const [example, setExample] = useState<GiftStyle | null>(null);
  const watchExample = useCallback((style: GiftStyle) => {
    track('cta_click', { source: 'example', aesthetic: style });
    setExample(style);
  }, []);
  const closeExample = useCallback(() => setExample(null), []);
  const price = launchPrice();
  /** The pinned bar takes over only once the hero's own button has scrolled out of view. */
  const heroCta = useRef<HTMLDivElement>(null);
  const [heroInView, setHeroInView] = useState(true);
  useEffect(() => {
    const node = heroCta.current;
    if (!node) return;
    const watch = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting));
    watch.observe(node);
    return () => watch.disconnect();
  }, []);

  /** `/?order=<style>` (the checkout page's edit link) lands straight in the customizer. */
  useEffect(() => {
    captureRef();
    const params = new URLSearchParams(window.location.search);
    const order = params.get('order');
    if (!params.has('order')) return;
    if (isGiftStyle(order)) createWithFormat(order);
    else createXso();
    router.replace('/', { scroll: false });
  }, [createWithFormat, createXso, router]);

  return (
    <main className="desk min-app-h">
      <div className="mx-auto w-full max-w-xl px-5 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 sm:pt-8 md:pb-20">
        <header className="flex items-center justify-center">
          <Link
            href="/"
            className="flex min-h-[44px] items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f9a8d4]"
            aria-label="XSO by XSOVERSE, home"
          >
            <span className="font-serif text-[1.7rem] font-bold leading-none tracking-tight text-[#fdf2f8]">
              XSO
            </span>
            <span aria-hidden className="h-6 w-px bg-[#5a3442]" />
            <span className="font-receipt text-[10px] uppercase tracking-[0.22em] text-[#c99aae]">
              <span className="font-bold text-[#f9a8d4]">XSOVERSE</span>
            </span>
          </Link>
        </header>

        <section
          className="mt-7 text-center sm:mt-11 [@media(max-height:480px)]:mt-4"
          aria-labelledby="hero-heading"
        >
          <h1
            id="hero-heading"
            className="text-balance font-serif text-[2.2rem] font-semibold leading-[1.04] tracking-[-0.02em] text-[#fdf2f8] sm:text-[3rem] [@media(max-height:480px)]:text-[2rem]"
          >
            Turn your memories into an{' '}
            <em className="font-medium text-[#f9a8d4]">experience souvenir.</em>
          </h1>
          <p className="mx-auto mt-3 max-w-[28rem] text-balance text-[16px] leading-snug text-[#e0b4c6]">
            A personal digital gift made from your moments, photos, words and a song you dedicate.
          </p>
        </section>

        <div ref={heroCta} className="z-30 mt-6 md:sticky md:top-4">
          <button
            type="button"
            onClick={onHeroCta}
            className="matte-cta flex min-h-[4rem] w-full touch-manipulation items-center justify-center gap-2 rounded-full px-6 font-serif text-[20px] font-semibold shadow-[0_14px_40px_rgba(236,72,153,.35)] transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
          >
            Create your souvenir
          </button>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => watchExample(BENTO[0].style)}
              className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[14px] font-semibold text-[#f9a8d4] underline decoration-[#f9a8d4]/40 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
            >
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
              See how it feels
            </button>
            <span aria-hidden className="h-4 w-px bg-white/15" />
            <span className="font-receipt text-[12px] uppercase tracking-[0.14em] text-[#c99aae]">
              {price}
            </span>
          </div>
        </div>

        <section className="mt-9" aria-labelledby="formats-heading">
          <h2
            id="formats-heading"
            className="mb-3 text-center font-receipt text-[11px] uppercase tracking-[0.22em] text-[#c99aae]"
          >
            Choose your souvenir
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0">
            {BENTO.map((format, i) => (
              <li key={format.style}>
                <BentoCard
                  format={format}
                  priority={i < 2}
                  onPick={pickFromCard}
                  onExample={watchExample}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 text-center" aria-label="How it works">
          <ol className="m-0 flex list-none flex-wrap items-center justify-center gap-x-2 gap-y-1 p-0 font-receipt text-[12px] uppercase tracking-[0.12em] text-[#e0b4c6]">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                {i > 0 ? (
                  <span aria-hidden className="text-[#f9a8d4]">
                    →
                  </span>
                ) : null}
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] leading-relaxed text-[#c99aae]">
            {price} per souvenir, shown before you pay. Adding a song is{' '}
            {addOnPrice('spotify_song').toLowerCase()}. They open it from a private link, with no
            app. Nothing to ship. Questions?{' '}
            <a
              href="mailto:xsoverse@gmail.com"
              className="inline-block py-2 text-[#f9a8d4] underline decoration-[#f9a8d4]/40 underline-offset-4"
            >
              xsoverse@gmail.com
            </a>
          </p>
        </section>
      </div>
      <StickyCreateBar shown={!heroInView} price={price} />
      <XSOCustomizerHost />
      {example ? <ReceiverPreview style={example} example onClose={closeExample} /> : null}
    </main>
  );
}

/** One format: what it is, what they do with it, and two ways in: watch the example or make one. */
const BentoCard = memo(function BentoCard({
  format,
  priority,
  onPick,
  onExample,
}: {
  format: BentoFormat;
  priority: boolean;
  onPick: (style: GiftStyle) => void;
  onExample: (style: GiftStyle) => void;
}) {
  const cart = getCartridge(format.style);
  return (
    <article
      aria-label={format.name}
      style={
        {
          '--tint': cart.accentSoft,
          '--rim': cart.accent,
          borderColor: cart.accentSoft,
        } as CSSProperties
      }
      className="rounded-3xl border bg-[linear-gradient(160deg,var(--tint),rgba(33,18,24,0.92)_70%)] p-3"
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onExample(format.style)}
          aria-label={`Watch an example ${format.name}`}
          className="group relative block aspect-[4/5] w-[40%] shrink-0 touch-manipulation self-start overflow-hidden rounded-2xl bg-[#1a0f14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
        >
          <StyleThumb
            style={format.style}
            sizes="(max-width: 640px) 40vw, 230px"
            priority={priority}
            className="transition-transform duration-300 group-hover:scale-[1.04]"
          />
          <span
            aria-hidden
            className="absolute bottom-1.5 left-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white"
          >
            <Play className="h-3.5 w-3.5 translate-x-[1px] fill-current" />
          </span>
        </button>
        <div className="min-w-0 flex-1 py-0.5">
          <h3 className="font-serif text-[19px] font-semibold leading-tight text-[#fdf2f8]">
            {format.name}
          </h3>
          <p className="mt-0.5 font-serif text-[15px] font-semibold leading-snug text-[#fed7aa]">
            {cart.tagline}
          </p>
          <p className="mt-1 text-[13.5px] leading-snug text-[#e0b4c6]">{format.blurb}</p>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onExample(format.style)}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-full border border-white/20 px-3 text-[14px] font-semibold text-[#fdf2f8] transition-colors hover:border-[color:var(--rim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          Watch<span className="max-[359px]:sr-only"> example</span>
        </button>
        <button
          type="button"
          onClick={() => onPick(format.style)}
          aria-label={`Create a ${format.name.replace(/^The /, '')}`}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full bg-[#fdf2f8] px-3 text-[14px] font-semibold text-[#2d1b22] transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
        >
          Create this one
        </button>
      </div>
    </article>
  );
});

/** @deprecated Prefer `Store`. */
export const RetroStorefront = Store;
