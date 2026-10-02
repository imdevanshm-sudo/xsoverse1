'use client';

import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useXsoData } from '@/store/useXsoData';
import { XsoEditor } from '@/components/xso/XsoEditor';
import { XsoViewer } from '@/components/xso/XsoViewer';
import { MemoryDeck } from '@/components/xso/preview/MemoryDeck';
import { RewindStack } from '@/components/xso/preview/RewindStack';
import { AccordionRibbon } from '@/components/xso/preview/AccordionRibbon';
import { ScrapbookDesk } from '@/components/xso/preview/ScrapbookDesk';
import { DeskDock } from '@/components/desk/DeskDock';
import { FlowProgress } from '@/components/desk/FlowProgress';
import { MatteCta } from '@/components/desk/MatteCta';
import { CARTRIDGE_PRICE, displayTitle, getCartridge } from '@/lib/cartridges';
import { STUDIO_STEPS, type StudioStepId } from '@/lib/studioSteps';
import { styleQuery } from '@/lib/styleLock';
import type { GiftStyle } from '@/types/xso';

/** Owns the store subscription so typing only re-renders this subtree. */
const LivePreview = memo(function LivePreview({
  lockedStyle,
  focusIndex,
}: {
  lockedStyle: GiftStyle;
  focusIndex: number;
}) {
  const data = useXsoData();
  const settled = useDeferredValue(useDebouncedValue(data, 250));
  const previewData = useMemo(
    () => ({ ...settled, giftStyle: lockedStyle }),
    [settled, lockedStyle],
  );

  if (lockedStyle === 'loop') {
    return (
      <div className="flex justify-center">
        <MemoryDeck data={previewData} size="studio" focusIndex={focusIndex} />
      </div>
    );
  }
  if (lockedStyle === 'rewind') {
    return (
      <div className="flex justify-center">
        <RewindStack data={previewData} size="studio" focusIndex={focusIndex} />
      </div>
    );
  }
  if (lockedStyle === 'scrapbook') {
    return (
      <div className="flex justify-center">
        <ScrapbookDesk data={previewData} size="studio" focusIndex={focusIndex} />
      </div>
    );
  }
  if (lockedStyle === 'accordion') {
    return (
      <div className="flex justify-center">
        <AccordionRibbon data={previewData} size="studio" focusIndex={focusIndex} />
      </div>
    );
  }
  return (
    <div className="paper-frame mx-auto max-w-[320px] p-2">
      <XsoViewer data={previewData} frameSize="compact" />
    </div>
  );
});

type MobileView = 'edit' | 'preview';

/** Step 2: live deck beside a paper worksheet (tabbed on mobile). */
export function CustomizeStudio({ lockedStyle }: { lockedStyle: GiftStyle }) {
  const cart = getCartridge(lockedStyle);
  const [tab, setTab] = useState<StudioStepId>('receipt');
  const [visited, setVisited] = useState<Set<StudioStepId>>(() => new Set<StudioStepId>(['receipt']));
  const [view, setView] = useState<MobileView>('edit');
  const editorRef = useRef<HTMLElement>(null);

  const changeTab = useCallback((next: StudioStepId) => {
    setTab(next);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    const editor = editorRef.current;
    if (editor && editor.getBoundingClientRect().top < 0) {
      editor.scrollIntoView({ block: 'start' });
    }
  }, []);

  const focusIndex = STUDIO_STEPS.find((s) => s.id === tab)?.card ?? 0;
  const activeStep = STUDIO_STEPS[focusIndex];

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 lg:pt-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-receipt text-[11px] uppercase tracking-[0.24em] text-[#c99aae]">
              Studio · {displayTitle(cart)} · Slot A
            </p>
            <h1 className="mt-1 font-serif text-[28px] font-semibold leading-[1.1] text-[#fdf2f8] sm:text-[34px]">
              Say what you <em className="font-normal text-[#f9a8d4]">never got to say.</em>
            </h1>
          </div>

          <div
            role="group"
            aria-label="Studio view"
            className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-[#4a2a35] bg-[#241419] p-1 sm:w-auto lg:hidden"
          >
            {(['edit', 'preview'] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className="desk-tab min-h-11 px-5"
              >
                {id === 'edit' ? 'Write' : 'See it'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10">
          <aside
            className={`lg:sticky lg:top-[calc(var(--xso-header-h)+1.5rem)] ${
              view === 'preview' ? '' : 'max-lg:hidden'
            }`}
            aria-label="Live preview"
          >
            <p className="mb-3 flex items-center gap-2 font-receipt text-[11px] uppercase tracking-[0.2em] text-[#c99aae]">
              <span aria-hidden className="led-peach" />
              Live · every word lands as you type
            </p>
            <LivePreview lockedStyle={lockedStyle} focusIndex={focusIndex} />
          </aside>

          <section
            ref={editorRef}
            className={`paper-panel scroll-mt-[calc(var(--xso-header-h)+0.5rem)] p-4 sm:p-6 ${
              view === 'edit' ? '' : 'max-lg:hidden'
            }`}
            aria-label="Souvenir editor"
          >
            <XsoEditor tab={tab} onTabChange={changeTab} />
          </section>
        </div>
      </div>

      <DeskDock>
        <FlowProgress
          step={2}
          fill={visited.size / STUDIO_STEPS.length}
          meta={`${visited.size}/${STUDIO_STEPS.length} memories`}
          done={visited.size === STUDIO_STEPS.length}
          caption={`Rewinding · ${activeStep.label} · ${activeStep.cardName}`}
        />
        <MatteCta
          href={`/checkout?${styleQuery(lockedStyle)}`}
          label="Lock these memories"
          narrowLabel="Lock it in"
          price={CARTRIDGE_PRICE}
          loadingLabel="Fetching the envelope…"
        />
      </DeskDock>
    </>
  );
}
