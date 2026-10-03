'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import type { StageSize } from '@/components/xso/movie/useStage';

/** The closing card: "Fin.", then a way to watch it again. */
export const EndScreen = memo(function EndScreen({
  stage,
  reduce,
  onReplay,
}: {
  stage: StageSize;
  reduce: boolean;
  onReplay: () => void;
}) {
  const { big } = stage;
  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-[#050203] px-6 text-center"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: 'easeInOut' }}
    >
      <motion.p
        className={`font-serif font-semibold italic text-[#fffaf0] ${big ? 'text-[96px]' : 'text-[68px]'}`}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, delay: reduce ? 0 : 0.4, ease: 'easeOut' }}
      >
        Fin.
      </motion.p>
      <button
        type="button"
        onClick={onReplay}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#fffaf0]/25 px-5 font-receipt text-[12px] uppercase tracking-[0.18em] text-[#fffaf0]/85 transition-colors hover:border-[#fdba74]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Watch again
      </button>
    </motion.div>
  );
});
