'use client';

import { useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { playSound, useTexture } from '@/lib/sound';

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

/** Ratchet teeth closer together than this blur into one. */
const RATCHET_GAP_MS = 70;

function buzz(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Haptics are progressive enhancement.
  }
}

/**
 * Sound + haptic cues for the 8mm projector, through the sound manager. `navigator.vibrate` is
 * Android-only.
 */
export function useProjectorFx(): ProjectorFx {
  const reduce = Boolean(useReducedMotion());
  const hum = useTexture('projector.hum');
  const lastRatchet = useRef(0);

  return useMemo<ProjectorFx>(
    () => ({
      step: (direction) => {
        playSound('projector.step', { rate: direction < 0 ? 0.92 : 1 });
        if (!reduce) buzz(8);
      },
      ratchet: () => {
        const now = performance.now();
        if (now - lastRatchet.current < RATCHET_GAP_MS) return;
        lastRatchet.current = now;
        playSound('projector.ratchet');
        if (!reduce) buzz(3);
      },
      humStart: () => hum.touch(),
      humStop: () => hum.stop(350),
      note: () => playSound('projector.note'),
    }),
    [reduce, hum],
  );
}
