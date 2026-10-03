'use client';

import { useEffect, useRef, useState } from 'react';

export interface StageSize {
  width: number;
  height: number;
  /** 16:9 when the room is wider than tall, otherwise a 9:16 (up to 9:19.5) portrait. */
  landscape: boolean;
  /** Desktop-sized stage: larger type and roomier layouts. */
  big: boolean;
}

/** Fits a cinematic stage inside its container and keeps it fitted as the container resizes. */
export function useStage<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<StageSize>({
    width: 0,
    height: 0,
    landscape: false,
    big: false,
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (!w || !h) return;
      const landscape = w > h * 1.05;
      const width = landscape ? Math.min(w, (h * 16) / 9) : Math.min(w, (h * 9) / 16);
      const height = landscape ? (width * 9) / 16 : Math.min(h, (width * 19.5) / 9);
      setSize({
        width: Math.floor(width),
        height: Math.floor(height),
        landscape,
        big: width >= 640,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
