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

/** Handheld shell — compact header + screen + thumb-zone deck. */
export function ConsoleBezel({
  brand,
  status,
  crtEnabled,
  children,
  deck,
}: ConsoleBezelProps) {
  return (
    <div className="console-chassis console-chassis--matte">
      <header className="relative grid h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-black/55 px-3 sm:h-xso-header sm:gap-xso-3 sm:px-xso-6">
        <div className="min-w-0">{brand}</div>
        <div className="justify-self-end text-right">{status}</div>
      </header>

      <div className="relative px-2 pb-2 pt-2 sm:p-xso-4 md:p-xso-5">
        <div className="screen-bezel screen-bezel--crt relative mx-auto w-full max-w-[52rem]">
          <CrtOverlay enabled={crtEnabled} />
          <div className="relative z-10 flex flex-col gap-3 p-3 sm:gap-xso-5 sm:p-xso-5 md:p-xso-6">
            {children}
          </div>
        </div>
      </div>

      <div className="thumb-zone">{deck}</div>

      <div
        className="mx-auto mb-3 flex h-2.5 w-24 justify-center gap-1 opacity-40 sm:mb-xso-4 sm:h-3 sm:w-40"
        aria-hidden
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="h-full w-[3px] rounded-full bg-black/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          />
        ))}
      </div>
    </div>
  );
}
