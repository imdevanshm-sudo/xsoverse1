'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { offeredStyle } from '@/types/order';
import { Sparkles } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { useCustomizerModal } from '@/store/useCustomizerModal';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { track } from '@/lib/analytics';
import { StyleThumb } from '@/components/storefront/StyleThumb';

/**
 * Mobile-only buy bar pinned to the bottom of the store. It waits until the page's own "Create your souvenir"
 * has scrolled away (`shown`), so the two never sit on screen together.
 */
export const StickyCreateBar = memo(function StickyCreateBar({
  shown = true,
  price,
}: {
  shown?: boolean;
  price?: string;
}) {
  const giftStyle = offeredStyle(useXsoStore((s) => s.giftStyle));
  const openCustomizer = useCustomizerModal((s) => s.open);
  const open = useCallback(() => {
    track('cta_click', { source: 'sticky_bar', aesthetic: giftStyle });
    openCustomizer({ format: giftStyle });
  }, [openCustomizer, giftStyle]);
  const cart = getCartridge(giftStyle);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bar.current?.toggleAttribute('inert', !shown);
  }, [shown]);

  return (
    <div
      ref={bar}
      aria-hidden={!shown}
      className={`fixed bottom-0 z-50 w-full border-t border-white/10 bg-[#180e15]/95 backdrop-blur-none transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
        shown ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2">
        <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-md bg-[#1a0f14]">
          <StyleThumb style={giftStyle} sizes="36px" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[15px] font-semibold leading-tight text-[#fdf2f8]">
            {displayTitle(cart)}
          </span>
          <span className="block truncate font-receipt text-[11px] uppercase tracking-[0.12em] text-[#c99aae]">
            {price ?? 'No shipping'}
          </span>
        </span>
        <button
          type="button"
          onClick={open}
          className="matte-cta flex min-h-[48px] shrink-0 touch-manipulation items-center gap-2 rounded-full px-5 font-serif text-[16px] font-semibold"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Create yours
        </button>
      </div>
    </div>
  );
});
