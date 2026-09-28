'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { CARTRIDGE_PRICE, getCartridge } from '@/lib/cartridges';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { LAST_STUDIO_STEP, STUDIO_STEPS } from '@/lib/studioSteps';
import type { GiftStyle } from '@/types/xso';

interface CheckoutDockProps {
  lockedStyle?: GiftStyle;
  /** Current studio step; omit to show only the checkout action. */
  step?: number;
  onStepChange?: (step: number) => void;
  /** Fires true the moment checkout starts, false if it fails. */
  onLockingChange?: (locking: boolean) => void;
}

/** Sticky studio footer: step Next/Back, then Lock & Checkout. */
export function CheckoutDock({
  lockedStyle,
  step = LAST_STUDIO_STEP,
  onStepChange,
  onLockingChange,
}: CheckoutDockProps) {
  const storeStyle = useXsoStore((s) => s.giftStyle);
  const style = lockedStyle ?? storeStyle;
  const cart = getCartridge(style);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFinal = !onStepChange || step >= LAST_STUDIO_STEP;
  const nextStep = STUDIO_STEPS[step + 1];

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    onLockingChange?.(true);
    try {
      // Always the live store, never the debounced preview copy.
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
      onLockingChange?.(false);
    }
  };

  const primary = () => {
    if (isFinal) void buy();
    else onStepChange?.(step + 1);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="xso-dock pointer-events-auto border-t border-white/10 bg-[#0b0f12]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_32px_rgba(0,0,0,0.35)] supports-[backdrop-filter]:bg-[#0b0f12]/70 supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:backdrop-saturate-150 sm:px-5">
        <div className="mx-auto w-full max-w-md sm:max-w-lg">
          <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
            <p className="flex min-w-0 items-center gap-1.5 truncate text-white/45">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: cart.accent,
                  boxShadow: `0 0 6px ${cart.accent}`,
                }}
              />
              {onStepChange ? (
                <span className="tabular-nums">
                  Step {Math.min(step, LAST_STUDIO_STEP) + 1}/{STUDIO_STEPS.length}
                </span>
              ) : null}
              <span className="truncate text-white/70">{cart.title}</span>
            </p>
            {isFinal ? (
              <span className="shrink-0 tabular-nums text-white/60">
                {CARTRIDGE_PRICE} once
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void buy()}
                disabled={busy}
                className="shrink-0 touch-manipulation text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-[color:var(--accent,#fff)] disabled:opacity-50"
              >
                Checkout · {CARTRIDGE_PRICE}
              </button>
            )}
          </div>

          <div className="flex items-stretch gap-2">
            {onStepChange && step > 0 ? (
              <button
                type="button"
                onClick={() => onStepChange(step - 1)}
                disabled={busy}
                aria-label={`Back to ${STUDIO_STEPS[step - 1]?.label ?? 'previous step'}`}
                className="grid min-h-12 w-12 shrink-0 touch-manipulation place-items-center rounded-full border border-white/15 text-white/75 transition-transform duration-100 active:scale-[0.94] disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={primary}
              disabled={busy}
              aria-busy={busy}
              className="dock-press relative flex min-h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-full px-5 font-pixel text-[9px] uppercase tracking-[0.12em] text-[#07100b] disabled:cursor-wait sm:text-[10px]"
              style={{ backgroundColor: cart.accent }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-4 top-1 h-1/3 rounded-full bg-gradient-to-b from-white/45 to-transparent"
              />
              {busy ? (
                <span className="relative flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 animate-spin rounded-full border-2 border-[#07100b]/30 border-t-[#07100b]"
                  />
                  Locking…
                </span>
              ) : isFinal ? (
                <span className="relative flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Lock & Checkout · {CARTRIDGE_PRICE}
                </span>
              ) : (
                <span className="relative flex items-center gap-2">
                  Next: {nextStep?.label}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              )}
            </button>
          </div>
        </div>
        {error ? (
          <p
            role="alert"
            className="mx-auto mt-2 max-w-md text-center font-mono text-[11px] text-rose-300/90"
          >
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
