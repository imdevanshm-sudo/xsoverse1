'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const SEEN = 'xso:hint-seen';

/**
 * One quiet line for a first-time viewer. It fades as soon as they touch, click or press anything,
 * and never comes back on this device.
 */
export function FirstVisitHint({ text }: { text: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN)) return;
    } catch {}
    const timer = window.setTimeout(() => setShown(true), 900);
    const dismiss = () => {
      window.clearTimeout(timer);
      setShown(false);
      try {
        localStorage.setItem(SEEN, '1');
      } catch {}
    };
    const events = ['pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((name) => window.addEventListener(name, dismiss, { once: true, capture: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, dismiss, { capture: true }));
    };
  }, []);

  return (
    <AnimatePresence>
      {shown ? (
        <motion.p
          key="hint"
          role="status"
          className="pointer-events-none absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-max max-w-[90%] rounded-full bg-black/55 px-4 py-2 text-center font-receipt text-[13px] uppercase tracking-[0.16em] text-[#fde7d4] backdrop-blur-sm md:text-[14px]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {text}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
