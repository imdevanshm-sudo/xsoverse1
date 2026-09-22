'use client';

interface CrtOverlayProps {
  enabled: boolean;
}

/** Subtle full-viewport scanline wash — not a device frame. */
export function CrtOverlay({ enabled }: CrtOverlayProps) {
  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ contain: 'strict' }}
      aria-hidden
    >
      <div className="crt-scanlines absolute inset-0 opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(157,255,176,0.05),transparent_45%)]" />
    </div>
  );
}
