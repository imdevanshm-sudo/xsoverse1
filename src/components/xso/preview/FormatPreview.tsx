'use client';

import { memo } from 'react';
import { MemoryDeck } from '@/components/xso/preview/MemoryDeck';
import { RewindStack } from '@/components/xso/preview/RewindStack';
import { AccordionRibbon } from '@/components/xso/preview/AccordionRibbon';
import { MovieBox } from '@/components/xso/preview/MovieBox';
import { ScrapbookDesk } from '@/components/xso/preview/ScrapbookDesk';
import type { GiftStyle, XsoData } from '@/types/xso';

interface PreviewProps {
  data: XsoData;
  size?: 'studio' | 'fill';
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
  /** Scrapbook only: the desk's own labels and hints. */
  chrome?: boolean;
}

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
