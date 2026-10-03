'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useXsoStore } from '@/store/useXsoStore';
import { useCustomizerModal } from '@/store/useCustomizerModal';
import { getCartridge } from '@/lib/cartridges';
import { tierPrice } from '@/lib/pricing';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import { StickyCreateBar } from '@/components/storefront/StickyCreateBar';
import { XSOCustomizerHost } from '@/components/storefront/XSOCustomizerHost';
import { isGiftStyle } from '@/lib/xsoPayload';
import type { GiftStyle } from '@/types/xso';

interface BentoFormat {
  style: GiftStyle;
  name: string;
  /** A few words, no more: the whole pitch for the format. */
  blurb: string;
}

const BENTO: BentoFormat[] = [
  { style: 'loop', name: 'The Loop', blurb: 'Nostalgia on repeat.' },
  { style: 'rewind', name: 'The Rewind', blurb: 'Play it back.' },
  { style: 'scrapbook', name: 'The Scrapbook', blurb: 'We kept the receipts.' },
  { style: 'accordion', name: 'The Accordion', blurb: 'Let it unfold.' },
  { style: 'moviebox', name: 'The Movie Box', blurb: 'Frame by frame.' },
];

/** Link-in-bio landing: the promise, one button, five formats. Nothing else. */
export function Store() {
  const router = useRouter();
  const setField = useXsoStore((s) => s.setField);
  const openCustomizer = useCustomizerModal((s) => s.open);

  const createXso = useCallback(
    () => openCustomizer({ format: useXsoStore.getState().giftStyle }),
    [openCustomizer],
  );
  const createWithFormat = useCallback(
    (style: GiftStyle) => {
      setField('giftStyle', style);
      openCustomizer({ format: style });
    },
    [openCustomizer, setField],
  );

  /** `/?order=<style>` (the checkout page's edit link) lands straight in the customizer. */
  useEffect(() => {
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

        <section className="mt-8 text-center sm:mt-12" aria-labelledby="hero-heading">
          <h1
            id="hero-heading"
            className="text-balance font-serif text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.02em] text-[#fdf2f8] sm:text-[3.25rem]"
          >
            Keepsakes for the words <em className="font-medium text-[#f9a8d4]">you never said.</em>
          </h1>
        </section>

        <div className="z-30 mt-8 md:sticky md:top-4">
          <button
            type="button"
            onClick={createXso}
            className="matte-cta flex min-h-[4rem] w-full touch-manipulation items-center justify-center gap-2 rounded-full px-6 font-serif text-[20px] font-semibold shadow-[0_14px_40px_rgba(236,72,153,.35)] transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
          >
            Claim yours · {tierPrice('full')}
          </button>
        </div>

        <section className="mt-10" aria-labelledby="formats-heading">
          <h2
            id="formats-heading"
            className="mb-3 text-center font-receipt text-[11px] uppercase tracking-[0.22em] text-[#c99aae]"
          >
            Or pick your aesthetic
          </h2>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
            {BENTO.map((format, i) => (
              <li key={format.style} className={i === BENTO.length - 1 ? 'col-span-2' : ''}>
                <BentoCard
                  format={format}
                  wide={i === BENTO.length - 1}
                  priority={i < 2}
                  onPick={createWithFormat}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <StickyCreateBar />
      <XSOCustomizerHost />
    </main>
  );
}

const BentoCard = memo(function BentoCard({
  format,
  wide,
  priority,
  onPick,
}: {
  format: BentoFormat;
  wide: boolean;
  priority: boolean;
  onPick: (style: GiftStyle) => void;
}) {
  const cart = getCartridge(format.style);
  return (
    <button
      type="button"
      onClick={() => onPick(format.style)}
      aria-label={`${format.name}: ${format.blurb} Start building`}
      style={
        {
          '--tint': cart.accentSoft,
          '--rim': cart.accent,
        } as CSSProperties
      }
      className={`group flex h-full w-full touch-manipulation gap-3 rounded-3xl border border-white/10 bg-[linear-gradient(160deg,var(--tint),rgba(33,18,24,0.92)_70%)] p-3 text-left transition-[transform,border-color] duration-150 ease-out hover:border-[color:var(--rim)] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4] ${
        wide ? 'flex-row items-center' : 'flex-col'
      }`}
    >
      <span
        className={`relative block shrink-0 overflow-hidden rounded-2xl bg-[#1a0f14] ${
          wide ? 'aspect-[4/3] w-[45%]' : 'aspect-[4/3] w-full'
        }`}
      >
        <StyleThumb
          style={format.style}
          sizes={wide ? '(max-width: 640px) 45vw, 260px' : '(max-width: 640px) 45vw, 280px'}
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </span>
      <span className="block min-w-0 px-1 pb-1">
        <span className="block font-serif text-[18px] font-semibold leading-tight text-[#fdf2f8]">
          {format.name}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-[#e0b4c6]">{format.blurb}</span>
      </span>
    </button>
  );
});

/** @deprecated Prefer `Store`. */
export const RetroStorefront = Store;
