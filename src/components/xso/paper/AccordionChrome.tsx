'use client';

import { motion } from 'framer-motion';

export const ACCORDION_SPRING = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 20,
  mass: 0.8,
};

/** Cloth/ribbon pull-tab for the accordion postcard ribbon. */
export function AccordionPullTab({
  onPress,
  pressing,
  setPressing,
  panel,
  total = 4,
}: {
  onPress: () => void;
  pressing: boolean;
  setPressing: (v: boolean) => void;
  panel: number;
  total?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      whileHover={{ x: -3 }}
      whileTap={{ scale: 0.96, x: 4 }}
      transition={ACCORDION_SPRING}
      className={`absolute bottom-3 right-2 z-20 flex min-h-[6.5rem] touch-manipulation select-none items-stretch sm:bottom-5 sm:right-3 ${
        pressing ? 'translate-x-1' : ''
      }`}
      aria-label="Pull next panel"
    >
      {/* Stitch / attach to postcard edge */}
      <span
        className="w-2 self-stretch rounded-l-sm border border-[#5a4638]/40"
        style={{
          background:
            'repeating-linear-gradient(180deg, #6e5444 0 3px, #4a382c 3px 6px)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.08)',
        }}
        aria-hidden
      />
      <span
        className="relative flex min-h-[5.5rem] w-[3.35rem] flex-col items-center justify-between rounded-r-md border border-[#6b4f3f]/50 px-1.5 py-2.5"
        style={{
          background:
            'linear-gradient(105deg, #8b5a4a 0%, #a56b58 35%, #7a4a3c 70%, #5e3a30 100%)',
          boxShadow: pressing
            ? 'inset 2px 0 8px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)'
            : '2px 4px 0 #3a241c, 6px 10px 22px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,220,200,0.25)',
        }}
      >
        <span
          className="pointer-events-none absolute inset-y-2 left-1 w-px opacity-30"
          style={{
            background:
              'repeating-linear-gradient(180deg, #f0d8c8 0 2px, transparent 2px 5px)',
          }}
          aria-hidden
        />
        <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#f0d8c8]/80">
          Pull
        </span>
        <span
          className="font-hand text-[13px] leading-tight text-[#fff0e4]"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          next panel
        </span>
        <span className="font-mono text-[8px] tabular-nums tracking-wider text-[#f0d8c8]/70">
          {Math.min(panel + 1, total)}/{total}
        </span>
      </span>
    </motion.button>
  );
}
