'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, MonitorOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useXsoStore } from '@/store/useXsoStore';
import type { GiftStyle } from '@/types/xso';
import { XSO_MOTION } from '@/lib/layout';
import { CartridgeSelector } from '@/components/storefront/CartridgeSelector';
import { ConsoleBezel } from '@/components/storefront/ConsoleBezel';
import { ConsoleControls } from '@/components/storefront/ConsoleControls';
import { PressStartButton } from '@/components/storefront/PressStartButton';

function preferCrtOff(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    (window.matchMedia('(pointer: coarse)').matches &&
      window.matchMedia('(max-width: 768px)').matches)
  );
}

export function RetroStorefront() {
  const router = useRouter();
  const giftStyle = useXsoStore((s) => s.giftStyle);
  const setField = useXsoStore((s) => s.setField);
  const [crtOn, setCrtOn] = useState(true);
  const [booting, setBooting] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (preferCrtOff()) setCrtOn(false);
  }, []);

  const selectCartridge = useCallback(
    (id: GiftStyle) => {
      setField('giftStyle', id);
    },
    [setField],
  );

  const startBuild = useCallback(() => {
    if (booting) return;
    setBooting(true);
    const style = useXsoStore.getState().giftStyle;
    window.setTimeout(() => {
      startTransition(() => {
        router.push(`/preview?style=${encodeURIComponent(style)}`);
      });
    }, 280);
  }, [booting, router, startTransition]);

  return (
    <div className="xso-page">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 15%, rgba(255,255,255,0.04), transparent 28%),
            radial-gradient(circle at 80% 80%, rgba(0,0,0,0.35), transparent 40%),
            repeating-linear-gradient(125deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 7px)
          `,
        }}
      />

      <motion.div
        className="gpu-fade relative mx-auto w-full max-w-store"
        initial={false}
        animate={{
          opacity: booting ? 0.35 : 1,
          scale: booting ? 0.985 : 1,
        }}
        transition={XSO_MOTION.boot}
      >
        <ConsoleBezel
          crtEnabled={crtOn}
          brand={
            <>
              <p className="font-pixel text-[8px] uppercase tracking-[0.28em] text-phosphor/80 sm:text-[10px] sm:tracking-[0.35em]">
                XSO SYSTEMS
              </p>
              <h1 className="mt-1 font-arcade text-xl uppercase tracking-[0.12em] text-console-mist sm:text-2xl md:text-3xl">
                XSO
              </h1>
            </>
          }
          status={
            <>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-console-mist/50 sm:text-[10px] sm:tracking-[0.2em]">
                Model · HANDHELD-01
              </p>
              <p className="mt-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-phosphor/70 animate-blink sm:text-[8px] sm:tracking-[0.18em]">
                PLAYER 1: READY
              </p>
            </>
          }
          deck={<ConsoleControls />}
        >
          <div className="flex flex-wrap items-end justify-between gap-xso-3">
            <div className="min-w-0 max-w-md">
              <p className="font-pixel text-[8px] uppercase tracking-[0.28em] text-phosphor/70 sm:text-[9px]">
                Choose Your Cartridge
              </p>
              <p className="mt-2 font-mono text-xs leading-relaxed text-console-mist/65 sm:text-sm">
                Five souvenir engines. One slot. Pick a cart, then boot the
                portrait studio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCrtOn((v) => !v)}
              className="inline-flex h-9 items-center gap-2 rounded-xso-control border border-phosphor/25 bg-black/40 px-2.5 font-pixel text-[8px] uppercase tracking-[0.18em] text-phosphor/80 transition hover:border-phosphor/50 hover:text-phosphor"
              aria-pressed={crtOn}
              aria-label={crtOn ? 'Disable CRT overlay' : 'Enable CRT overlay'}
            >
              {crtOn ? (
                <Monitor className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <MonitorOff className="h-3.5 w-3.5" aria-hidden />
              )}
              CRT {crtOn ? 'ON' : 'OFF'}
            </button>
          </div>

          <CartridgeSelector
            selectedId={giftStyle}
            onSelect={selectCartridge}
          />

          <div className="space-y-xso-3">
            <PressStartButton
              onPress={startBuild}
              disabled={booting || isPending}
              label={
                booting || isPending
                  ? 'BOOTING STUDIO…'
                  : 'PRESS START / BUILD XSO'
              }
            />
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-console-mist/40">
              Soft boot → portrait souvenir studio
            </p>
          </div>
        </ConsoleBezel>
      </motion.div>
    </div>
  );
}
