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

/** Handheld shell — hugs content; no forced CRT height. */
export function ConsoleBezel({
  brand,
  status,
  crtEnabled,
  children,
  deck,
}: ConsoleBezelProps) {
  return (
    <div className="console-chassis console-chassis--matte console-chassis--orient w-full">
      <header className="relative grid h-11 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-black/55 px-3 sm:h-xso-header sm:gap-xso-3 sm:px-xso-6">
        <div className="min-w-0">{brand}</div>
        <div className="justify-self-end text-right">{status}</div>
      </header>

      <div className="relative shrink-0 px-2 py-2 sm:px-xso-4 sm:py-xso-3 md:px-xso-5">
        <div className="screen-bezel screen-bezel--crt relative mx-auto w-full max-w-[52rem]">
          <CrtOverlay enabled={crtEnabled} />
          <div className="relative z-10 flex flex-col gap-2.5 p-2.5 sm:gap-xso-4 sm:p-xso-4 md:p-xso-5">
            {children}
          </div>
        </div>
      </div>

      <div className="thumb-zone shrink-0">{deck}</div>

      <div
        className="mx-auto mb-2.5 flex h-2 w-20 shrink-0 justify-center gap-1 opacity-40 sm:mb-3 sm:h-2.5 sm:w-36"
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
