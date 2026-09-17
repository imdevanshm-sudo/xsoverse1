'use client';

import type { CSSProperties, ReactNode } from 'react';

/** High-res SVG fractal grain for paper surfaces. */
export const PAPER_GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.55'/%3E%3C/svg%3E\")";

export const PAPER_CREAM = '#fcfaf2';

const DOG_EAR_CLIP =
  'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)';

const TORN_CLIP =
  'polygon(0% 6px, 3% 0, 7% 5px, 12% 1px, 17% 6px, 22% 0, 28% 5px, 34% 1px, 40% 6px, 46% 0, 52% 5px, 58% 1px, 64% 6px, 70% 0, 76% 5px, 82% 1px, 88% 6px, 94% 0, 100% 4px, 100% calc(100% - 5px), 96% 100%, 90% calc(100% - 5px), 84% 100%, 78% calc(100% - 4px), 72% 100%, 66% calc(100% - 5px), 60% 100%, 54% calc(100% - 4px), 48% 100%, 42% calc(100% - 5px), 36% 100%, 30% calc(100% - 4px), 24% 100%, 18% calc(100% - 5px), 12% 100%, 6% calc(100% - 4px), 0 100%)';

export function PaperGrain({ opacity = 0.28 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 mix-blend-multiply"
      style={{
        opacity,
        backgroundImage: PAPER_GRAIN_URL,
        backgroundSize: '180px 180px',
      }}
      aria-hidden
    />
  );
}

export function CoffeeStain({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      style={style}
      aria-hidden
    >
      <div
        className="h-16 w-16 rounded-full"
        style={{
          boxShadow:
            'inset 0 0 0 7px rgba(139, 90, 43, 0.18), inset 0 0 0 11px rgba(120, 72, 28, 0.1)',
          background:
            'radial-gradient(circle at 40% 35%, transparent 42%, rgba(139,90,43,0.07) 55%, transparent 68%)',
          transform: 'rotate(-8deg)',
        }}
      />
    </div>
  );
}

export function DateStamp({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute select-none ${className}`}
      aria-hidden
    >
      <div
        className="flex h-[4.5rem] w-[4.5rem] rotate-[-14deg] items-center justify-center rounded-full border-[2.5px] border-[#8b3a3a]/55 px-1 text-center font-mono text-[7px] font-bold uppercase leading-tight tracking-[0.12em] text-[#8b3a3a]/70"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(139,58,58,0.25)',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function HandNote({
  children,
  className = '',
  rotate = -6,
}: {
  children: ReactNode;
  className?: string;
  rotate?: number;
}) {
  return (
    <p
      className={`pointer-events-none absolute z-20 max-w-[9rem] font-hand text-[13px] leading-snug text-[#2a4a7a]/80 ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        textShadow: '0 1px 0 rgba(255,255,255,0.35)',
      }}
      aria-hidden
    >
      {children}
    </p>
  );
}

export function PaperSheet({
  children,
  className = '',
  rotate = 0,
  dogEar = false,
  torn = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  rotate?: number;
  dogEar?: boolean;
  torn?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative bg-[#fcfaf2] shadow-2xl ${className}`}
      style={{
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        clipPath: torn ? TORN_CLIP : dogEar ? DOG_EAR_CLIP : undefined,
        WebkitClipPath: torn ? TORN_CLIP : dogEar ? DOG_EAR_CLIP : undefined,
        boxShadow:
          '0 28px 50px rgba(0,0,0,0.28), 0 12px 22px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.65)',
        ...style,
      }}
    >
      <PaperGrain />
      {dogEar ? (
        <div
          className="pointer-events-none absolute right-0 top-0 z-30 h-[18px] w-[18px]"
          style={{
            background:
              'linear-gradient(135deg, transparent 49%, rgba(0,0,0,0.08) 50%, #e8e2d4 51%)',
            boxShadow: '-2px 2px 4px rgba(0,0,0,0.12)',
          }}
          aria-hidden
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
