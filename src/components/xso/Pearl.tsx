/** Baked from three.js by `scripts/render-pearl.mjs`; transparent WebPs. */
export const PEARL_LARGE = '/brand/pearl-720.webp';
const PEARL_SMALL = '/brand/pearl-160.webp';

/** The XSO pearl. Decorative; size it with CSS (it is square). */
export function Pearl({ className = '', large = false }: { className?: string; large?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed local sprite, sized by CSS
    <img
      src={large ? PEARL_LARGE : PEARL_SMALL}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
