'use client';

import { memo, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { useCustomizerModal } from '@/store/useCustomizerModal';
import { CARTRIDGE_PRICE, displayTitle, getCartridge } from '@/lib/cartridges';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import { socialProofLine } from '@/lib/socialProof';

/** Mobile-only buy bar pinned to the bottom of the store. */
export const StickyCreateBar = memo(function StickyCreateBar() {
  const giftStyle = useXsoStore((s) => s.giftStyle);
  const openCustomizer = useCustomizerModal((s) => s.open);
  const open = useCallback(
    () => openCustomizer({ format: giftStyle }),
    [openCustomizer, giftStyle],
  );
  const cart = getCartridge(giftStyle);

  return (
    <div className="fixed bottom-0 z-50 w-full border-t border-white/10 bg-[#180e15]/95 backdrop-blur-none md:hidden">
      <p className="mx-auto mt-2 block w-fit max-w-[calc(100%-2rem)] truncate rounded-full border border-[#fdba74]/25 bg-[#2a1a12] px-3 py-1 font-receipt text-[10.5px] font-bold tracking-[0.04em] text-[#fed7aa]">
        {socialProofLine()}
      </p>
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2">
        <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-md bg-[#1a0f14]">
          <StyleThumb style={giftStyle} sizes="36px" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-[15px] font-semibold leading-tight text-[#fdf2f8]">
            {displayTitle(cart)}
          </span>
          <span className="block font-receipt text-[12px] font-bold tabular-nums text-[#fdba74]">
            {CARTRIDGE_PRICE}
          </span>
        </span>
        <button
          type="button"
          onClick={open}
          className="matte-cta flex min-h-[48px] shrink-0 touch-manipulation items-center gap-2 rounded-full px-5 font-serif text-[16px] font-semibold"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Create Your XSO
        </button>
      </div>
    </div>
  );
});
