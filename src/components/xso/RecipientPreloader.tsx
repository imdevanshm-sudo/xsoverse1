'use client';

import { motion, useReducedMotion } from 'framer-motion';

/** Black screen and one breathing dot while the gift's assets load. Nothing to read, nothing to brand. */
export function RecipientPreloader() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-[110] grid h-screen w-screen place-items-center bg-black"
      data-recipient-preloader
      role="status"
      aria-label="Loading"
      initial={false}
      exit={{ opacity: 0, transition: { duration: 1.5, ease: 'easeInOut' } }}
    >
      <motion.span
        aria-hidden
        className="block h-1.5 w-1.5 rounded-full bg-white"
        animate={reduce ? { opacity: 0.5 } : { opacity: [0.15, 0.85, 0.15], scale: [0.8, 1, 0.8] }}
        transition={
          reduce ? { duration: 0 } : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }
        }
      />
    </motion.div>
  );
}
