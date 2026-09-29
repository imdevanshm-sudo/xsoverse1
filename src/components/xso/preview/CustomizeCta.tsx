'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Primary neon CTA. Presses down on tap, glows on keyboard focus and
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
      className={`neon-cta group relative flex min-h-[3.25rem] w-full touch-manipulation select-none items-center justify-between gap-3 overflow-hidden rounded-full pl-5 pr-2 text-[#04140a] ${
        loading ? 'is-loading pointer-events-none' : ''
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-[3px] h-[38%] rounded-full bg-gradient-to-b from-white/55 to-transparent"
      />
      <span className="relative flex min-w-0 items-center gap-2 font-display text-[13px] font-bold uppercase leading-none tracking-[0.08em] sm:text-sm">
        {loading ? (
          <>
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#04140a]/25 border-t-[#04140a]"
            />
            <span className="truncate">Opening studio…</span>
          </>
        ) : (
          <span className="truncate">
            Customize <span className="hidden min-[360px]:inline">this </span>
            souvenir
          </span>
        )}
      </span>
      <span className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-[#04140a] px-3 py-2 font-mono text-[12px] font-bold tabular-nums text-[#00ff66] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {price}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
