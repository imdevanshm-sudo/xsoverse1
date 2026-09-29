'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Matte terracotta CTA. Presses in on tap, shows a cream focus ring and
 * switches to a loading state the moment navigation starts.
 */
export function CustomizeCta({ href, price }: { href: string; price: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Link
      href={href}
      prefetch
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        setLoading(true);
      }}
      aria-busy={loading}
      aria-label={`Customize this souvenir for ${price}`}
      className={`matte-cta group relative flex min-h-[3.25rem] w-full touch-manipulation select-none items-center justify-between gap-3 rounded-2xl pl-5 pr-2 ${
        loading ? 'is-loading pointer-events-none' : ''
      }`}
    >
      <span className="relative flex min-w-0 items-center gap-2.5 font-serif text-[17px] font-semibold leading-none">
        {loading ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#f6efe2]/30 border-t-[#f6efe2]"
            />
            <span className="truncate">Opening the studio…</span>
          </>
        ) : (
          <span className="truncate">
            Customize <span className="hidden min-[360px]:inline">this </span>
            souvenir
          </span>
        )}
      </span>
      <span className="relative flex shrink-0 items-center gap-1.5 rounded-xl bg-[#f4eee3] px-3 py-2 font-receipt text-[13px] font-bold tabular-nums text-[#8f4a2f] shadow-[inset_0_-1px_0_rgba(43,38,33,0.12)]">
        {price}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
