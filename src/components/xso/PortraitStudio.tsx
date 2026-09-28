'use client';

import {
  memo,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import { LAST_STUDIO_STEP } from '@/lib/studioSteps';
import { useShallow } from 'zustand/react/shallow';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
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

/**
 * Owns the store subscription for the preview so typing only re-renders
 * this subtree; the viewer receives a copy that settles 250ms after edits.
 */
const StudioPreview = memo(function StudioPreview({
  lockedStyle,
  paused,
}: {
  lockedStyle: GiftStyle;
  paused: boolean;
}) {
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

  const debouncedData = useDeferredValue(useDebouncedValue(data, 250));
  const previewData = useMemo(
    () => ({ ...debouncedData, giftStyle: lockedStyle }),
    [debouncedData, lockedStyle],
  );

  return <XsoViewer data={previewData} frameSize="compact" paused={paused} />;
});

/** Step 2 — customize form + live mini-preview + Lemon checkout. */
export function PortraitStudio({ lockedStyle }: PortraitStudioProps) {
  const cart = getCartridge(lockedStyle);
  const [locking, setLocking] = useState(false);
  const [step, setStep] = useState(0);
  const editorRef = useRef<HTMLElement>(null);

  const changeStep = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(LAST_STUDIO_STEP, next)));
    const editor = editorRef.current;
    if (editor && editor.getBoundingClientRect().top < 0) {
      editor.scrollIntoView({ block: 'start' });
    }
  }, []);

  const accentVars = {
    '--accent': cart.accent,
    '--accent-soft': cart.accentSoft,
  } as CSSProperties;

  return (
    <div style={accentVars}>
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 pb-[8.5rem] pt-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-8 lg:pt-6">
        <aside className="order-1 mx-auto w-full max-w-[280px] lg:sticky lg:top-[calc(var(--xso-header-h)+1rem)] lg:mx-0 lg:max-w-none">
          <p className="mb-2 flex items-center gap-1.5 font-pixel text-[7px] uppercase tracking-[0.24em] text-white/50">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)] shadow-[0_0_6px_var(--accent)]"
            />
            Live · <span className="text-[color:var(--accent)]">{cart.title}</span>
          </p>
          <StudioPreview lockedStyle={lockedStyle} paused={locking} />
          <Link
            href={`/preview?${styleQuery(lockedStyle)}`}
            className="mt-3 block text-center font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 transition-colors hover:text-[color:var(--accent)]"
          >
            ← Back to full preview
          </Link>
        </aside>

        <section
          ref={editorRef}
          className="order-2 scroll-mt-[var(--xso-header-h)] rounded-xl border border-white/10 bg-[#0b0f12] p-3.5 sm:p-5"
        >
          <div className="mb-3">
            <p className="font-arcade text-sm uppercase tracking-[0.14em] text-console-mist">
              Customize souvenir
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/40">
              Four quick steps, then lock &amp; checkout
            </p>
          </div>
          <XsoEditor
            showStylePicker={false}
            step={step}
            onStepChange={changeStep}
          />
        </section>
      </div>

      <CheckoutDock
        lockedStyle={lockedStyle}
        step={step}
        onStepChange={changeStep}
        onLockingChange={setLocking}
      />
    </div>
  );
}

export function XsoStudio({ lockedStyle = 'loop' }: { lockedStyle?: GiftStyle }) {
  return <PortraitStudio lockedStyle={lockedStyle} />;
}
