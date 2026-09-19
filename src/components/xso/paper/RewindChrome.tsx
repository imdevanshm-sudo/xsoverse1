'use client';

import { AnimatePresence, motion } from 'framer-motion';

const REWIND_SPRING = {
  type: 'tween' as const,
  duration: 0.2,
  ease: 'easeOut' as const,
};

/** VHS chromatic split + scanline burst (≈300ms). */
export function RewindGlitchBurst({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="vhs-glitch"
          className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.05 }}
          aria-hidden
        >
          {/* Chromatic RGB split layers */}
          <div className="vhs-chroma vhs-chroma-r absolute inset-0" />
          <div className="vhs-chroma vhs-chroma-c absolute inset-0" />
          {/* Scanline jitter */}
          <div className="vhs-scanlines absolute inset-0" />
          <div className="vhs-jitter absolute inset-0" />
          {/* Tracking noise band */}
          <div className="vhs-tracking absolute inset-x-0" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Amber/green camcorder HUD timestamp. */
export function CamcorderTimestamp({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute left-3 top-3 z-30 sm:left-4 sm:top-4"
      animate={{ opacity: active ? [1, 0.55, 1] : 0.85 }}
      transition={
        active
          ? { duration: 0.3, times: [0, 0.5, 1] }
          : { duration: 0.2 }
      }
    >
      <div
        className="xso-blur-safe border border-[#7cff9a]/35 bg-black/80 px-2 py-1.5 font-mono text-[8px] uppercase leading-tight tracking-[0.14em] text-[#7cff9a] shadow-[0_0_8px_rgba(124,255,154,0.12)] sm:text-[9px]"
        style={{
          textShadow: '0 0 6px rgba(124,255,154,0.45)',
          boxShadow: active
            ? '0 0 0 1px rgba(255,180,60,0.35), 0 0 16px rgba(124,255,154,0.2)'
            : undefined,
        }}
      >
        <p className="flex items-center gap-1.5 text-[#ffb84d]/90">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full bg-[#ff3b3b] ${
              active ? 'animate-pulse' : ''
            }`}
            aria-hidden
          />
          REC · TAPE
        </p>
        <p className="mt-0.5 text-[#7cff9a]">{label}</p>
        <p className="mt-0.5 text-[7px] tracking-[0.2em] text-[#7cff9a]/55">
          {active ? '◀◀ REWIND ACTIVE' : 'STANDBY'}
        </p>
      </div>
    </motion.div>
  );
}

export function VcrRewindButton({
  onPress,
  pressing,
  setPressing,
  label = 'Rewind memory',
}: {
  onPress: () => void;
  pressing: boolean;
  setPressing: (v: boolean) => void;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94, y: 4 }}
      transition={REWIND_SPRING}
      className={`absolute bottom-3 right-3 z-20 flex touch-manipulation select-none flex-col items-stretch overflow-hidden rounded-md border border-[#2a2a2a] sm:bottom-4 sm:right-4 ${
        pressing ? 'translate-y-1' : ''
      }`}
      style={{
        background:
          'linear-gradient(180deg, #3a3a3c 0%, #1c1c1e 45%, #0e0e10 100%)',
        boxShadow: pressing
          ? 'inset 0 4px 10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 #050505'
          : 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -3px 0 rgba(0,0,0,0.55), 0 6px 0 #050505, 0 12px 22px rgba(0,0,0,0.5)',
      }}
      aria-label={label}
    >
      <div className="flex items-center gap-0 border-b border-black/50">
        <span className="border-r border-black/40 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.16em] text-[#888]">
          Eject
        </span>
        <span className="flex items-center gap-1 px-2.5 py-1 font-mono text-[7px] uppercase tracking-[0.16em] text-[#c44]">
          <span className="text-[10px] leading-none" aria-hidden>
            ◀◀
          </span>
          Rewind
        </span>
      </div>
      <div className="flex min-h-10 items-center justify-center gap-2 px-3.5 py-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            pressing ? 'bg-[#ffb84d]' : 'bg-[#7cff9a]'
          }`}
          style={{
            boxShadow: pressing
              ? '0 0 8px rgba(255,184,77,0.8)'
              : '0 0 6px rgba(124,255,154,0.7)',
          }}
          aria-hidden
        />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#e8e4dc]">
          {label}
        </span>
      </div>
    </motion.button>
  );
}

export { REWIND_SPRING };
