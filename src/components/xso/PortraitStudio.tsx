'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import { CheckoutDock } from '@/components/xso/CheckoutDock';
import { XsoEditor } from '@/components/xso/XsoEditor';
import { XsoViewer } from '@/components/xso/XsoViewer';
import { getCartridge } from '@/lib/cartridges';
import { styleQuery } from '@/lib/styleLock';
import type { GiftStyle } from '@/types/xso';

interface PortraitStudioProps {
  lockedStyle: GiftStyle;
}

/** Step 2 — customize form + live mini-preview + Lemon checkout. */
export function PortraitStudio({ lockedStyle }: PortraitStudioProps) {
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
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 pb-[7rem] pt-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-8 lg:pt-6">
        <aside className="order-1 mx-auto w-full max-w-[280px] lg:sticky lg:top-[calc(var(--xso-header-h)+1rem)] lg:mx-0 lg:max-w-none">
          <p className="mb-2 font-pixel text-[7px] uppercase tracking-[0.24em] text-phosphor/50">
            Live · {cart.title}
          </p>
          <XsoViewer data={previewData} frameSize="compact" />
          <a
            href={`/preview?${styleQuery(lockedStyle)}`}
            className="mt-3 block text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 transition hover:text-phosphor/70"
          >
            ← Back to full preview
          </a>
        </aside>

        <section className="order-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-5">
          <div className="mb-4">
            <p className="font-arcade text-sm uppercase tracking-[0.14em] text-console-mist">
              Customize souvenir
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/40">
              Step 2 of 2 · Edit lore, then lock &amp; checkout
            </p>
          </div>
          <XsoEditor showStylePicker={false} />
        </section>
      </div>

      <CheckoutDock lockedStyle={lockedStyle} />
    </>
  );
}

export function XsoStudio({ lockedStyle = 'loop' }: { lockedStyle?: GiftStyle }) {
  return <PortraitStudio lockedStyle={lockedStyle} />;
}
