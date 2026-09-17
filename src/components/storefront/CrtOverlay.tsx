'use client';

interface CrtOverlayProps {
  enabled: boolean;
}

export function CrtOverlay({ enabled }: CrtOverlayProps) {
  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.45)_100%)]" />
      <div className="crt-flicker absolute inset-0 bg-phosphor/[0.04]" />
    </div>
  );
}
