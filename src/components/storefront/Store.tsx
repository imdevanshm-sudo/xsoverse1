'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useXsoStore } from '@/store/useXsoStore';
import type { GiftStyle } from '@/types/xso';
import { CARTRIDGE_PRICE, getCartridge } from '@/lib/cartridges';
import { XSO_MOTION } from '@/lib/layout';
import { CartridgeSelector } from '@/components/storefront/CartridgeSelector';
import { ConversionBar } from '@/components/storefront/ConversionBar';
import { CrtOverlay } from '@/components/storefront/CrtOverlay';

function preferCrtOff(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 768px)').matches
  );
}

function playSelectCue() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
    osc.addEventListener('ended', () => void ctx.close());
  } catch {
    /* ignore */
  }
}

/**
 * Full-bleed mobile storefront — no handheld shell, D-pad, or A/B chrome.
 */
export function Store() {
  const router = useRouter();
  const giftStyle = useXsoStore((s) => s.giftStyle);
  const setField = useXsoStore((s) => s.setField);
  const [crtOn, setCrtOn] = useState(true);
  const [booting, setBooting] = useState(false);
  const [bootPhase, setBootPhase] = useState<
    'idle' | 'insert' | 'checksum' | 'launch'
  >('idle');
  const [isPending, startTransition] = useTransition();
  const bootTimers = useRef<number[]>([]);

  useEffect(() => {
    if (preferCrtOff()) setCrtOn(false);
  }, []);

  useEffect(() => {
    return () => {
      bootTimers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const startBuild = useCallback(() => {
    if (booting) return;
    setBooting(true);
    setBootPhase('insert');
    playSelectCue();
    const style = useXsoStore.getState().giftStyle as GiftStyle;

    bootTimers.current.forEach((id) => window.clearTimeout(id));
    bootTimers.current = [
      window.setTimeout(() => setBootPhase('checksum'), 380),
      window.setTimeout(() => setBootPhase('launch'), 820),
      window.setTimeout(() => {
        startTransition(() => {
          router.push(`/preview?style=${encodeURIComponent(style)}`);
        });
      }, 1100),
    ];
  }, [booting, router, startTransition]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        startBuild();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startBuild]);

  const mounted = getCartridge(giftStyle);
  const controlsLocked = booting || isPending;

  return (
    <div className="relative min-h-screen w-full bg-[#0b0f12] text-console-mist [min-height:100dvh] [min-height:var(--app-height,100dvh)]">
      <CrtOverlay enabled={crtOn} />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 pb-32 pt-6 sm:px-6 sm:pb-36 sm:pt-10">
        <header className="mb-8 sm:mb-10">
          <h1 className="font-arcade text-4xl uppercase tracking-[0.12em] text-white sm:text-5xl md:text-6xl">
            XSO
          </h1>
          <p className="mt-3 max-w-md font-mono text-sm leading-relaxed text-white/50 sm:mt-4 sm:text-base">
            Build a one-of-one emotional time-capsule — pick a style, then craft
            the memory.
          </p>
        </header>

        <section aria-labelledby="style-bay-heading">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2
              id="style-bay-heading"
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/45"
            >
              Choose a style
            </h2>
            <p className="font-mono text-[10px] text-white/30 sm:hidden">
              Swipe
            </p>
          </div>

          <CartridgeSelector
            selectedId={giftStyle}
            onSelect={(id) => {
              if (booting) return;
              setField('giftStyle', id);
              playSelectCue();
            }}
          />
        </section>
      </div>

      <ConversionBar
        onPress={startBuild}
        disabled={controlsLocked}
        styleTitle={mounted.title}
        price={CARTRIDGE_PRICE}
        label={controlsLocked ? 'Loading…' : 'Build your XSO'}
      />

      <AnimatePresence>
        {booting ? (
          <motion.div
            key="boot-overlay"
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0b0f12]/94 px-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={XSO_MOTION.fade}
            aria-live="polite"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-phosphor/70">
              Preparing
            </p>
            <p
              className="mt-4 font-arcade text-2xl uppercase tracking-[0.14em] sm:text-3xl"
              style={{ color: mounted.accent }}
            >
              {mounted.title}
            </p>
            <p className="mt-3 max-w-xs font-mono text-[12px] leading-relaxed text-white/55">
              {bootPhase === 'insert' && 'Loading your style…'}
              {bootPhase === 'checksum' &&
                'Gathering text · imagery · audio…'}
              {bootPhase === 'launch' && 'Opening your studio…'}
            </p>
            <div className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full origin-left rounded-full bg-phosphor"
                initial={{ scaleX: 0.1 }}
                animate={{
                  scaleX:
                    bootPhase === 'insert'
                      ? 0.35
                      : bootPhase === 'checksum'
                        ? 0.7
                        : 1,
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** @deprecated Prefer `Store`. */
export const RetroStorefront = Store;
