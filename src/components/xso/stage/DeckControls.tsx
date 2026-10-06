'use client';

import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Hand, RotateCw } from 'lucide-react';
import { YOUR_TURN } from '@/components/xso/stage/YourTurn';

/* Recipient controls shared by the card-pile formats (the Loop and the Rewind). */

/** First-visit cue on the top card: a hand sweeping right, gone after the first move. */
export const SwipeHint = memo(function SwipeHint({
  shown,
  reduce,
}: {
  shown: boolean;
  reduce: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <AnimatePresence>
      {shown && ready ? (
        <motion.div
          key="swipe-hint"
          role="status"
          className="pointer-events-none absolute inset-x-0 bottom-[18%] z-50 flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="inline-flex items-center gap-2.5 rounded-full bg-[#1b0f15]/80 py-2 pl-3 pr-4 font-receipt text-[14px] uppercase tracking-[0.18em] text-[#fde7d4] shadow-[0_10px_30px_rgba(0,0,0,.45)] backdrop-blur-sm">
            <motion.span
              aria-hidden
              className="inline-flex"
              animate={reduce ? undefined : { x: [0, 14, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 }}
            >
              <Hand className="h-5 w-5" />
            </motion.span>
            Swipe <span aria-hidden>→</span>
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});

/** Desktop click zones either side of the pile. */
export const SideZone = memo(function SideZone({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  const label = side === 'left' ? 'Previous card' : 'Next card';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`absolute top-[8%] hidden h-[76%] w-16 place-items-center rounded-2xl text-[#fde7d4]/45 transition-colors hover:bg-white/[0.04] hover:text-[#fde7d4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]/70 md:grid ${
        side === 'left' ? '-left-[84px]' : '-right-[84px]'
      }`}
    >
      <Icon className="h-9 w-9" aria-hidden />
    </button>
  );
});

/** Where the viewer is in the pile: dots and "1 / 3", with prev/next on phones. */
export const DeckProgress = memo(function DeckProgress({
  count,
  top,
  onBack,
  onNext,
  onRestart,
}: {
  count: number;
  /** The sender's card on top, or null on the closing card. */
  top: number | null;
  onBack: () => void;
  onNext: () => void;
  /** Set on the last page: the forward control becomes "Start over". */
  onRestart?: () => void;
}) {
  const step =
    'grid h-11 w-11 place-items-center rounded-full text-[#fde7d4]/70 transition-colors hover:text-[#fde7d4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]/70 md:hidden';
  return (
    <div className="relative z-10 mt-1 flex h-11 shrink-0 items-center justify-center gap-3">
      <button type="button" onClick={onBack} aria-label="Previous card" className={step}>
        <ChevronLeft className="h-6 w-6" aria-hidden />
      </button>
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-[transform,background-color] duration-300 ease-out ${
              i === top ? 'scale-[1.5] bg-[#fdba74]' : 'bg-[#fce7f3]/25'
            }`}
          />
        ))}
      </div>
      <p className="min-w-[4.5rem] text-center font-receipt text-[15px] tabular-nums tracking-[0.14em] text-[#fde7d4]/85">
        {top === null ? (
          <span className="text-[#fdba74]">{YOUR_TURN}</span>
        ) : (
          <>
            <span className="text-[#fdba74]">{top + 1}</span> / {count}
          </>
        )}
      </p>
      {onRestart ? (
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[#fdba74]/40 px-4 font-receipt text-[13px] uppercase tracking-[0.16em] text-[#ffe7cf] transition-colors hover:border-[#fdba74]/70 hover:bg-[#fdba74]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]/70"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
          Start over
        </button>
      ) : (
        <button type="button" onClick={onNext} aria-label="Next card" className={step}>
          <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      )}
    </div>
  );
});
