'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useXsoStore } from '@/store/useXsoStore';
import type { GiftStyle } from '@/types/xso';
import { CARTRIDGES, getCartridge } from '@/lib/cartridges';
import { XSO_MOTION } from '@/lib/layout';
import { CartridgeSelector } from '@/components/storefront/CartridgeSelector';
import { ConsoleBezel } from '@/components/storefront/ConsoleBezel';
import { ConsoleControls } from '@/components/storefront/ConsoleControls';
import { PressStartButton } from '@/components/storefront/PressStartButton';

function preferCrtOff(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 768px)').matches
  );
}

function playConsoleClick(kind: 'pad' | 'start') {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'start' ? 'square' : 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(kind === 'start' ? 180 : 320, now);
    osc.frequency.exponentialRampToValueAtTime(
      kind === 'start' ? 90 : 180,
      now + 0.08,
    );
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
    osc.addEventListener('ended', () => void ctx.close());
  } catch {
    /* ignore */
  }
}

type PadKey = 'left' | 'right' | 'up' | 'down' | 'a' | 'b';

/**
 * Main console storefront — mobile-first cartridge bay + Press Start.
 * Instagram / thumb-zone oriented: select cart → read capsule → start.
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
  const [padPress, setPadPress] = useState<Partial<Record<PadKey, boolean>>>(
    {},
  );
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

  const flashPad = useCallback((key: PadKey) => {
    setPadPress((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      setPadPress((prev) => ({ ...prev, [key]: false }));
    }, 120);
  }, []);

  const cycleCartridge = useCallback(
    (direction: 1 | -1) => {
      if (booting) return;
      const index = CARTRIDGES.findIndex((c) => c.id === giftStyle);
      const next =
        CARTRIDGES[
          (index + direction + CARTRIDGES.length) % CARTRIDGES.length
        ];
      setField('giftStyle', next.id);
      playConsoleClick('pad');
    },
    [booting, giftStyle, setField],
  );

  const startBuild = useCallback(() => {
    if (booting) return;
    setBooting(true);
    setBootPhase('insert');
    playConsoleClick('start');
    const style = useXsoStore.getState().giftStyle as GiftStyle;

    bootTimers.current.forEach((id) => window.clearTimeout(id));
    bootTimers.current = [
      window.setTimeout(() => setBootPhase('checksum'), 420),
      window.setTimeout(() => setBootPhase('launch'), 900),
      window.setTimeout(() => {
        startTransition(() => {
          router.push(`/preview?style=${encodeURIComponent(style)}`);
        });
      }, 1280),
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

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          flashPad('left');
          cycleCartridge(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          flashPad('right');
          cycleCartridge(1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          flashPad('up');
          cycleCartridge(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          flashPad('down');
          cycleCartridge(1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          flashPad('a');
          startBuild();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cycleCartridge, flashPad, startBuild]);

  const mounted = getCartridge(giftStyle);
  const controlsLocked = booting || isPending;

  return (
    <div className="xso-store-shell">
      <motion.div
        className="relative w-full max-w-store"
        initial={false}
        animate={{
          opacity: bootPhase === 'launch' ? 0.25 : 1,
          scale: bootPhase === 'launch' ? 0.985 : 1,
        }}
        transition={XSO_MOTION.boot}
      >
        <ConsoleBezel
          crtEnabled={crtOn}
          brand={
            <>
              <p className="font-pixel text-[7px] uppercase tracking-[0.24em] text-phosphor/70 sm:text-[10px] sm:tracking-[0.35em]">
                XSO SYSTEMS
              </p>
              <h1 className="mt-0.5 font-arcade text-lg uppercase tracking-[0.12em] text-console-mist sm:mt-1 sm:text-2xl md:text-3xl">
                XSO
              </h1>
            </>
          }
          status={
            <p className="font-pixel text-[7px] uppercase tracking-[0.14em] text-phosphor/75 animate-blink sm:text-[8px] sm:tracking-[0.18em]">
              {booting ? 'BOOT…' : 'READY'}
            </p>
          }
          deck={
            <ConsoleControls
              disabled={controlsLocked}
              pressed={padPress}
              onPadLeft={() => {
                flashPad('left');
                cycleCartridge(-1);
              }}
              onPadRight={() => {
                flashPad('right');
                cycleCartridge(1);
              }}
              onPadUp={() => {
                flashPad('up');
                cycleCartridge(-1);
              }}
              onPadDown={() => {
                flashPad('down');
                cycleCartridge(1);
              }}
              onActionA={() => {
                flashPad('a');
                startBuild();
              }}
              onActionB={() => {
                flashPad('b');
                cycleCartridge(1);
              }}
            />
          }
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-pixel text-[8px] uppercase tracking-[0.22em] text-phosphor/70 sm:text-[9px] sm:tracking-[0.28em]">
              Cartridge bay
            </p>
            <p className="font-mono text-[9px] text-console-mist/40 sm:text-[10px]">
              Swipe to choose
            </p>
          </div>

          <CartridgeSelector
            selectedId={giftStyle}
            onSelect={(id) => {
              if (booting) return;
              setField('giftStyle', id);
              playConsoleClick('pad');
            }}
          />

          <PressStartButton
            onPress={startBuild}
            disabled={controlsLocked}
            label={
              controlsLocked
                ? 'LOADING INTO MEMORY…'
                : 'PRESS START / BUILD XSO'
            }
          />

          <AnimatePresence>
            {booting ? (
              <motion.div
                key="boot-overlay"
                className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030504]/92 px-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                aria-live="polite"
              >
                <p className="font-pixel text-[9px] uppercase tracking-[0.28em] text-phosphor/70">
                  XSO BIOS
                </p>
                <p
                  className="mt-4 font-arcade text-xl uppercase tracking-[0.16em] sm:text-2xl"
                  style={{ color: mounted.accent }}
                >
                  {mounted.title}
                </p>
                <p className="mt-3 max-w-xs font-mono text-[11px] leading-relaxed text-console-mist/65">
                  {bootPhase === 'insert' && 'Seating cartridge in Slot A…'}
                  {bootPhase === 'checksum' &&
                    'Verifying text · imagery · audio…'}
                  {bootPhase === 'launch' && 'Mapping souvenir into memory…'}
                </p>
                <div className="mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full origin-left rounded-full bg-phosphor"
                    initial={{ scaleX: 0.08 }}
                    animate={{
                      scaleX:
                        bootPhase === 'insert'
                          ? 0.34
                          : bootPhase === 'checksum'
                            ? 0.72
                            : 1,
                    }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </ConsoleBezel>
      </motion.div>
    </div>
  );
}

/** @deprecated Prefer `Store` — kept for existing imports. */
export const RetroStorefront = Store;
