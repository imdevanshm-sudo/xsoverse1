'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getCanvasQualityProfile,
  downgradeCanvasQuality,
  upgradeCanvasQuality,
  type CanvasQualityProfile,
} from '@/lib/deviceQuality';

/** Stable canvas/UI quality profile for the current device. */
export function useDeviceQuality(): CanvasQualityProfile {
  const [profile, setProfile] = useState<CanvasQualityProfile>(() =>
    typeof window === 'undefined'
      ? getCanvasQualityProfile('high')
      : getCanvasQualityProfile(),
  );

  useEffect(() => {
    const apply = () => setProfile(getCanvasQualityProfile());
    apply();

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const narrow = window.matchMedia('(max-width: 768px)');

    motion.addEventListener('change', apply);
    coarse.addEventListener('change', apply);
    narrow.addEventListener('change', apply);
    return () => {
      motion.removeEventListener('change', apply);
      coarse.removeEventListener('change', apply);
      narrow.removeEventListener('change', apply);
    };
  }, []);

  return profile;
}

/**
 * Device baseline + runtime adapts from `<PerformanceMonitor>`.
 * Declines step fidelity down; inclines gently restore toward baseline.
 */
export function useAdaptiveCanvasQuality() {
  const baseline = useDeviceQuality();
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
