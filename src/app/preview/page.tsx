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
    <main className="min-app-h studio-portrait">
      <ModeHeader
        mode="preview"
        brand="XSO PREVIEW"
        meta={<span style={{ color: cart.accent }}>{cart.title}</span>}
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
        <main className="grid min-app-h place-items-center font-mono text-sm text-white/50">
          Loading preview…
        </main>
      }
    >
      <PreviewShell />
    </Suspense>
  );
}
