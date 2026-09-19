'use client';

import { AnimatePresence, motion } from 'framer-motion';

export const SCRAPBOOK_SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.7,
};

export const SCRAPBOOK_BOUNCE = {
  type: 'tween' as const,
  duration: 0.28,
  ease: 'easeOut' as const,
};

/** Paper-slide flash when the collage reshuffles. */
export function ReshuffleSlideCue({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="paper-slide"
          className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          aria-hidden
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute h-16 w-12 rounded-[2px] border border-[#d8cbb0]/40 bg-[#f4efe6]/25"
              style={{
                left: `${18 + i * 18}%`,
                top: `${28 + (i % 2) * 12}%`,
                boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
              }}
              initial={{
                x: 0,
                y: 0,
                rotate: (i - 1.5) * 8,
                opacity: 0.55,
              }}
              animate={{
                x: (i % 2 === 0 ? 1 : -1) * (40 + i * 18),
                y: -30 - i * 12,
                rotate: (i - 1.5) * 22,
                opacity: 0,
              }}
              transition={{ ...SCRAPBOOK_BOUNCE, delay: i * 0.04 }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ReshuffleCollageButton({
  onPress,
  pressing,
  setPressing,
}: {
  onPress: () => void;
  pressing: boolean;
  setPressing: (v: boolean) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      whileHover={{ y: -2, rotate: -1 }}
      whileTap={{ scale: 0.94, y: 3, rotate: 2 }}
      transition={SCRAPBOOK_BOUNCE}
      className={`absolute bottom-4 right-3 z-20 flex max-w-[9.5rem] touch-manipulation select-none flex-col items-center rounded-[3px] border border-[#c4b59a] px-3 py-2.5 text-center sm:right-4 ${
        pressing ? 'translate-y-0.5' : ''
      }`}
      style={{
        background:
          'linear-gradient(165deg, #f7f1e4 0%, #e8dcc8 55%, #d9cbb4 100%)',
        boxShadow: pressing
          ? 'inset 0 2px 6px rgba(60,40,20,0.25), 0 1px 0 rgba(255,255,255,0.3)'
          : '0 10px 0 #8a7358, 0 14px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.65)',
      }}
      aria-label="Reshuffle collage"
    >
      <span className="font-mono text-[7px] uppercase tracking-[0.18em] text-[#7a6a55]">
        Flat-lay
      </span>
      <span className="mt-0.5 font-hand text-[15px] leading-none text-[#3a3028]">
        Reshuffle
      </span>
      <span className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#5c4e3e]">
        Collage ✦
      </span>
    </motion.button>
  );
}
