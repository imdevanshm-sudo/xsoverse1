'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';
import type { GiftStyle, XsoData } from '@/types/xso';

interface PreviewProps {
  data: XsoData;
  size?: 'studio' | 'fill';
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
  /** Scrapbook only: the desk's own labels and hints. */
  chrome?: boolean;
}

/** Each format is its own chunk; a page only ever downloads the one it shows. */
const LOADERS = {
  loop: () => import('@/components/xso/preview/MemoryDeck').then((m) => m.MemoryDeck),
  rewind: () => import('@/components/xso/preview/RewindStack').then((m) => m.RewindStack),
  scrapbook: () => import('@/components/xso/preview/ScrapbookDesk').then((m) => m.ScrapbookDesk),
  accordion: () =>
    import('@/components/xso/preview/AccordionRibbon').then((m) => m.AccordionRibbon),
  moviebox: () => import('@/components/xso/preview/MovieBox').then((m) => m.MovieBox),
} satisfies Record<GiftStyle, () => Promise<unknown>>;

/** Starts downloading a format's code ahead of mounting it, e.g. while a gift is unwrapping. */
export function preloadFormat(style: GiftStyle): Promise<unknown> {
  return (LOADERS[style] ?? LOADERS.loop)();
}

function Placeholder() {
  return <div className="h-full min-h-[200px] w-full" aria-hidden />;
}

export const MemoryDeck = dynamic(
  () => import('@/components/xso/preview/MemoryDeck').then((m) => m.MemoryDeck),
  { loading: Placeholder },
);
export const RewindStack = dynamic(
  () => import('@/components/xso/preview/RewindStack').then((m) => m.RewindStack),
  { loading: Placeholder },
);
export const ScrapbookDesk = dynamic(
  () => import('@/components/xso/preview/ScrapbookDesk').then((m) => m.ScrapbookDesk),
  { loading: Placeholder },
);
export const AccordionRibbon = dynamic(
  () => import('@/components/xso/preview/AccordionRibbon').then((m) => m.AccordionRibbon),
  { loading: Placeholder },
);
export const MovieBox = dynamic(
  () => import('@/components/xso/preview/MovieBox').then((m) => m.MovieBox),
  { loading: Placeholder },
);

/** Any of the five formats from one switch. */
export const FormatPreview = memo(function FormatPreview({
  style,
  chrome,
  ...props
}: PreviewProps & { style: GiftStyle }) {
  switch (style) {
    case 'rewind':
      return <RewindStack {...props} />;
    case 'scrapbook':
      return <ScrapbookDesk {...props} chrome={chrome} />;
    case 'accordion':
      return <AccordionRibbon {...props} />;
    case 'moviebox':
      return <MovieBox {...props} />;
    default:
      return <MemoryDeck {...props} />;
  }
});
