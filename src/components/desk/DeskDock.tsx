import type { ReactNode } from 'react';

/** Sticky footer on the desk; pages reserve `pb-40` so content clears it. */
export function DeskDock({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="paper-dock pointer-events-auto px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <div className="mx-auto grid w-full max-w-md gap-3">{children}</div>
      </div>
    </div>
  );
}
