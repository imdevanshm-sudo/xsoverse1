'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useXsoData } from '@/store/useXsoData';
import { XsoViewer } from '@/components/xso/XsoViewer';
import { MemoryDeck } from '@/components/xso/preview/MemoryDeck';
import { SecretOffer } from '@/components/xso/preview/SecretOffer';
import { DeskDock } from '@/components/desk/DeskDock';
import { FlowProgress } from '@/components/desk/FlowProgress';
import { MatteCta } from '@/components/desk/MatteCta';
import { CARTRIDGE_PRICE, getCartridge } from '@/lib/cartridges';
import { styleQuery } from '@/lib/styleLock';
import type { GiftStyle } from '@/types/xso';

const MEMORY_COUNT = 4;

const STAGE_HINT: Record<GiftStyle, string> = {
  loop: 'Tap the stack · let it come back around',
  rewind: 'Tap the stack · then call it all back',
  scrapbook: 'Tap a scrap · hold it to the light',
  accordion: 'Pull the ribbon · let it unfold',
  moviebox: 'Turn the crank · roll the reel',
};

function countBits(n: number) {
  let count = 0;
  for (let v = n; v; v &= v - 1) count += 1;
  return count;
}

/** Step 1 — paper keepsake deck, secret offer ticket and sticky CTA. */
export function ImmersivePreview({ lockedStyle }: { lockedStyle: GiftStyle }) {
  const cart = getCartridge(lockedStyle);
  const data = useXsoData();
  const previewData = useMemo(
    () => ({ ...data, giftStyle: lockedStyle }),
    [data, lockedStyle],
  );

  const router = useRouter();
  const customizeHref = `/customize?${styleQuery(lockedStyle)}`;
  useEffect(() => {
    router.prefetch(customizeHref);
  }, [router, customizeHref]);

  const [memory, setMemory] = useState({ current: 0, seen: 1, label: 'Receipt' });
  const goTo = useCallback((index: number, label: string) => {
    setMemory((m) => ({ current: index, seen: m.seen | (1 << index), label }));
  }, []);
  const onAdvance = useCallback(() => {
    setMemory((m) => {
      const next = (m.current + 1) % MEMORY_COUNT;
      return { current: next, seen: m.seen | (1 << next), label: '' };
    });
  }, []);
  const explored = countBits(memory.seen);
  const isLoop = lockedStyle === 'loop';

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

          {isLoop ? (
            <MemoryDeck data={previewData} onChange={goTo} />
          ) : (
            <div className="paper-frame w-full max-w-[400px]">
              <XsoViewer
                data={previewData}
                frameSize="hero"
                scratchDock={false}
                onAdvance={onAdvance}
              />
            </div>
          )}

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
            This is what they&apos;ll hold. Turn each keepsake over, scratch the ticket, then
            fill every line with the things you never quite found the words for.
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
        <MatteCta
          href={customizeHref}
          label="Build your XSO"
          price={CARTRIDGE_PRICE}
          loadingLabel="Clearing the desk…"
          ariaLabel={`Build your XSO, ${CARTRIDGE_PRICE}`}
        />
      </DeskDock>
    </div>
  );
}
