'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { resolveCustom } from '@/lib/formats';
import {
  AIQuizCustomizer,
  type CraftPhase,
  type CraftSource,
} from '@/components/xso/AIQuizCustomizer';
import { StudioPhotoFrames } from '@/components/xso/FormatEditorPanel';
import type { CraftedStory } from '@/lib/aiCraft';
import type { GiftStyle } from '@/types/xso';

/** Studio entry to the AI craft: collapsed until asked, since the draft already holds a story. */
export const AICraftPanel = memo(function AICraftPanel({
  style,
  phase,
  onPhase,
  source,
  onCrafted,
}: {
  style: GiftStyle;
  phase: CraftPhase;
  onPhase: (phase: CraftPhase) => void;
  source: CraftSource | null;
  onCrafted: (story: CraftedStory, source: CraftSource) => void;
}) {
  const name = useXsoStore((s) => s.customerName);
  const custom = useXsoStore((s) => s.custom);
  const modules = useMemo(() => resolveCustom({ custom }).modules, [custom]);
  const setField = useXsoStore((s) => s.setField);
  const onName = useCallback((value: string) => setField('customerName', value), [setField]);
  const [open, setOpen] = useState(false);

  return (
    <section className="paper-panel p-4 sm:p-6" aria-label="AI Story Craft">
      {open || phase !== 'quiz' ? (
        <AIQuizCustomizer
          tone="paper"
          style={style}
          modules={modules}
          name={name}
          onName={onName}
          photoSlot={<StudioPhotoFrames label="Your photos" />}
          photosReady
          phase={phase}
          onPhase={onPhase}
          source={source}
          onCrafted={onCrafted}
          allowManual={false}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#fb923c] text-white">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[18px] font-semibold leading-tight text-[#2d1b22]">
              AI Story Craft
            </span>
            <span className="block text-[13px] leading-snug text-[#8a5f6e]">
              Answer 3 quick questions and we&apos;ll write every line for you.
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[#2d1b22] px-3.5 py-2 text-[13px] font-semibold text-[#fdf2f8]">
            Start
          </span>
        </button>
      )}
    </section>
  );
});
