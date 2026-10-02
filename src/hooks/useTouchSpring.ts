'use client';

import { useSyncExternalStore } from 'react';

/** One calmer spring for fingers: fewer oscillation frames for low-power mobile GPUs. */
export const TOUCH_SPRING = { type: 'spring' as const, stiffness: 250, damping: 25 };

const queries = new Map<string, MediaQueryList>();

function mediaList(query: string): MediaQueryList {
  let list = queries.get(query);
  if (!list) {
    list = window.matchMedia(query);
    queries.set(query, list);
  }
  return list;
}

/**
 * Live media-query match. Reads synchronously on the client (no extra render after
 * mount) and every component asking the same query shares one MediaQueryList.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = mediaList(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => mediaList(query).matches,
    () => false,
  );
}

export function useCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/** The given spring on mouse/trackpad, {@link TOUCH_SPRING} on touch screens. */
export function useTouchSpring<T extends object>(spring: T): T | typeof TOUCH_SPRING {
  return useCoarsePointer() ? TOUCH_SPRING : spring;
}
