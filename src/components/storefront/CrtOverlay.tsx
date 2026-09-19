'use client';

interface CrtOverlayProps {
  enabled: boolean;
}

/** Lightweight CRT chrome — static scanlines; flicker only when motion is allowed. */
export function CrtOverlay({ enabled }: CrtOverlayProps) {
  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[inherit]"
      style={{ contain: 'strict' }}
      aria-hidden
    >
      <div className="crt-scanlines absolute inset-0 opacity-55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.4)_100%)]" />
      <div className="crt-flicker absolute inset-0 bg-phosphor/[0.03]" />
    </div>
  );
}
