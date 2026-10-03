'use client';

import { memo, useRef, type CSSProperties, type ReactNode } from 'react';
import { originOf, usePolaroidStore, type PolaroidBack } from '@/store/usePolaroidStore';
import { preloadLightbox } from '@/components/xso/PolaroidLightboxHost';

/**
 * A photo that opens in the global lightbox. Decks and desks treat `[data-polaroid]`
 * as draggable surface, so the click that trails a drag or flick is ignored here.
 */
export const PolaroidThumb = memo(function PolaroidThumb({
  id,
  src,
  alt,
  caption,
  back,
  rotate = 0,
  className = '',
  style,
  children,
}: {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  back?: PolaroidBack;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const open = usePolaroidStore((state) => state.open);
  const out = usePolaroidStore((state) => state.activePolaroidData?.id === id);
  const node = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  return (
    <button
      ref={node}
      type="button"
      data-polaroid
      aria-label={`Open ${alt}`}
      className={`block cursor-zoom-in text-left will-change-transform ${className}`}
      style={{ ...style, opacity: out ? 0 : 1 }}
      onPointerDown={(event) => {
        start.current = { x: event.clientX, y: event.clientY };
        preloadLightbox();
      }}
      onFocus={preloadLightbox}
      onClick={(event) => {
        event.stopPropagation();
        const from = start.current;
        start.current = null;
        const dragged =
          event.detail > 0 &&
          from !== null &&
          Math.hypot(event.clientX - from.x, event.clientY - from.y) > 8;
        if (dragged || !src) return;
        open({ id, src, alt, caption, back, origin: originOf(node.current, rotate) });
      }}
    >
      {children}
    </button>
  );
});
