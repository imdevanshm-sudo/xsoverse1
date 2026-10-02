'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { playFoley, startHum } from '@/lib/foley';

export interface ProjectorFx {
  /** One frame pulled through the gate (claw click + a light haptic tick). */
  step: (direction: 1 | -1) => void;
  /** A ratchet tooth on the crank while it's being turned. */
  ratchet: () => void;
  /** Motor hum while the reel is running; idempotent. */
  humStart: () => void;
  humStop: () => void;
  /** Soft paper tap for opening the director's notes. */
  note: () => void;
}

function buzz(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Haptics are progressive enhancement.
  }
}

/**
 * Sound + haptic hooks for the 8mm projector. Every cue is optional polish:
 * audio needs a prior user gesture and `navigator.vibrate` is Android-only.
 */
export function useProjectorFx({ muted = false }: { muted?: boolean } = {}): ProjectorFx {
  const reduce = Boolean(useReducedMotion());
  const stopHum = useRef<(() => void) | null>(null);
  const lastRatchet = useRef(0);

  const humStop = useCallback(() => {
    stopHum.current?.();
    stopHum.current = null;
  }, []);

  useEffect(() => humStop, [humStop]);

  return useMemo<ProjectorFx>(
    () => ({
      step: () => {
        if (muted) return;
        playFoley('reel', 0.6);
        if (!reduce) buzz(8);
      },
      ratchet: () => {
        if (muted) return;
        const now = performance.now();
        if (now - lastRatchet.current < 70) return;
        lastRatchet.current = now;
        playFoley('tap', 0.18);
        if (!reduce) buzz(3);
      },
      humStart: () => {
        if (muted || stopHum.current) return;
        stopHum.current = startHum(0.045);
      },
      humStop,
      note: () => {
        if (muted) return;
        playFoley('flip', 0.3);
      },
    }),
    [muted, reduce, humStop],
  );
}
