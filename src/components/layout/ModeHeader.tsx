'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface ModeHeaderProps {
  mode: 'store' | 'preview' | 'studio';
  brand: string;
  meta?: ReactNode;
  actionHref: string;
  actionLabel: string;
}

/** Fixed-height mode chrome — single row, no wrap/shift. */
export function ModeHeader({
  mode,
  brand,
  meta,
  actionHref,
  actionLabel,
}: ModeHeaderProps) {
  return (
    <header className="mode-header" data-mode={mode}>
      <div className="mode-header-inner">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <p className="shrink-0 font-pixel text-[8px] uppercase leading-none tracking-[0.2em] text-phosphor/80 sm:tracking-[0.28em]">
            {brand}
          </p>
          {meta ? (
            <>
              <span className="h-3 w-px shrink-0 bg-white/20" aria-hidden />
              <div className="min-w-0 truncate font-pixel text-[8px] uppercase leading-none tracking-[0.18em] sm:font-arcade sm:text-xs sm:tracking-[0.14em]">
                {meta}
              </div>
            </>
          ) : null}
        </div>
        <Link href={actionHref} className="mode-nav-link gap-1.5" prefetch>
          <span aria-hidden>←</span>
          {actionLabel}
        </Link>
      </div>
    </header>
  );
}
