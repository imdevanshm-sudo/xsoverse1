'use client';

import type { ReactNode } from 'react';
import { CrtOverlay } from '@/components/storefront/CrtOverlay';

interface ConsoleBezelProps {
  brand: ReactNode;
  status: ReactNode;
  crtEnabled: boolean;
  children: ReactNode;
  deck: ReactNode;
}

export function ConsoleBezel({
  brand,
  status,
  crtEnabled,
  children,
  deck,
}: ConsoleBezelProps) {
  return (
    <div className="console-chassis">
      <div className="relative grid h-xso-header grid-cols-[minmax(0,1fr)_auto] items-center gap-xso-3 border-b border-black/40 px-xso-4 sm:px-xso-6">
        <div className="min-w-0">{brand}</div>
        <div className="justify-self-end text-right">{status}</div>
      </div>

      <div className="relative p-xso-3 sm:p-xso-5">
        <div className="screen-bezel">
          <CrtOverlay enabled={crtEnabled} />
          <div className="relative z-10 space-y-xso-5 p-xso-4 sm:p-xso-6">
            {children}
          </div>
        </div>
      </div>

      {deck}

      <div
        className="mx-auto mb-xso-4 flex h-3 w-28 justify-center gap-1 opacity-50 sm:w-36"
        aria-hidden
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="h-full w-[3px] rounded-full bg-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          />
        ))}
      </div>
    </div>
  );
}
