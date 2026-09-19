'use client';

import { motion } from 'framer-motion';

export const CRANK_SPRING = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 28,
  mass: 0.7,
};

/** Warm amber projector beam + dust motes over the viewport. */
export function ProjectorBeamOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[15] overflow-hidden"
      aria-hidden
    >
      <div className="projector-beam-core absolute inset-0" />
      <div className="projector-beam-flicker absolute inset-0" />
      <div className="projector-dust absolute inset-0" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 42%, transparent 35%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}

export function FilmFrameCounter({ frame, total = 4 }: { frame: number; total?: number }) {
  const safe = ((frame - 1 + total) % total) + 1;
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-30 sm:left-4 sm:top-4">
      <div
        className="xso-blur-safe border border-[#ffb86a]/20 bg-[#0a0806]/90 px-3 py-2 font-mono"
        style={{
          boxShadow:
            '0 4px 20px rgba(0,0,0,0.45), 0 0 28px rgba(255,150,60,0.14), inset 0 0 16px rgba(255,180,80,0.05)',
        }}
      >
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#ffe8c8]/95 sm:text-[10px]"
          style={{
            textShadow:
              '0 0 12px rgba(255,200,130,0.7), 0 0 24px rgba(255,160,80,0.35)',
          }}
        >
          35mm archive · frame {String(safe).padStart(2, '0')}
        </p>
        <p
          className="mt-1 text-[7px] uppercase tracking-[0.26em] text-[#ffb86a]/55"
          style={{ textShadow: '0 0 6px rgba(255,184,106,0.4)' }}
        >
          reel {String(safe).padStart(2, '0')} of {String(total).padStart(2, '0')} · lamp on
        </p>
      </div>
    </div>
  );
}

export function CrankAdvanceButton({
  onPress,
  pressing,
  setPressing,
  crankTurn = 0,
  label = 'Crank / advance',
}: {
  onPress: () => void;
  pressing: boolean;
  setPressing: (v: boolean) => void;
  crankTurn?: number;
  label?: string;
}) {
  const crankDeg = (crankTurn % 4) * 90 + (pressing ? -22 : 0);
  return (
    <motion.button
      type="button"
      onClick={onPress}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96, y: 3 }}
      transition={CRANK_SPRING}
      className={`absolute bottom-3 right-3 z-20 flex min-h-12 touch-manipulation select-none items-center gap-2.5 rounded-md border border-[#5c3d28]/60 px-3.5 py-3 sm:bottom-4 sm:right-4 ${
        pressing ? 'translate-y-0.5' : ''
      }`}
      style={{
        background:
          'linear-gradient(180deg, #3d2818 0%, #2a1810 45%, #1a0f0a 100%)',
        boxShadow: pressing
          ? 'inset 0 3px 10px rgba(0,0,0,0.65), 0 1px 0 #0a0604'
          : 'inset 0 1px 0 rgba(255,200,140,0.2), 0 6px 0 #0a0604, 0 12px 24px rgba(0,0,0,0.5)',
      }}
      aria-label={label}
    >
      <motion.span
        className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-[#a67c52]/50"
        animate={{ rotate: crankDeg }}
        transition={CRANK_SPRING}
        style={{
          background:
            'radial-gradient(circle at 32% 28%, #f0c888 0%, #c9925a 38%, #8b5a32 72%, #4a2818 100%)',
          boxShadow: pressing
            ? 'inset 0 2px 8px rgba(0,0,0,0.5), 0 0 12px rgba(255,180,100,0.15)'
            : 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.4), 0 0 14px rgba(255,160,80,0.12)',
        }}
        aria-hidden
      >
        <span
          className="absolute left-1/2 top-1/2 h-1 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4a2818]"
          style={{ transform: 'translate(-50%, -50%) rotate(45deg)' }}
        />
        <span className="h-2 w-2 rounded-full bg-[#2a1810]/80" />
      </motion.span>
      <span className="flex flex-col items-start text-left">
        <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#c4a882]/80">
          Bronze crank
        </span>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#ffe8c8]">
          {label}
        </span>
      </span>
    </motion.button>
  );
}
