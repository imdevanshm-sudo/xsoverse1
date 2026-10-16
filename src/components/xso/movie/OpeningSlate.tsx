'use client';

import { memo, useState } from 'react';
import { Play } from 'lucide-react';
import type { XsoData } from '@/types/xso';
import type { StageSize } from '@/components/xso/movie/useStage';

/**
 * Title card before the film: recipient, occasion, Scene 01, and one large Play.
 * The Play tap is the user gesture that lets audio start.
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
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-10 bg-[#0b0507] px-6">
      <div className={`w-full text-center ${big ? 'max-w-[520px]' : 'max-w-[340px]'}`}>
        <p
          className={`font-receipt uppercase tracking-[0.32em] text-[#fdba74] ${big ? 'text-[14px]' : 'text-[12px]'}`}
        >
          Scene 01
        </p>
        <h1
          className={`mt-3 text-balance font-serif font-semibold leading-[1.05] text-[#fffaf0] ${big ? 'text-[56px]' : 'text-[40px]'}`}
        >
          {data.customerName ? `For ${data.customerName}` : 'For you'}
        </h1>
        {data.occasion ? (
          <p
            className={`mt-3 font-receipt uppercase tracking-[0.18em] text-[#fffaf0]/75 ${big ? 'text-[15px]' : 'text-[13px]'}`}
          >
            {data.occasion}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={play}
        disabled={clapped && !reduce}
        aria-label="Play"
        data-autofocus
        className={`group grid place-items-center rounded-full bg-[#fffaf0] text-[#0b0507] shadow-[0_0_0_12px_rgba(255,250,240,0.08),0_20px_50px_rgba(0,0,0,0.6)] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fdba74] disabled:opacity-70 ${big ? 'h-28 w-28' : 'h-24 w-24'}`}
      >
        <Play
          className={`translate-x-0.5 fill-current ${big ? 'h-12 w-12' : 'h-10 w-10'}`}
          aria-hidden
        />
      </button>
    </div>
  );
});
