'use client';

import { Suspense, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModeHeader } from '@/components/layout/ModeHeader';
import { CheckoutEnvelope } from '@/components/checkout/CheckoutEnvelope';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { resolveLockedStyle, styleQuery } from '@/lib/styleLock';
import { useXsoStore } from '@/store/useXsoStore';

function CheckoutShell() {
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
        brand="XSO Checkout"
        meta={displayTitle(cart)}
        actionHref={`/customize?${styleQuery(lockedStyle)}`}
        actionLabel="Studio"
      />
      <CheckoutEnvelope lockedStyle={lockedStyle} />
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="desk grid min-app-h place-items-center font-receipt text-sm text-[#a89c8a]">
          Opening the envelope…
        </main>
      }
    >
      <CheckoutShell />
    </Suspense>
  );
}
