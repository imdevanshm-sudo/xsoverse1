'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import { XsoViewer } from '@/components/xso/XsoViewer';
import { CustomizeCta } from '@/components/xso/preview/CustomizeCta';
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

/** Step 1 — interactive souvenir stage, secret offer and sticky CTA. */
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

  const [explored, setExplored] = useState(1);
  const onAdvance = useCallback(() => {
    setExplored((n) => Math.min(MEMORY_COUNT, n + 1));
  }, []);

  const accentVars = {
    '--accent': cart.accent,
    '--accent-soft': cart.accentSoft,
  } as CSSProperties;

  return (
    <div style={accentVars}>
      <div className="mx-auto grid w-full max-w-xl gap-5 px-4 pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pt-6 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:gap-10 lg:pb-40">
        <div className="flex min-w-0 flex-col items-center">
          <div className="mb-3 flex w-full max-w-[440px] items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-pixel text-[8px] uppercase tracking-[0.24em] text-white/70">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]"
              />
              Experience ·{' '}
              <span className="text-[color:var(--accent)]">{cart.title}</span>
            </p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
              {cart.code}
            </p>
          </div>

          <div className="console-bezel w-full max-w-[440px]">
            <div className="console-grille" aria-hidden>
              <span />
              <span />
              <span />
            </div>
            <XsoViewer
              data={previewData}
              frameSize="hero"
              scratchDock={false}
              onAdvance={onAdvance}
            />
          </div>

          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            {STAGE_HINT[lockedStyle]}
          </p>
        </div>

        <aside className="mx-auto grid w-full max-w-[440px] gap-4 lg:mx-0">
          <div className="hidden lg:block">
            <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-[color:var(--accent)]">
              {cart.subtitle}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight text-white">
              {cart.tagline}
            </h1>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-white/45">
              Play with the stack, scratch the foil, then make every line
              your own in the studio.
            </p>
          </div>
          <SecretOffer reward={data.scratchOffReward} />
        </aside>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        <div className="xso-dock pointer-events-auto border-t border-white/10 bg-[#0a0d10]/[0.97] px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_36px_rgba(0,0,0,0.5)] sm:px-6">
          <div className="mx-auto grid w-full max-w-md gap-3">
            <PreviewSteps explored={explored} total={MEMORY_COUNT} />
            <CustomizeCta href={studioHref} price={CARTRIDGE_PRICE} />
          </div>
        </div>
      </div>
    </div>
  );
}
