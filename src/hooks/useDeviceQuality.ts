'use client';

import { useEffect, useState } from 'react';
import {
  getCanvasQualityProfile,
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
