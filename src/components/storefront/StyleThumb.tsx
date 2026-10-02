import Image from 'next/image';
import { memo } from 'react';
import type { GiftStyle } from '@/types/xso';

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
