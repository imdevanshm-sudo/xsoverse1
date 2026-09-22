'use client';

import { useEffect } from 'react';

/**
 * Keeps layout height / orientation CSS vars honest across:
 * - old WebViews without `dvh`
 * - Instagram / Facebook in-app browsers with shifting chrome
 * - portrait ↔ landscape flips on any vintage or modern phone
 */
export function OrientationRoot() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const width = Math.round(vv?.width ?? window.innerWidth);
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

    apply();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);

    const onOrient = () => {
      apply();
      window.setTimeout(apply, 60);
      window.setTimeout(apply, 280);
    };
    window.addEventListener('orientationchange', onOrient);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  return null;
}
