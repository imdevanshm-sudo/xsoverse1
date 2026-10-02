'use client';

import { Suspense, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModeHeader } from '@/components/layout/ModeHeader';
import { CustomizeStudio } from '@/components/xso/CustomizeStudio';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { resolveLockedStyle, styleQuery } from '@/lib/styleLock';
import { useXsoStore } from '@/store/useXsoStore';

function CustomizeShell() {
  const searchParams = useSearchParams();
  const lockedStyle = resolveLockedStyle(searchParams.get('style'));
  const setField = useXsoStore((s) => s.setField);
  const storeStyle = useXsoStore((s) => s.giftStyle);
  const cart = getCartridge(lockedStyle);

  useLayoutEffect(() => {
    if (storeStyle !== lockedStyle) setField('giftStyle', lockedStyle);
  }, [lockedStyle, setField, storeStyle]);

  return (
    <main className="desk min-app-h">
      <ModeHeader
        mode="studio"
        tone="paper"
        brand="XSO Studio"
        meta={displayTitle(cart)}
        actionHref={`/preview?${styleQuery(lockedStyle)}`}
        actionLabel="Preview"
      />
      <CustomizeStudio lockedStyle={lockedStyle} />
    </main>
  );
}

export default function CustomizePage() {
  return (
    <Suspense
      fallback={
        <main className="desk grid min-app-h place-items-center font-receipt text-sm text-[#c99aae]">
          Setting up the studio…
        </main>
      }
    >
      <CustomizeShell />
    </Suspense>
  );
}
