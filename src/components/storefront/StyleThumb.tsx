import Image from 'next/image';
import { memo } from 'react';
import type { GiftStyle } from '@/types/xso';

const HYBRID_FAN = [
  { style: 'rewind', className: 'left-[6%] top-[14%] -rotate-[10deg]' },
  { style: 'moviebox', className: 'right-[6%] top-[12%] rotate-[9deg]' },
  { style: 'loop', className: 'left-1/2 top-[24%] -translate-x-1/2 rotate-[-1deg]' },
] as const;

/** Pre-rendered still of a format (see `npm run capture`), used wherever it isn't live. */
export const StyleThumb = memo(function StyleThumb({
  style,
  sizes,
  priority = false,
  className = '',
  position = 'top',
}: {
  style: GiftStyle;
  sizes: string;
  priority?: boolean;
  className?: string;
  position?: 'top' | 'center';
}) {
  if (style === 'custom') {
    return (
      <span
        className={`absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#4a1d33,#1a0f14_70%)] ${className}`}
      >
        {HYBRID_FAN.map((card) => (
          <span
            key={card.style}
            className={`absolute aspect-[4/5] w-[52%] overflow-hidden rounded-[8%] border border-white/20 shadow-[0_8px_18px_rgba(0,0,0,.45)] ${card.className}`}
          >
            <Image
              src={`/thumbs/${card.style}.webp`}
              alt=""
              fill
              sizes={sizes}
              priority={priority}
              draggable={false}
              className="select-none object-cover object-top"
            />
          </span>
        ))}
        <span
          aria-hidden
          className="absolute bottom-[6%] left-1/2 -translate-x-1/2 rounded-full bg-[#fdf2f8] px-2 py-0.5 text-[10px] font-bold text-[#2d1b22] shadow-md"
        >
          ✨ Mix
        </span>
      </span>
    );
  }
  return (
    <Image
      src={`/thumbs/${style}.webp`}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      draggable={false}
      className={`select-none object-cover ${position === 'top' ? 'object-top' : 'object-center'} ${className}`}
    />
  );
});
