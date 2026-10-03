'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

/** Below this width the keepsake already fills a phone, so it renders at its natural size. */
export const FIT_FROM = 768;

/**
 * Renders a keepsake at the phone size it was composed for, then scales it up to fill a larger
 * stage. Drags and swipes inside are mapped back into the unscaled space so they track the pointer.
 */
export function FitStage({
  width,
  height,
  max = 2,
  children,
}: {
  width: number;
  height: number;
  /** Upper bound on the scale, so sparse layouts don't balloon on very large screens. */
  max?: number;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => {
      const { width: w, height: h } = node.getBoundingClientRect();
      setScale(w < FIT_FROM ? null : Math.min((w * 0.94) / width, (h * 0.94) / height, max));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width, height, max]);

  return (
    <div ref={box} className="relative flex h-full w-full items-center justify-center">
      {scale === null ? (
        children
      ) : (
        <MotionConfig transformPagePoint={(p) => ({ x: p.x / scale, y: p.y / scale })}>
          <div
            className="flex shrink-0 items-center justify-center"
            style={{ width, height, transform: `scale(${scale})` }}
          >
            {children}
          </div>
        </MotionConfig>
      )}
    </div>
  );
}
