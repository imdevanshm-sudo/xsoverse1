'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SSR_QUALITY_PROFILE,
  getCanvasQualityProfile,
  downgradeCanvasQuality,
  upgradeCanvasQuality,
  type CanvasQualityProfile,
} from '@/lib/deviceQuality';

/**
 * Stable canvas/UI quality profile for the current device.
 * SSR-rendered callers start from a fixed profile so hydration matches;
 * pass `clientOnly` from components that never render on the server.
 */
export function useDeviceQuality({
  clientOnly = false,
}: { clientOnly?: boolean } = {}): CanvasQualityProfile {
  const [profile, setProfile] = useState<CanvasQualityProfile>(() =>
    clientOnly && typeof window !== 'undefined'
      ? getCanvasQualityProfile()
      : SSR_QUALITY_PROFILE,
  );

  useEffect(() => {
    const apply = () => setProfile(getCanvasQualityProfile());
    apply();

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const narrow = window.matchMedia('(max-width: 768px)');

    // Safari before 14 and older Android WebViews only implement addListener.
    // Keep the quality downgrade path working there instead of throwing on mount.
    const watch = (query: MediaQueryList) => {
      const legacy = query as MediaQueryList & {
        addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
        removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      };
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', apply);
        return () => query.removeEventListener('change', apply);
      }
      legacy.addListener?.(apply);
      return () => legacy.removeListener?.(apply);
    };
    const unwatch = [watch(motion), watch(coarse), watch(narrow)];
    return () => {
      unwatch.forEach((stop) => stop());
    };
  }, []);

  return profile;
}

/**
 * Device baseline + runtime adapts from `<PerformanceMonitor>`.
 * Declines step fidelity down; inclines gently restore toward baseline.
 */
export function useAdaptiveCanvasQuality() {
  const baseline = useDeviceQuality({ clientOnly: true });
  const [live, setLive] = useState(baseline);

  useEffect(() => {
    setLive(baseline);
  }, [baseline]);

  const onDecline = useCallback(() => {
    setLive((current) => downgradeCanvasQuality(current));
  }, []);

  const onIncline = useCallback(() => {
    setLive((current) => upgradeCanvasQuality(current, baseline));
  }, [baseline]);

  const onFallback = useCallback(() => {
    setLive((current) =>
      downgradeCanvasQuality(downgradeCanvasQuality(current)),
    );
  }, []);

  return { quality: live, baseline, onDecline, onIncline, onFallback };
}
