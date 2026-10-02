'use client';

import { useEffect, useState } from 'react';

/** One calmer spring for fingers: fewer oscillation frames for low-power mobile GPUs. */
export const TOUCH_SPRING = { type: 'spring' as const, stiffness: 250, damping: 25 };

const COARSE = '(pointer: coarse)';

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(COARSE);
    const sync = () => setCoarse(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return coarse;
}

/** The given spring on mouse/trackpad, {@link TOUCH_SPRING} on touch screens. */
export function useTouchSpring<T extends object>(spring: T): T | typeof TOUCH_SPRING {
  return useCoarsePointer() ? TOUCH_SPRING : spring;
}
