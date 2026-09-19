'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import { XsoViewer } from '@/components/xso/XsoViewer';
import { CARTRIDGE_PRICE, getCartridge } from '@/lib/cartridges';
import { styleQuery } from '@/lib/styleLock';
import type { GiftStyle } from '@/types/xso';

interface ImmersivePreviewProps {
  lockedStyle: GiftStyle;
}

/** Step 1 — large interactive souvenir stage, no customize form. */
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

  return (
    <>
      <div className="mx-auto flex min-h-[calc(100dvh-var(--xso-header-h))] w-full max-w-xl flex-col items-center px-3 pb-[6.75rem] pt-3 sm:px-6 sm:pb-[7.25rem] sm:pt-6">
        <p className="mb-2 font-pixel text-[8px] uppercase tracking-[0.28em] text-phosphor/55 sm:mb-3">
          Experience · {cart.title}
        </p>

        <div className="flex w-full max-w-[min(100%,420px)] flex-1 flex-col justify-center sm:max-w-[460px]">
          <XsoViewer data={previewData} frameSize="hero" />
        </div>

        <p className="mt-3 hidden max-w-sm text-center font-mono text-[10px] leading-relaxed text-white/40 sm:mt-4 sm:block">
          Play with the {cart.subtitle.toLowerCase()}. When it feels right,
          customize the lore and lock your keep.
        </p>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
        <div className="xso-dock pointer-events-auto border-t border-white/10 bg-[#0f1319] shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
          <div className="mx-auto flex max-w-lg flex-col gap-2 px-4 py-3.5 sm:px-5">
            <Link
              href={`/studio?${styleQuery(lockedStyle)}`}
              className="flex min-h-12 w-full touch-manipulation items-center justify-center rounded-full border border-phosphor/30 bg-gradient-to-b from-phosphor/95 to-[#5aef7a] px-5 py-3.5 text-center font-pixel text-[9px] uppercase leading-snug tracking-[0.12em] text-ink shadow-[0_6px_0_#1a5c2e,0_12px_28px_rgba(0,0,0,0.4)] transition-[transform,opacity] duration-200 ease-xso active:translate-y-0.5 active:shadow-[0_3px_0_#1a5c2e] sm:text-[10px]"
            >
              ✨ Customize This Souvenir ({CARTRIDGE_PRICE})
            </Link>
            <p className="text-center font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
              Step 1 of 2 · Preview
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
