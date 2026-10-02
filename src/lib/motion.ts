/** Shared motion language: slow, cinematic settles for anything that changes the story on screen. */

/** Expo-out: leaves quickly, then drifts into place. */
export const CINEMA_EASE = [0.16, 1, 0.3, 1] as const;

/** Card-stack reorders, frame changes and format swaps. */
export const CINEMATIC = { duration: 0.8, ease: CINEMA_EASE };

/** Physical settles that should keep a hint of weight (critically damped, ~0.9s). */
export const SOFT_SPRING = { type: 'spring' as const, stiffness: 80, damping: 20, mass: 1.2 };

/** Same spring for `useSpring`, which doesn't take a `type`. */
export const SOFT_SPRING_VALUE = { stiffness: 80, damping: 20, mass: 1.2 };

/** Fade-and-scale used whenever one format replaces another. */
export const FORMAT_SWAP = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
} as const;
