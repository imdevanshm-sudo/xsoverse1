'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useXsoData } from '@/store/useXsoData';
import { useXsoStore } from '@/store/useXsoStore';
import { useExpressOrder } from '@/store/useExpressOrder';
import { ExpressOrderHost } from '@/components/storefront/ExpressOrderHost';
import type { ThemeId } from '@/lib/themes';
import { motion, useReducedMotion } from 'framer-motion';
import { CINEMATIC, FORMAT_SWAP } from '@/lib/motion';
import { MemoryDeck } from '@/components/xso/preview/MemoryDeck';
import { RewindStack } from '@/components/xso/preview/RewindStack';
import { AccordionRibbon } from '@/components/xso/preview/AccordionRibbon';
import { MovieBox } from '@/components/xso/preview/MovieBox';
import { ScrapbookDesk } from '@/components/xso/preview/ScrapbookDesk';
import { SecretOffer } from '@/components/xso/preview/SecretOffer';
import { ReceiverPreview } from '@/components/xso/ReceiverPreview';
import { Eye } from 'lucide-react';
import { DeskDock } from '@/components/desk/DeskDock';
import { FlowProgress } from '@/components/desk/FlowProgress';
import { MatteCta } from '@/components/desk/MatteCta';
import { CARTRIDGE_PRICE, getCartridge } from '@/lib/cartridges';
import { styleQuery } from '@/lib/styleLock';
import type { GiftStyle, XsoData } from '@/types/xso';

const MEMORY_COUNT = 4;

const STAGE_HINT: Record<GiftStyle, string> = {
  loop: 'Tap the stack · let it come back around',
  rewind: 'Tap the stack · then call it all back',
  scrapbook: 'Pick something up · turn it over',
  accordion: 'Pull the ribbon · let it unfold',
  moviebox: 'Turn the crank · roll the reel',
};

function countBits(n: number) {
  let count = 0;
  for (let v = n; v; v &= v - 1) count += 1;
  return count;
}

/** The live format, isolated so dock/progress updates never re-render the preview itself. */
const PreviewStage = memo(function PreviewStage({
  style,
  data,
  onChange,
}: {
  style: GiftStyle;
  data: XsoData;
  onChange: (index: number, label: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={style}
      className="flex w-full flex-col items-center"
      initial={reduce ? false : FORMAT_SWAP.initial}
      animate={FORMAT_SWAP.animate}
      transition={CINEMATIC}
    >
      {style === 'rewind' ? (
        <RewindStack data={data} onChange={onChange} />
      ) : style === 'scrapbook' ? (
        <ScrapbookDesk data={data} onChange={onChange} />
      ) : style === 'accordion' ? (
        <AccordionRibbon data={data} onChange={onChange} />
      ) : style === 'moviebox' ? (
        <MovieBox data={data} onChange={onChange} />
      ) : (
        <MemoryDeck data={data} onChange={onChange} />
      )}
    </motion.div>
  );
});

/** Step 1 — paper keepsake deck, secret offer ticket and sticky CTA. */
export function ImmersivePreview({ lockedStyle }: { lockedStyle: GiftStyle }) {
  const cart = getCartridge(lockedStyle);
  const data = useXsoData();
  const previewData = useMemo(() => ({ ...data, giftStyle: lockedStyle }), [data, lockedStyle]);

  const router = useRouter();
  const customizeHref = `/customize?${styleQuery(lockedStyle)}`;
  useEffect(() => {
    router.prefetch(customizeHref);
  }, [router, customizeHref]);

  const [memory, setMemory] = useState({ current: 0, seen: 1, label: 'Receipt' });
  const goTo = useCallback((index: number, label: string) => {
    setMemory((m) => ({ current: index, seen: m.seen | (1 << index), label }));
  }, []);
  const explored = countBits(memory.seen);
  const [receiver, setReceiver] = useState(false);
  const closeReceiver = useCallback(() => setReceiver(false), []);
  const openWith = useExpressOrder((s) => s.openWith);
  const openExpress = useCallback(
    () => openWith({ style: lockedStyle, theme: useXsoStore.getState().themeId as ThemeId }),
    [openWith, lockedStyle],
  );

  return (
    <div>
      <div className="mx-auto grid w-full max-w-xl gap-10 px-5 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 sm:pt-8 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-14 lg:pb-48 lg:pt-10">
        <div className="flex min-w-0 flex-col items-center">
          <div className="mb-4 flex w-full max-w-[400px] items-center justify-between gap-3">
            <p className="min-w-0 truncate font-receipt text-[11px] uppercase tracking-[0.18em] text-[#e0b4c6]">
              {STAGE_HINT[lockedStyle]}
            </p>
            <p className="shrink-0 rounded-full border border-[#5a3442] px-2 py-0.5 font-receipt text-[10px] tracking-[0.16em] text-[#c99aae]">
              {cart.code}
            </p>
          </div>

          <PreviewStage style={lockedStyle} data={previewData} onChange={goTo} />

          <button
            type="button"
            onClick={() => setReceiver(true)}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#5a3442] px-4 font-receipt text-[11px] uppercase tracking-[0.16em] text-[#e0b4c6] hover:border-[#f9a8d4] hover:text-[#fdf2f8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
          >
            <Eye className="h-4 w-4" aria-hidden />
            See receiver experience
          </button>

          <div className="mt-7 w-full max-w-[400px]">
            <SecretOffer reward={data.scratchOffReward} />
          </div>
        </div>

        <aside className="mx-auto w-full max-w-[400px] lg:sticky lg:top-24 lg:mx-0 lg:pt-16">
          <p className="font-receipt text-[11px] uppercase tracking-[0.24em] text-[#fdba74]">
            {cart.subtitle}
          </p>
          <h1 className="mt-1.5 font-serif text-[2rem] font-semibold leading-[1.05] tracking-tight text-[#fdf2f8] lg:text-[2.6rem]">
            {cart.tagline}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#e0b4c6]">
            This is what they&apos;ll hold. Turn each keepsake over, scratch the ticket, then fill
            every line with the things you never quite found the words for.
          </p>
        </aside>
      </div>

      <DeskDock>
        <FlowProgress
          step={1}
          fill={explored / MEMORY_COUNT}
          done={explored >= MEMORY_COUNT}
          meta={
            <>
              <span className="font-bold text-[#fdf2f8]">
                {memory.current + 1}/{MEMORY_COUNT}
              </span>
              memories
            </>
          }
          caption={memory.label ? `Holding · ${memory.label}` : undefined}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <MatteCta
            onClick={openExpress}
            label="Express Buy"
            price={CARTRIDGE_PRICE}
            loadingLabel="Opening…"
            ariaLabel={`Express buy, ${CARTRIDGE_PRICE}`}
          />
          <Link
            href={customizeHref}
            prefetch
            className="paper-button flex min-h-[3.25rem] touch-manipulation items-center justify-center rounded-full px-4 font-receipt text-[11px] font-bold uppercase tracking-[0.14em] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4] active:scale-[0.98]"
            aria-label="Customize first: build your XSO line by line"
          >
            Customize
          </Link>
        </div>
      </DeskDock>
      <ExpressOrderHost />
      {receiver ? <ReceiverPreview style={lockedStyle} onClose={closeReceiver} /> : null}
    </div>
  );
}
