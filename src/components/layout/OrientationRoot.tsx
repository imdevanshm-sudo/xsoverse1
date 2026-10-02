'use client';

import { useEffect } from 'react';

/**
 * Keeps layout height / orientation CSS vars honest across:
 * - old WebViews without `dvh`
 * - Instagram / Facebook in-app browsers with shifting chrome
 * - portrait ↔ landscape flips on any vintage or modern phone
 *
 * Writes are coalesced to one per frame and skipped when nothing changed:
 * every `--app-height` write restyles every element sized from it.
 */
export function OrientationRoot() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let lastW = -1;
    let lastH = -1;

    const apply = () => {
      frame = 0;
      const vv = window.visualViewport;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const width = Math.round(vv?.width ?? window.innerWidth);
      // Browser toolbars sliding in/out while scrolling only nudge the height; resizing every deck
      // mid-scroll for that is pure layout churn. Keyboards and rotations still get through.
      if (width === lastW && Math.abs(height - lastH) < 120) return;
      lastW = width;
      lastH = height;
      root.style.setProperty('--app-height', `${height}px`);
      root.style.setProperty('--app-width', `${width}px`);

      const landscape = width > height;
      const short = height < 500;
      root.dataset.orientation = landscape ? 'landscape' : 'portrait';
      root.dataset.shortViewport = short ? 'true' : 'false';
      root.classList.toggle('is-landscape', landscape);
      root.classList.toggle('is-portrait', !landscape);
      root.classList.toggle('is-short-viewport', short);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', schedule);
    window.addEventListener('resize', schedule);

    const timers: number[] = [];
    const onOrient = () => {
      schedule();
      timers.push(window.setTimeout(schedule, 60), window.setTimeout(schedule, 280));
    };
    window.addEventListener('orientationchange', onOrient);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      vv?.removeEventListener('resize', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  return null;
}
