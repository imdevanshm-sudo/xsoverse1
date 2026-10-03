'use client';

import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMediaQuery } from '@/hooks/useTouchSpring';
import { useXsoData } from '@/store/useXsoData';
import { XsoEditor } from '@/components/xso/XsoEditor';
import { Eye } from 'lucide-react';
import { FormatEditorPanel } from '@/components/xso/FormatEditorPanel';
import { ReceiverPreview } from '@/components/xso/LazyReceiverPreview';
import { AICraftPanel } from '@/components/xso/AICraftPanel';
import { CraftBadge, type CraftPhase, type CraftSource } from '@/components/xso/AIQuizCustomizer';
import { useXsoStore } from '@/store/useXsoStore';
import { storyToPatch, type CraftedStory } from '@/lib/aiCraft';
import { FormatPreview } from '@/components/xso/preview/FormatPreview';
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

  return (
    <div className="flex justify-center">
      <FormatPreview style={lockedStyle} data={previewData} size="studio" focusIndex={focusIndex} />
    </div>
  );
});

const SeeReceiverButton = memo(function SeeReceiverButton({
  onOpen,
  className = '',
}: {
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`desk-tab inline-flex min-h-11 items-center justify-center gap-2 px-5 ${className}`}
    >
      <Eye className="h-4 w-4" aria-hidden />
      See receiver experience
    </button>
  );
});

/** Step 2: live deck beside a paper worksheet; phones open the full receiver preview instead. */
export function CustomizeStudio({ lockedStyle }: { lockedStyle: GiftStyle }) {
  const cart = getCartridge(lockedStyle);
  const [tab, setTab] = useState<StudioStepId>('receipt');
  const [visited, setVisited] = useState<Set<StudioStepId>>(
    () => new Set<StudioStepId>(['receipt']),
  );
  const [craftPhase, setCraftPhase] = useState<CraftPhase>('quiz');
  const [craftSource, setCraftSource] = useState<CraftSource | null>(null);
  const applyStory = useCallback((story: CraftedStory, source: CraftSource) => {
    useXsoStore.setState((s) => storyToPatch(story, s));
    setCraftSource(source);
  }, []);
  const toEditor = useCallback(() => {
    document
      .getElementById('format-editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const [receiver, setReceiver] = useState(false);
  const openReceiver = useCallback(() => setReceiver(true), []);
  const closeReceiver = useCallback(() => setReceiver(false), []);
  const editorRef = useRef<HTMLElement>(null);
  /** Hidden previews still re-render and animate, so phones never mount the side preview. */
  const desktop = useMediaQuery('(min-width: 1024px)');

  /** Set by the format editor when a section opens; a worksheet tab change takes over again. */
  const [panelFocus, setPanelFocus] = useState<number | null>(null);

  const changeTab = useCallback((next: StudioStepId) => {
    setTab(next);
    setPanelFocus(null);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    const editor = editorRef.current;
    if (editor && editor.getBoundingClientRect().top < 0) {
      editor.scrollIntoView({ block: 'start' });
    }
  }, []);

  const tabCard = STUDIO_STEPS.find((s) => s.id === tab)?.card ?? 0;
  const focusIndex = panelFocus ?? tabCard;
  const activeStep = STUDIO_STEPS[tabCard];

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

          <SeeReceiverButton onOpen={openReceiver} className="w-full sm:w-auto lg:hidden" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10">
          <aside
            className="lg:sticky lg:top-[calc(var(--xso-header-h)+1.5rem)] max-lg:hidden"
            aria-label="Live preview"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-receipt text-[11px] uppercase tracking-[0.2em] text-[#c99aae]">
                <span aria-hidden className="led-peach" />
                Live · every word lands as you type
              </p>
              <SeeReceiverButton onOpen={openReceiver} className="!min-h-9 !px-3 text-[11px]" />
            </div>
            <div className="relative">
              {craftPhase === 'crafted' && craftSource ? (
                <button
                  type="button"
                  onClick={toEditor}
                  className="absolute inset-x-0 top-2 z-30 mx-auto flex w-fit max-w-[calc(100%-1rem)] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
                >
                  <CraftBadge source={craftSource} />
                </button>
              ) : null}
              {desktop ? <LivePreview lockedStyle={lockedStyle} focusIndex={focusIndex} /> : null}
            </div>
          </aside>

          <div className="grid gap-6">
            <AICraftPanel
              style={lockedStyle}
              phase={craftPhase}
              onPhase={setCraftPhase}
              source={craftSource}
              onCrafted={applyStory}
            />
            <FormatEditorPanel style={lockedStyle} onFocusCard={setPanelFocus} />
            <section
              ref={editorRef}
              className="paper-panel scroll-mt-[calc(var(--xso-header-h)+0.5rem)] p-4 sm:p-6"
              aria-label="Souvenir editor"
            >
              <XsoEditor tab={tab} onTabChange={changeTab} />
            </section>
          </div>
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
      {receiver ? <ReceiverPreview style={lockedStyle} onClose={closeReceiver} /> : null}
    </>
  );
}
