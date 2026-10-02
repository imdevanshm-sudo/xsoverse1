'use client';

import { Suspense, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModeHeader } from '@/components/layout/ModeHeader';
import { ImmersivePreview } from '@/components/xso/ImmersivePreview';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { resolveLockedStyle } from '@/lib/styleLock';
import { isThemeId } from '@/lib/themes';
import { useXsoStore } from '@/store/useXsoStore';

function PreviewShell() {
  const searchParams = useSearchParams();
  const lockedStyle = resolveLockedStyle(searchParams.get('style'));
  const theme = searchParams.get('theme');
  const setField = useXsoStore((s) => s.setField);
  const applyTheme = useXsoStore((s) => s.applyTheme);
  const storeStyle = useXsoStore((s) => s.giftStyle);
  const storeTheme = useXsoStore((s) => s.themeId);
  const cart = getCartridge(lockedStyle);

  useLayoutEffect(() => {
    if (isThemeId(theme) && theme !== storeTheme) applyTheme(theme);
    if (storeStyle !== lockedStyle) setField('giftStyle', lockedStyle);
  }, [applyTheme, lockedStyle, setField, storeStyle, storeTheme, theme]);

  return (
    <main className="min-app-h desk">
      <ModeHeader
        mode="preview"
        tone="paper"
        brand="XSO Preview"
        meta={displayTitle(cart)}
        actionHref="/store"
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
        <main className="desk grid min-app-h place-items-center font-receipt text-sm text-[#c99aae]">
          Loading preview…
        </main>
      }
    >
      <PreviewShell />
    </Suspense>
  );
}
