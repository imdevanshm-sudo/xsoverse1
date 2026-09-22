'use client';

import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { CartridgeSpec } from '@/lib/cartridges';
import { motionForDevice } from '@/lib/layout';
import { useDeviceQuality } from '@/hooks/useDeviceQuality';

interface GameCartridgeProps {
  cartridge: CartridgeSpec;
  selected: boolean;
  index: number;
  onSelect: () => void;
}

/** Snap-friendly cart shell for the horizontal bay. */
export const GameCartridge = memo(function GameCartridge({
  cartridge,
  selected,
  index,
  onSelect,
}: GameCartridgeProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const quality = useDeviceQuality();
  const transition = motionForDevice({
    reducedMotion: quality.reducedMotion,
    lowEnd: quality.tier === 'low',
  });

  useEffect(() => {
    if (!selected || !ref.current) return;
    ref.current.scrollIntoView({
      behavior: quality.reducedMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selected, quality.reducedMotion]);

  return (
    <motion.button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${cartridge.title} cartridge${selected ? ' · mounted' : ''}`}
      onClick={onSelect}
      className="cart-snap relative w-[6.35rem] shrink-0 touch-manipulation select-none text-left sm:w-32"
      initial={false}
      animate={{
        y: selected ? -6 : 0,
        scale: selected ? 1.03 : 0.94,
        opacity: selected ? 1 : 0.68,
      }}
      whileTap={{ scale: 0.96 }}
      transition={transition}
      style={{ transitionDelay: `${index * 10}ms` }}
    >
      <div
        className={`relative overflow-hidden rounded-b-md rounded-t-[0.6rem] border-2 ${
          selected
            ? 'border-[color:var(--accent)] shadow-[0_10px_22px_rgba(0,0,0,0.45),0_0_18px_var(--glow)]'
            : 'border-black/50 shadow-[0_5px_12px_rgba(0,0,0,0.35)]'
        }`}
        style={
          {
            '--glow': cartridge.accentSoft,
            '--accent': cartridge.accent,
            background:
              'linear-gradient(165deg, #4a4e54 0%, #2c3036 38%, #1a1d22 72%, #0e1013 100%)',
            transform: 'translateZ(0)',
          } as CSSProperties
        }
      >
        <div className="relative mx-auto h-2.5 w-[70%] rounded-b-[3px] bg-gradient-to-b from-[#1a1e24] to-[#0d1014] sm:h-3 sm:w-[72%]">
          <div className="absolute inset-x-1 top-0.5 flex justify-between gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-[3px] rounded-[1px] bg-[#c4a35a]/opacity-80"
              />
            ))}
          </div>
        </div>

        <div
          className="relative m-1.5 mt-2 min-h-[5.25rem] overflow-hidden rounded-sm border border-black/40 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:m-2 sm:min-h-[7rem] sm:p-2"
          style={{ backgroundColor: cartridge.labelBg, color: cartridge.ink }}
        >
          <div
            className="mb-1 h-1 w-full rounded-sm opacity-90"
            style={{ backgroundColor: cartridge.accent }}
          />
          <p className="font-pixel text-[6px] uppercase tracking-[0.18em] opacity-65 sm:text-[7px] sm:tracking-[0.22em]">
            {cartridge.code}
          </p>
          <p
            className="mt-0.5 font-pixel text-[10px] uppercase leading-tight tracking-wider sm:mt-1 sm:text-xs"
            style={{ color: cartridge.accent }}
          >
            {cartridge.title}
          </p>
          <p className="mt-0.5 font-arcade text-[8px] uppercase tracking-[0.12em] opacity-75 sm:mt-1 sm:text-[9px]">
            {cartridge.subtitle}
          </p>
          <p className="mt-1.5 hidden line-clamp-3 font-mono text-[9px] leading-snug opacity-65 sm:mt-2 sm:block">
            {cartridge.tagline}
          </p>
        </div>

        <div className="mx-1.5 mb-1.5 flex items-center justify-between sm:mx-2 sm:mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1a1e24] sm:h-2 sm:w-2" />
          <span className="mx-1.5 h-1 flex-1 rounded-sm bg-black/35 sm:mx-2 sm:h-1.5" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#1a1e24] sm:h-2 sm:w-2" />
        </div>

        {selected ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5"
            style={{ backgroundColor: cartridge.accent }}
            aria-hidden
          />
        ) : null}
      </div>

      <span
        className={`mt-1.5 block text-center font-arcade text-[8px] uppercase tracking-[0.18em] sm:mt-2 sm:text-[9px] ${
          selected ? 'text-phosphor' : 'text-console-mist/40'
        }`}
      >
        {selected ? 'MOUNTED' : 'SWIPE'}
      </span>
    </motion.button>
  );
});
