'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { XsoData } from '@/types/xso';
import type { StageSize } from '@/components/xso/movie/useStage';

/**
 * One centered title card before the film: recipient, occasion, Scene 01, and a single large Play
 * tap that unlocks audio in the same gesture.
 */
export const OpeningSlate = memo(function OpeningSlate({
  data,
  stage,
  reduce,
  onPlay,
}: {
  data: XsoData;
  stage: StageSize;
  reduce: boolean;
  /** Called synchronously inside the tap, so audio can start in the same gesture. */
  onPlay: () => void;
}) {
  const { big } = stage;
  const [played, setPlayed] = useState(false);
  const play = () => {
    if (played) return;
    setPlayed(true);
    onPlay();
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-10 bg-[#0b0507] px-6">
      <motion.div
        className={`w-full text-center ${big ? 'max-w-[520px]' : 'max-w-[340px]'}`}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className={`font-receipt uppercase tracking-[0.36em] text-[#fdba74] ${big ? 'text-[14px]' : 'text-[12px]'}`}
        >
          Scene 01
        </p>
        <h1
          className={`mt-3 text-balance font-serif font-semibold leading-[1.05] tracking-tight text-[#fffaf0] ${big ? 'text-[56px]' : 'text-[40px]'}`}
        >
          {data.customerName || 'For you'}
        </h1>
        {data.occasion ? (
          <p
            className={`mt-3 text-balance font-receipt uppercase tracking-[0.18em] text-[#fffaf0]/75 ${big ? 'text-[15px]' : 'text-[13px]'}`}
          >
            {data.occasion}
          </p>
        ) : null}
        {data.billerName ? (
          <p
            className={`mt-2 font-hand leading-none text-[#fdba74]/90 ${big ? 'text-[28px]' : 'text-[22px]'}`}
          >
            Directed by {data.billerName}
          </p>
        ) : null}
      </motion.div>

      <button
        type="button"
        onClick={play}
        data-autofocus
        aria-label="Play"
        className={`group grid place-items-center rounded-full bg-[#fffaf0] text-[#0b0507] shadow-[0_0_0_12px_rgba(255,250,240,0.08),0_24px_60px_rgba(0,0,0,0.55)] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fdba74] ${big ? 'h-28 w-28' : 'h-24 w-24'}`}
      >
        <Play
          className={`translate-x-0.5 fill-current ${big ? 'h-12 w-12' : 'h-10 w-10'}`}
          aria-hidden
        />
      </button>
    </div>
  );
});
