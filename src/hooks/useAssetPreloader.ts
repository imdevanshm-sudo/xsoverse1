'use client';

import { useEffect, useState } from 'react';
import type { XsoData } from '@/types/xso';

/** Paper and film grain tiles the formats paint with (see globals.css). */
const TEXTURES = [
  '/textures/noise-warm.png',
  '/textures/noise-light.png',
  '/textures/noise-mono.png',
];

/** next/font exposes each family through a CSS variable on <html>. */
const FONT_VARS = [
  '--font-space-grotesk',
  '--font-courier-prime',
  '--font-caveat',
  '--font-fraunces',
  '--font-space-mono',
];
const FONT_WEIGHTS = ['400', '700'];

/** Every image this payload will paint: photos, movie stills and the grain textures. */
export function collectImageUrls(data: XsoData): string[] {
  const urls = new Set<string>(TEXTURES);
  data.photos?.forEach((src) => src && urls.add(src));
  data.moviebox?.scenes?.forEach((scene) => scene.image && urls.add(scene.image));
  return Array.from(urls);
}

/** Resolves once the image is downloaded and decoded; a broken image never blocks the gift. */
function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined).then(() => resolve());
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * Most families are declared with `preload: false`, so they only download on first use;
 * `fonts.ready` alone would resolve before they ever start. Request each one explicitly.
 */
async function loadFonts() {
  if (!('fonts' in document)) return;
  const style = getComputedStyle(document.documentElement);
  const loads = FONT_VARS.flatMap((name) => {
    const family = style.getPropertyValue(name).split(',')[0]?.trim();
    if (!family) return [];
    return FONT_WEIGHTS.map((weight) =>
      document.fonts.load(`${weight} 1em ${family}`).catch(() => []),
    );
  });
  await Promise.all(loads);
  await document.fonts.ready;
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * True once every image and font the gift needs is in memory, plus a short hold so a fast
 * connection doesn't flash. `ceiling` keeps a stalled request from leaving the screen black forever.
 */
export function useAssetPreloader(
  data: XsoData,
  { enabled = true, hold = 500, ceiling = 15_000 } = {},
) {
  const [isReady, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const assets = Promise.all([...collectImageUrls(data).map(loadImage), loadFonts()]);
    Promise.race([assets, wait(ceiling)])
      .then(() => wait(hold))
      .then(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [data, enabled, hold, ceiling]);

  return isReady;
}
