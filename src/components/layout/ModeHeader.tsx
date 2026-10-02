'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface ModeHeaderProps {
  mode: 'store' | 'preview' | 'studio';
  brand: string;
  meta?: ReactNode;
  actionHref: string;
  actionLabel: string;
  /** `paper` renders the warm-stone, centered keepsake header. */
  tone?: 'console' | 'paper';
  /** Right-hand detail for the paper tone (e.g. cartridge code). */
  aside?: ReactNode;
}

/** Fixed-height mode chrome — single row, no wrap/shift. */
export function ModeHeader({
  mode,
  brand,
  meta,
  actionHref,
  actionLabel,
  tone = 'console',
  aside,
}: ModeHeaderProps) {
  if (tone === 'paper') {
    return (
      <header className="mode-header" data-mode={mode} data-tone="paper">
        <div className="mode-header-inner grid grid-cols-[1fr_auto_1fr]">
          <Link
            href={actionHref}
            className="mode-nav-link gap-1.5 justify-self-start"
            prefetch
          >
            <span aria-hidden>←</span>
            {actionLabel}
          </Link>
          <p className="flex min-w-0 items-baseline justify-center gap-2 whitespace-nowrap">
            <span className="font-receipt text-[11px] font-bold uppercase tracking-[0.22em] text-[#fce7f3]">
              {brand}
            </span>
            {meta ? (
              <>
                <span className="text-[#6b3f4f]" aria-hidden>
                  ·
                </span>
                <span className="font-serif text-[15px] italic text-[#f9a8d4]">
                  {meta}
                </span>
              </>
            ) : null}
          </p>
          <div className="min-w-0 justify-self-end truncate font-receipt text-[11px] tracking-[0.14em] text-[#c99aae]">
            {aside}
          </div>
        </div>
      </header>
    );
  }

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
