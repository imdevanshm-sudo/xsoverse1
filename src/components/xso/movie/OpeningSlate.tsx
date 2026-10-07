'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { XsoData } from '@/types/xso';
import type { StageSize } from '@/components/xso/movie/useStage';

const STRIPES = 'repeating-linear-gradient(-55deg, #fffaf0 0 18px, #0b0507 18px 36px)';

/**
 * Title card before the film: a clapperboard with the recipient's name and the occasion. The Play
 * tap is the user gesture that lets the soundtrack start.
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
  const [clapped, setClapped] = useState(false);
  const play = () => {
    if (clapped) return;
    setClapped(true);
    onPlay();
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-[#0b0507] px-6">
      <div className={`w-full ${big ? 'max-w-[520px]' : 'max-w-[320px]'}`} aria-hidden={false}>
        <motion.div
          aria-hidden
          className={`origin-bottom-left rounded-t-md ${big ? 'h-12' : 'h-9'}`}
          style={{ background: STRIPES }}
          initial={false}
          animate={{ rotate: clapped || reduce ? 0 : -14 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
        <div className="rounded-b-md border-2 border-t-0 border-[#fffaf0]/85 bg-[#140a0c] px-5 py-5 font-receipt uppercase text-[#fffaf0]">
          <div aria-hidden className="h-3 w-full" style={{ background: STRIPES, opacity: 0.85 }} />
          <dl
            className={`mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 ${big ? 'text-[15px]' : 'text-[12px]'}`}
          >
            <dt className="tracking-[0.2em] text-[#fdba74]">Scene</dt>
            <dd className="tracking-[0.2em]">01</dd>
            {data.occasion ? (
              <>
                <dt className="tracking-[0.2em] text-[#fdba74]">Occasion</dt>
                <dd className="truncate tracking-[0.12em]">{data.occasion}</dd>
              </>
            ) : null}
            {data.billerName ? (
              <>
                <dt className="tracking-[0.2em] text-[#fdba74]">Director</dt>
                <dd className="truncate tracking-[0.12em]">{data.billerName}</dd>
              </>
            ) : null}
          </dl>
          <h1
            className={`mt-5 text-balance border-t border-[#fffaf0]/20 pt-4 text-center font-serif normal-case font-semibold leading-tight ${big ? 'text-[52px]' : 'text-[36px]'}`}
          >
            {data.customerName ? `For ${data.customerName}` : 'For you'}
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={play}
        aria-label="Play"
        className={`group grid place-items-center rounded-full bg-[#fffaf0] text-[#0b0507] shadow-[0_0_0_10px_rgba(255,250,240,0.08),0_20px_50px_rgba(0,0,0,0.6)] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fdba74] ${big ? 'h-24 w-24' : 'h-20 w-20'}`}
      >
        <Play
          className={`translate-x-0.5 fill-current ${big ? 'h-10 w-10' : 'h-8 w-8'}`}
          aria-hidden
        />
      </button>
    </div>
  );
});
