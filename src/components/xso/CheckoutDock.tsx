'use client';

import { useState } from 'react';
import { useXsoStore } from '@/store/useXsoStore';
import { CARTRIDGE_PRICE, getCartridge } from '@/lib/cartridges';
import { pickXsoPayload } from '@/lib/xsoPayload';
import type { GiftStyle } from '@/types/xso';

interface CheckoutDockProps {
  lockedStyle?: GiftStyle;
}

/** Sticky Lock & Checkout bar for the portrait studio. */
export function CheckoutDock({ lockedStyle }: CheckoutDockProps) {
  const storeStyle = useXsoStore((s) => s.giftStyle);
  const style = lockedStyle ?? storeStyle;
  const cart = getCartridge(style);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      const snapshot = useXsoStore.getState();
      const data = pickXsoPayload({ ...snapshot, giftStyle: style });
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const json = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !json.checkoutUrl) {
        throw new Error(json.error || 'Checkout failed');
      }

      window.location.assign(json.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="xso-dock pointer-events-auto border-t border-white/10 bg-[#0f1319] shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3 sm:max-w-lg sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[7px] uppercase tracking-[0.18em] text-white/40">
              Final keep
            </p>
            <p className="mt-0.5 truncate font-arcade text-xs uppercase tracking-[0.12em] text-console-mist">
              <span style={{ color: cart.accent }}>{cart.title}</span>
              <span className="text-white/30"> · </span>
              <span className="text-phosphor/90">{CARTRIDGE_PRICE}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void buy()}
            disabled={busy}
            className="shrink-0 touch-manipulation rounded-full border border-[#5a1010] bg-gradient-to-b from-[#ff5a5a] via-[#e01818] to-[#8a0c0c] px-3.5 py-3 font-pixel text-[7px] uppercase leading-snug tracking-[0.1em] text-[#fff4e8] shadow-[0_6px_0_#4a0808,0_12px_28px_rgba(0,0,0,0.45)] transition-[transform,opacity] duration-200 ease-xso will-change-transform enabled:active:translate-y-0.5 enabled:active:shadow-[0_3px_0_#4a0808] disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-[9px]"
          >
            {busy ? (
              'LOCKING…'
            ) : (
              <>
                <span className="sm:hidden">Lock & Checkout ({CARTRIDGE_PRICE})</span>
                <span className="hidden sm:inline">
                  Lock & Checkout via Lemon Squeezy ({CARTRIDGE_PRICE})
                </span>
              </>
            )}
          </button>
        </div>
        {error ? (
          <p className="border-t border-rose-400/20 px-4 py-2 text-center font-mono text-[11px] text-rose-300/90">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function BuyXsoButton() {
  return <CheckoutDock />;
}
