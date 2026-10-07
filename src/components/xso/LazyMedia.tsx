'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useEagerMedia } from '@/components/xso/EagerMedia';

interface LazyMediaProps {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
  sizes?: string;
  /** Prefer fill layout inside a positioned parent. */
  fill?: boolean;
  priority?: boolean;
}

function isNextImageFriendly(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('data:') || src.startsWith('blob:')) return false;
  try {
    if (src.startsWith('/')) return true;
    const url = new URL(src);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Photos are often data/blob URLs from the studio — use native lazy img there.
 * Remote / public paths go through next/image with sizing + lazy loading.
 */
export function LazyMedia({
  src,
  alt = '',
  className,
  style,
  width = 480,
  height = 640,
  sizes = '(max-width: 768px) 50vw, 240px',
  fill = false,
  priority = false,
}: LazyMediaProps) {
  const preloaded = useEagerMedia();
  if (!src) {
    return <div className={className} style={style} aria-hidden />;
  }

  if (!isNextImageFriendly(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        loading={priority || preloaded ? 'eager' : 'lazy'}
        decoding={preloaded ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        style={style}
        sizes={sizes}
        priority={priority}
        unoptimized={preloaded}
        loading={priority ? undefined : preloaded ? 'eager' : 'lazy'}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      sizes={sizes}
      priority={priority}
      unoptimized={preloaded}
      loading={priority ? undefined : preloaded ? 'eager' : 'lazy'}
    />
  );
}
