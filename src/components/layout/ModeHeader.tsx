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
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <p className="shrink-0 font-pixel text-[8px] uppercase tracking-[0.22em] text-phosphor/80 sm:tracking-[0.28em]">
            {brand}
          </p>
          {meta ? (
            <>
              <span
                className="hidden h-3 w-px shrink-0 bg-white/15 sm:block"
                aria-hidden
              />
              <div className="min-w-0 truncate font-arcade text-[11px] uppercase tracking-[0.14em] text-console-mist/80 sm:text-xs">
                {meta}
              </div>
            </>
          ) : null}
        </div>
        <Link href={actionHref} className="mode-nav-link" prefetch>
          {actionLabel}
        </Link>
      </div>
    </header>
  );
}
