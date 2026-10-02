'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface CommonProps {
  /** Full label; `narrowLabel` replaces it below 440px. */
  label: ReactNode;
  narrowLabel?: ReactNode;
  price?: string;
  loadingLabel: string;
  ariaLabel?: string;
}

type LinkProps = CommonProps & { href: string };
type ButtonProps = CommonProps & {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/**
 * Matte terracotta primary action. Presses in on tap (scale 0.98), shows a
 * cream focus ring, and swaps to a spinner while navigating or submitting.
 */
export function MatteCta(props: LinkProps | ButtonProps) {
  const [navigating, setNavigating] = useState(false);
  const isLink = 'href' in props;
  const loading = isLink ? navigating : Boolean(props.loading);
  const className = `matte-cta group relative flex min-h-[3.25rem] w-full touch-manipulation select-none items-center justify-between gap-3 rounded-full pl-6 pr-2 ${
    loading ? 'is-loading pointer-events-none' : ''
  }`;

  const body = (
    <>
      <span className="relative flex min-w-0 items-center gap-2.5 font-serif text-[17px] font-semibold leading-none">
        {loading ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#fff1f6]/30 border-t-[#fff1f6]"
            />
            <span className="truncate">{props.loadingLabel}</span>
          </>
        ) : props.narrowLabel ? (
          <>
            <span className="truncate min-[440px]:hidden">{props.narrowLabel}</span>
            <span className="hidden truncate min-[440px]:inline">{props.label}</span>
          </>
        ) : (
          <span className="truncate">{props.label}</span>
        )}
      </span>
      <span className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-[#fff7fb]/95 px-3.5 py-2 font-receipt text-[13px] font-bold tabular-nums text-[#be185d] shadow-[inset_0_-1px_0_rgba(45, 27, 34,0.12)]">
        {props.price}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </>
  );

  if (isLink) {
    return (
      <Link
        href={props.href}
        prefetch
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          setNavigating(true);
        }}
        aria-busy={loading}
        aria-label={props.ariaLabel}
        className={className}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled || loading}
      aria-busy={loading}
      aria-label={props.ariaLabel}
      className={className}
    >
      {body}
    </button>
  );
}
