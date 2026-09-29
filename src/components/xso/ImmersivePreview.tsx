'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import { XsoViewer } from '@/components/xso/XsoViewer';
import { CustomizeCta } from '@/components/xso/preview/CustomizeCta';
import { MemoryDeck } from '@/components/xso/preview/MemoryDeck';
import { PreviewSteps } from '@/components/xso/preview/PreviewSteps';
import { SecretOffer } from '@/components/xso/preview/SecretOffer';
import { CARTRIDGE_PRICE, getCartridge } from '@/lib/cartridges';
import { styleQuery } from '@/lib/styleLock';
import type { GiftStyle } from '@/types/xso';

interface ImmersivePreviewProps {
  lockedStyle: GiftStyle;
}

const MEMORY_COUNT = 4;

const STAGE_HINT: Record<GiftStyle, string> = {
  loop: 'Tap the cards · loop the memory',
  rewind: 'Tap the stack · rewind the memory',
  scrapbook: 'Tap a scrap · inspect the memory',
  accordion: 'Pull the ribbon · unfold the keep',
  moviebox: 'Crank the wheel · advance the reel',
};

/** Step 1 — paper keepsake deck, secret offer ticket and sticky CTA. */
export function ImmersivePreview({ lockedStyle }: ImmersivePreviewProps) {
  const cart = getCartridge(lockedStyle);

  const data = useXsoStore(
    useShallow((s) => ({
      id: s.id,
      giftStyle: s.giftStyle,
      billerName: s.billerName,
      customerName: s.customerName,
      occasion: s.occasion,
      timestamp: s.timestamp,
      merchantName: s.merchantName,
      cashier: s.cashier,
      lineItems: s.lineItems,
      subtotal: s.subtotal,
      emotionalTax: s.emotionalTax,
      total: s.total,
      auditMetrics: s.auditMetrics,
      greenFlags: s.greenFlags,
      redFlags: s.redFlags,
      certifiedStampText: s.certifiedStampText,
      photos: s.photos,
      birthdayMessage: s.birthdayMessage,
      voiceNoteUrl: s.voiceNoteUrl,
      scratchOffReward: s.scratchOffReward,
    })),
  );

  const previewData = useMemo(
    () => ({ ...data, giftStyle: lockedStyle }),
    [data, lockedStyle],
  );

  const router = useRouter();
  const studioHref = `/studio?${styleQuery(lockedStyle)}`;
  useEffect(() => {
    router.prefetch(studioHref);
  }, [router, studioHref]);

  const [memory, setMemory] = useState({ current: 0, seen: 1, label: '' });
  const goTo = useCallback((index: number, label = '') => {
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

  const accentVars = {
    '--accent': cart.accent,
    '--accent-soft': cart.accentSoft,
  } as CSSProperties;

  return (
    <div style={accentVars}>
      <div className="mx-auto grid w-full max-w-xl gap-10 px-5 pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 sm:pt-8 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-14 lg:pb-48 lg:pt-10">
        <div className="flex min-w-0 flex-col items-center">
          <div className="mb-4 flex w-full max-w-[400px] items-baseline justify-between gap-3">
            <p className="truncate font-receipt text-[11px] uppercase tracking-[0.2em] text-[#b3a794]">
              {STAGE_HINT[lockedStyle]}
            </p>
            <p className="shrink-0 rounded-full border border-[#4a443d] px-2 py-0.5 font-receipt text-[10px] tracking-[0.16em] text-[#a89c8a]">
              {cart.code}
            </p>
          </div>

          {isLoop ? (
            <MemoryDeck
              data={previewData}
              onChange={(index, label) => goTo(index, label)}
            />
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
          <p className="font-receipt text-[11px] uppercase tracking-[0.24em] text-[#a3b48f]">
            {cart.subtitle}
          </p>
          <h1 className="mt-1.5 font-serif text-[2rem] font-semibold leading-[1.05] tracking-tight text-[#f1e8d8] lg:text-[2.6rem]">
            {cart.tagline}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#b3a794]">
            Flip through the keepsakes, grab your secret code, then make every
            line your own in the studio.
          </p>
        </aside>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        <div className="paper-dock pointer-events-auto px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="mx-auto grid w-full max-w-md gap-3">
            <PreviewSteps
              current={memory.current + 1}
              explored={explored}
              total={MEMORY_COUNT}
              label={memory.label || (isLoop ? 'Receipt' : undefined)}
            />
            <CustomizeCta href={studioHref} price={CARTRIDGE_PRICE} />
          </div>
        </div>
      </div>
    </div>
  );
}

function countBits(n: number) {
  let count = 0;
  for (let v = n; v; v &= v - 1) count += 1;
  return count;
}
