'use client';

import { Suspense, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModeHeader } from '@/components/layout/ModeHeader';
import { PortraitStudio } from '@/components/xso/PortraitStudio';
import { getCartridge } from '@/lib/cartridges';
import { resolveLockedStyle, styleQuery } from '@/lib/styleLock';
import { useXsoStore } from '@/store/useXsoStore';

function StudioShell() {
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
    <main className="min-app-h studio-portrait">
      <ModeHeader
        mode="studio"
        brand="XSO STUDIO"
        meta={<span style={{ color: cart.accent }}>{cart.title}</span>}
        actionHref={`/preview?${styleQuery(lockedStyle)}`}
        actionLabel="Preview"
      />
      <PortraitStudio lockedStyle={lockedStyle} />
    </main>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-app-h place-items-center font-mono text-sm text-white/50">
          Booting studio…
        </main>
      }
    >
      <StudioShell />
    </Suspense>
  );
}
