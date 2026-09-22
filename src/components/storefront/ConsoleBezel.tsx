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

/** Handheld shell — height follows content only (no CRT void). */
export function ConsoleBezel({
  brand,
  status,
  crtEnabled,
  children,
  deck,
}: ConsoleBezelProps) {
  return (
    <div className="console-chassis console-chassis--matte relative mx-auto flex h-auto w-full max-w-store flex-col">
      <header className="relative grid h-10 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-black/55 px-3 sm:h-12 sm:px-5">
        <div className="min-w-0">{brand}</div>
        <div className="justify-self-end text-right">{status}</div>
      </header>

      <div className="relative shrink-0 px-2 py-2 sm:px-4 sm:py-3">
        <div className="screen-bezel screen-bezel--crt relative mx-auto h-auto w-full">
          <CrtOverlay enabled={crtEnabled} />
          <div className="relative z-10 flex h-auto flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
            {children}
          </div>
        </div>
      </div>

      <div className="thumb-zone shrink-0">{deck}</div>

      <div
        className="mx-auto mb-2 flex h-2 w-16 shrink-0 justify-center gap-1 opacity-35 sm:mb-2.5 sm:w-28"
        aria-hidden
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="h-full w-[2.5px] rounded-full bg-black/60"
          />
        ))}
      </div>
    </div>
  );
}
