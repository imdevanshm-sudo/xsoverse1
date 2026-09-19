/** Shared XSO layout & motion tokens (mirrored in Tailwind + CSS vars). */

export const XSO_SPACE = {
  pageX: 'px-xso-page',
  pageY: 'py-xso-section',
  section: 'gap-xso-4',
  stack: 'space-y-xso-4',
} as const;

export const XSO_RADIUS = {
  shell: 'rounded-xso-shell',
  bezel: 'rounded-xso-bezel',
  panel: 'rounded-xso-panel',
  control: 'rounded-xso-control',
  pill: 'rounded-full',
} as const;

export const XSO_MOTION = {
  boot: {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1] as const,
  },
  select: {
    type: 'spring' as const,
    stiffness: 320,
    damping: 32,
    mass: 0.55,
  },
  fade: {
    duration: 0.18,
    ease: 'easeOut' as const,
  },
  /** Lightweight tween for coarse / reduced-motion paths. */
  snappy: {
    type: 'tween' as const,
    duration: 0.16,
    ease: 'easeOut' as const,
  },
};

export const HEADER_HEIGHT = 'h-14';
export const STUDIO_MAX = 'max-w-6xl';
export const STORE_MAX = 'max-w-5xl';
export const PHONE_FRAME =
  'relative mx-auto h-[min(52vh,500px)] min-h-[380px] w-full overflow-hidden rounded-xso-phone border border-white/12 bg-[#090a0c] shadow-[0_20px_56px_rgba(0,0,0,0.5)] ring-1 ring-black/50';

