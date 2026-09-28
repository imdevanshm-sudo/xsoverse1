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

/** Chamfered top-right corner plus a grip notch cut into the top edge. */
const SHELL_CLIP =
  'polygon(0 0, 30% 0, 30% 5px, 46% 5px, 46% 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)';

/** Handheld-style cartridge: graphite shell, recessed sticker label, grip ridges. */
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
    const el = ref.current;
    const bay = el?.parentElement;
    if (!selected || !el || !bay || bay.scrollWidth <= bay.clientWidth) return;
    el.scrollIntoView({
      behavior: quality.reducedMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selected, quality.reducedMotion]);

  const slot = String(index + 1).padStart(2, '0');

  return (
    <motion.button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${cartridge.title}, ${cartridge.subtitle}${selected ? ', selected' : ''}`}
      onClick={onSelect}
      className="cart-snap group relative w-[9.25rem] shrink-0 touch-manipulation select-none text-left rounded-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60 sm:w-[10.5rem] md:w-auto"
      initial={false}
      animate={{ y: selected ? -6 : 0, opacity: selected ? 1 : 0.62 }}
      whileTap={{ scale: 0.96 }}
      transition={transition}
      style={{ '--accent': cartridge.accent } as CSSProperties}
    >
      {/* Floor glow when inserted */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -bottom-3 left-1/2 h-8 w-4/5 -translate-x-1/2 rounded-[50%] transition-opacity duration-300 ${
          selected ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `radial-gradient(ellipse at center, ${cartridge.accentSoft}, transparent 70%)`,
        }}
      />

      {/* Outer edge (acts as the border) */}
      <div
        className="relative aspect-[10/11] w-full p-px transition-colors duration-200"
        style={{
          clipPath: SHELL_CLIP,
          background: selected
            ? `linear-gradient(180deg, ${cartridge.accent}, rgba(255,255,255,0.08))`
            : 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))',
        }}
      >
        {/* Graphite shell */}
        <div
          className="relative flex h-full w-full flex-col"
          style={{
            clipPath: SHELL_CLIP,
            background: 'linear-gradient(170deg, #23272d 0%, #16191d 55%, #111316 100%)',
          }}
        >
          {/* Grip ridges */}
          <div
            aria-hidden
            className="mx-3 mt-3 h-3 rounded-[1px] opacity-70"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 3px)',
            }}
          />

          {/* Embossed insert arrow + slot meta */}
          <div className="mx-3 mt-1.5 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
            <span aria-hidden>▼</span>
            <span>Slot {slot}</span>
          </div>

          {/* Recessed sticker label */}
          <div className="mx-2.5 mt-1.5 flex-1 rounded-md bg-black/50 p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
            <div
              className="relative flex h-full flex-col overflow-hidden rounded-[4px] px-2.5 pb-2 pt-2"
              style={{
                background: `linear-gradient(160deg, transparent 55%, rgba(0,0,0,0.3) 100%), ${cartridge.accent}`,
                color: '#0b0f12',
              }}
            >
              <div className="flex items-center justify-between font-mono text-[8px] font-bold uppercase tracking-[0.16em] opacity-70">
                <span>{cartridge.code}</span>
                <span>{cartridge.year}</span>
              </div>
              <p className="mt-auto whitespace-nowrap font-arcade text-[15px] font-extrabold uppercase leading-none tracking-[0.06em] sm:text-base md:text-[13px] lg:text-[15px]">
                {cartridge.title}
              </p>
              <div aria-hidden className="mt-1.5 h-[3px] w-full bg-black/80" />
              <p className="mt-1 truncate font-mono text-[8.5px] uppercase tracking-[0.14em] opacity-75">
                {cartridge.subtitle}
              </p>
              {/* Sticker sheen */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.35)_0%,transparent_32%)] mix-blend-soft-light"
              />
            </div>
          </div>

          {/* Base edge */}
          <div className="mx-3 mb-2.5 mt-2 flex items-center justify-between">
            <span
              className={`font-mono text-[8px] uppercase tracking-[0.18em] transition-colors ${
                selected ? 'text-[color:var(--accent)]' : 'text-white/30'
              }`}
            >
              {selected ? 'Inserted' : 'Tap to load'}
            </span>
            <span aria-hidden className="flex gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 w-[3px] rounded-[1px] bg-white/10" />
              ))}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
});
