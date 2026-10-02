'use client';

import { useEffect } from 'react';

/**
 * Freezes the page behind an overlay. iOS ignores `overflow:hidden` on body, so the
 * body is also pinned with `position:fixed` and the exact scroll offset restored on release.
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement: html } = document;
    const scrollY = window.scrollY;
    const saved = {
      htmlOverflow: html.style.overflow,
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      html.style.overflow = saved.htmlOverflow;
      body.style.overflow = saved.overflow;
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.width = saved.width;
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }, [active]);
}
