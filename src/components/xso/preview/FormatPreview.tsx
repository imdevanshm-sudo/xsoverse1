'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MemoryDeck } from '@/components/xso/preview/MemoryDeck';
import { RewindStack } from '@/components/xso/preview/RewindStack';
import { AccordionRibbon } from '@/components/xso/preview/AccordionRibbon';
import { MovieBox } from '@/components/xso/preview/MovieBox';
import { ScrapbookDesk } from '@/components/xso/preview/ScrapbookDesk';
import { CUSTOM_MODULE_META, resolveCustom } from '@/lib/formats';
import { CINEMA_EASE } from '@/lib/motion';
import { resolveScrapbook } from '@/lib/scrapbook';
import {
  CUSTOM_MODULES,
  LOOP_CARDS,
  type BaseStyle,
  type CustomModule,
  type GiftStyle,
  type XsoData,
} from '@/types/xso';

interface PreviewProps {
  data: XsoData;
  size?: 'studio' | 'fill';
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
  /** Scrapbook only: the desk's own labels and hints. */
  chrome?: boolean;
  /** Hybrid only: advance to the next layer every N ms until an editor focuses one. */
  autoplay?: number;
}

/** One of the five standard formats. */
const BaseFormat = memo(function BaseFormat({
  style,
  chrome,
  autoplay: _autoplay,
  ...props
}: PreviewProps & { style: BaseStyle }) {
  switch (style) {
    case 'rewind':
      return <RewindStack {...props} />;
    case 'scrapbook':
      return <ScrapbookDesk {...props} chrome={chrome} />;
    case 'accordion':
      return <AccordionRibbon {...props} />;
    case 'moviebox':
      return <MovieBox {...props} />;
    default:
      return <MemoryDeck {...props} />;
  }
});

/** The receipt layer drops its photo card when another layer already shows the faces. */
function layerData(data: XsoData, layer: CustomModule, modules: CustomModule[]): XsoData {
  const style = CUSTOM_MODULE_META[layer].style;
  if (layer !== 'receipt') return { ...data, giftStyle: style };
  const facesElsewhere =
    modules.some((m) => m === 'cassette' || m === 'accordion' || m === 'moviebox') ||
    (modules.includes('scrapbook') && resolveScrapbook(data).elements.includes('polaroids'));
  return {
    ...data,
    giftStyle: style,
    loop: { cards: facesElsewhere ? ['receipt', 'audit', 'letter'] : [...LOOP_CARDS] },
  };
}

/**
 * Custom Hybrid: the stacked layers as tabs, each playing the real format.
 * `focusIndex` is an index into `CUSTOM_MODULES`, so an editor can bring its layer forward.
 */
export const HybridStack = memo(function HybridStack({
  data,
  size,
  focusIndex,
  onChange,
  chrome,
  autoplay,
}: PreviewProps) {
  const reduce = useReducedMotion();
  const { modules } = resolveCustom(data);
  const key = modules.join(',');
  const [picked, setPicked] = useState<CustomModule>(modules[0]);

  useEffect(() => {
    const target = focusIndex === undefined ? undefined : CUSTOM_MODULES[focusIndex];
    if (target && key.split(',').includes(target)) setPicked(target);
  }, [focusIndex, key]);

  const active = modules.includes(picked) ? picked : modules[0];

  useEffect(() => {
    if (!autoplay || reduce || focusIndex !== undefined) return;
    const list = key.split(',') as CustomModule[];
    const id = window.setTimeout(
      () => setPicked(list[(list.indexOf(active) + 1) % list.length]),
      autoplay,
    );
    return () => window.clearTimeout(id);
  }, [active, autoplay, focusIndex, key, reduce]);
  const layer = useMemo(
    () => layerData(data, active, key.split(',') as CustomModule[]),
    [active, data, key],
  );
  const fill = size === 'fill';

  return (
    <div className={`flex w-full flex-col items-center gap-2.5 ${fill ? 'h-full min-h-0' : ''}`}>
      <div
        role="tablist"
        aria-label="Keepsake layers"
        className="flex max-w-full shrink-0 gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]"
      >
        {modules.map((m, i) => {
          const meta = CUSTOM_MODULE_META[m];
          const on = m === active;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`Layer ${i + 1}: ${meta.label}`}
              onClick={() => setPicked(m)}
              className={`flex min-h-9 shrink-0 touch-manipulation items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4] ${
                on
                  ? 'border-[#fdf2f8] bg-[#fdf2f8] text-[#2d1b22]'
                  : 'border-white/15 bg-black/30 text-[#f3d6e2] hover:border-white/35'
              }`}
            >
              <span aria-hidden>{meta.emoji}</span>
              {meta.short}
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          role="tabpanel"
          aria-label={CUSTOM_MODULE_META[active].label}
          className={`flex w-full justify-center ${fill ? 'min-h-0 flex-1' : ''}`}
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.38, ease: CINEMA_EASE }}
        >
          <BaseFormat
            style={CUSTOM_MODULE_META[active].style}
            data={layer}
            size={size}
            onChange={onChange}
            chrome={chrome}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

/** Any format, including the hybrid, from one switch. */
export const FormatPreview = memo(function FormatPreview({
  style,
  ...props
}: PreviewProps & { style: GiftStyle }) {
  return style === 'custom' ? <HybridStack {...props} /> : <BaseFormat style={style} {...props} />;
});
