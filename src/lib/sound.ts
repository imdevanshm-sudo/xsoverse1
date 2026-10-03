import { useSyncExternalStore } from 'react';

/**
 * The one switch for interaction sounds. Nothing plays until the viewer has touched, clicked or
 * pressed something on the page; after that sounds are on unless they've turned them off, which
 * is remembered on the device.
 */
const PREF = 'xso:sound';

let unlocked = false;
let unlockedAt = 0;
let muted = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  try {
    muted = localStorage.getItem(PREF) === 'off';
  } catch {}
  /** Capture on window runs before any handler on the page, so the first tap can already play. */
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    unlockedAt = performance.now();
    emit();
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
}

export function soundOn(): boolean {
  return unlocked && !muted;
}

export function setSoundOn(on: boolean) {
  muted = !on;
  if (on) unlocked = true;
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off');
  } catch {}
  emit();
}

/** For the toggle button: when its own tap is what unlocked sound, that tap meant "on". */
export function toggleSound() {
  if (performance.now() - unlockedAt < 800 && !muted) return emit();
  setSoundOn(!soundOn());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, soundOn, () => false);
}
