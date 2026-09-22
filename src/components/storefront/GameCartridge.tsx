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

/** Full-bleed storefront style tile — swipe / tap to select. */
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
      aria-label={`${cartridge.title}${selected ? ' · selected' : ''}`}
      onClick={onSelect}
      className="cart-snap relative w-[9.5rem] shrink-0 touch-manipulation select-none text-left sm:w-[11rem]"
      initial={false}
      animate={{
        scale: selected ? 1 : 0.97,
        opacity: selected ? 1 : 0.72,
      }}
      whileTap={{ scale: 0.96 }}
      transition={transition}
      style={{ transitionDelay: `${index * 8}ms` }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-3 transition-[border-color,box-shadow] duration-200 ${
          selected
            ? 'border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent),0_12px_32px_rgba(0,0,0,0.45)]'
            : 'border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.35)]'
        }`}
        style={
          {
            '--accent': cartridge.accent,
            background: `linear-gradient(165deg, ${cartridge.labelBg} 0%, #0a0c0e 100%)`,
            color: cartridge.ink,
          } as CSSProperties
        }
      >
        <div
          className="mb-3 h-1 w-10 rounded-full"
          style={{ backgroundColor: cartridge.accent }}
        />
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-55">
          {cartridge.code}
        </p>
        <p
          className="mt-1.5 font-arcade text-base uppercase tracking-[0.12em] sm:text-lg"
          style={{ color: cartridge.accent }}
        >
          {cartridge.title}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
          {cartridge.subtitle}
        </p>
        <p className="mt-3 line-clamp-2 font-mono text-[11px] leading-snug opacity-60">
          {cartridge.tagline}
        </p>

        {selected ? (
          <span
            className="mt-3 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em]"
            style={{
              backgroundColor: cartridge.accentSoft,
              color: cartridge.accent,
            }}
          >
            Selected
          </span>
        ) : (
          <span className="mt-3 inline-block font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">
            Tap to choose
          </span>
        )}
      </div>
    </motion.button>
  );
});
