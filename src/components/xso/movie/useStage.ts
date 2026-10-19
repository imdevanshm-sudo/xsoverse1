'use client';

import { useEffect, useRef, useState } from 'react';

export interface StageSize {
  width: number;
  height: number;
  /** 16:9 when the room is wider than tall, otherwise a portrait stage. */
  landscape: boolean;
  /** Desktop-sized stage: larger type and roomier layouts. */
  big: boolean;
  /** True when the stage fills the room edge-to-edge (phones); false on a centered desktop frame. */
  flush: boolean;
  /** A short landscape stage (a phone on its side): scenes use their tightest layouts. */
  compact: boolean;
}

/** Below this height a landscape stage can't stack a title, a scene and the controls. */
const COMPACT_HEIGHT = 420;

/**
 * Fits a cinematic stage inside its container.
 * Phones fill the room (no black side bars). Desktops keep a centered 9:16 / 16:9 frame.
 */
export function useStage<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<StageSize>({
    width: 0,
    height: 0,
    landscape: false,
    big: false,
    flush: true,
    compact: false,
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (!w || !h) return;
      const landscape = w > h * 1.05;
      /** Phones and narrow tablets: fill the viewport. Wider rooms get a framed stage. */
      const flush = w < 768;
      if (flush) {
        setSize({
          width: Math.floor(w),
          height: Math.floor(h),
          landscape,
          big: w >= 640 && h >= COMPACT_HEIGHT,
          flush: true,
          compact: landscape && h < COMPACT_HEIGHT,
        });
        return;
      }
      const width = landscape
        ? Math.min(w * 0.92, (h * 16) / 9)
        : Math.min(w * 0.56, (h * 9) / 16, 480);
      const height = landscape ? (width * 9) / 16 : Math.min(h * 0.94, (width * 19.5) / 9);
      setSize({
        width: Math.floor(width),
        height: Math.floor(height),
        landscape,
        big: width >= 640 && height >= COMPACT_HEIGHT,
        flush: false,
        compact: landscape && height < COMPACT_HEIGHT,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
