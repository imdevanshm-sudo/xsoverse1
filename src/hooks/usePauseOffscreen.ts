'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** Stops a clip once its player leaves the viewport, e.g. when its card is flicked away. */
export function usePauseOffscreen(
  target: RefObject<Element>,
  media: RefObject<HTMLMediaElement | null>,
  onPause: () => void,
) {
  const paused = useRef(onPause);
  paused.current = onPause;
  useEffect(() => {
    const el = target.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      const clip = media.current;
      if (entry.isIntersecting || !clip || clip.paused) return;
      clip.pause();
      paused.current();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, media]);
}
