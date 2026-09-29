'use client';

import { Suspense, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModeHeader } from '@/components/layout/ModeHeader';
import { ImmersivePreview } from '@/components/xso/ImmersivePreview';
import { getCartridge } from '@/lib/cartridges';
import { resolveLockedStyle } from '@/lib/styleLock';
import { useXsoStore } from '@/store/useXsoStore';

function PreviewShell() {
  const searchParams = useSearchParams();
  const lockedStyle = resolveLockedStyle(searchParams.get('style'));
  const setField = useXsoStore((s) => s.setField);
  const storeStyle = useXsoStore((s) => s.giftStyle);
  const cart = getCartridge(lockedStyle);

  useLayoutEffect(() => {
    if (storeStyle !== lockedStyle) {
      setField('giftStyle', lockedStyle);
    }
  }, [lockedStyle, setField, storeStyle]);

  return (
    <main className="min-app-h preview-paper">
      <ModeHeader
        mode="preview"
        tone="paper"
        brand="XSO Preview"
        meta={cart.title.charAt(0) + cart.title.slice(1).toLowerCase()}
        actionHref="/"
        actionLabel="Store"
      />
      <ImmersivePreview lockedStyle={lockedStyle} />
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="preview-paper grid min-app-h place-items-center font-receipt text-sm text-[#a89c8a]">
          Loading preview…
        </main>
      }
    >
      <PreviewShell />
    </Suspense>
  );
}
