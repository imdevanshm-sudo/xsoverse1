'use client';

import { memo, useCallback, useDeferredValue, type ReactNode } from 'react';
import { FormatPreview } from '@/components/xso/preview/FormatPreview';
import type { GiftStyle, XsoData } from '@/types/xso';

/** The desk the recipient opens, rendered at full size and scaled down. */
const DESK_W = 380;
const DESK_H = 470;
const SCALE = { small: 0.45, large: 0.78 } as const;

const THUMB_COPY: Record<GiftStyle, string> = {
  scrapbook: 'Every piece you check lands on their desk. Uncheck one and it’s cleared away.',
  loop: 'Each card you keep joins the loop, in this order.',
  rewind: 'Each card you keep goes on the stack they rewind through.',
  accordion: 'Each card you keep folds into the ribbon.',
  moviebox: 'Each scene you keep plays on the reel.',
};

/** Live, non-interactive miniature: small beside a caption, or large with an optional edit tap. */
export const FormatThumb = memo(function FormatThumb({
  data,
  style,
  focus,
  large = false,
  onEdit,
  badge,
}: {
  data: XsoData;
  style: GiftStyle;
  focus?: number;
  large?: boolean;
  onEdit?: () => void;
  badge?: ReactNode;
}) {
  const deferred = useDeferredValue(data);
  const makeInert = useCallback((node: HTMLDivElement | null) => {
    node?.setAttribute('inert', '');
  }, []);
  const scale = SCALE[large ? 'large' : 'small'];
  const Frame = onEdit ? 'button' : 'div';
  return (
    <div className={`flex items-center gap-4 ${large ? 'flex-col' : ''}`}>
      <Frame
        {...(onEdit
          ? { type: 'button' as const, onClick: onEdit, 'aria-label': 'Edit every detail' }
          : {})}
        className={`relative shrink-0 overflow-hidden rounded-2xl ${onEdit ? 'cursor-pointer ring-[#ec4899]/60 transition-shadow hover:ring-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]' : ''}`}
        style={{ width: DESK_W * scale, height: DESK_H * scale }}
      >
        {badge ? (
          <span className="absolute inset-x-2 top-2 z-10 flex justify-center">{badge}</span>
        ) : null}
        <div
          ref={makeInert}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: DESK_W, height: DESK_H, transform: `scale(${scale})` }}
        >
          <FormatPreview
            style={style}
            data={deferred}
            size="fill"
            chrome={false}
            focusIndex={focus}
          />
        </div>
      </Frame>
      {large ? null : (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-[#fdba74]">
            <span aria-hidden className="led-peach" />
            Live preview
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-[#e0b4c6]">{THUMB_COPY[style]}</p>
        </div>
      )}
    </div>
  );
});
