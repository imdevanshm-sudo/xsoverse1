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
  'polygon(0 0, 32% 0, 32% 5px, 48% 5px, 48% 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)';

/** Handheld-style cartridge: graphite shell, printed label with color header stripe. */
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
  const accent = cartridge.accent;

  return (
    <motion.button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${cartridge.title}, ${cartridge.subtitle}${selected ? ', selected' : ''}`}
      onClick={onSelect}
      className="cart-snap relative w-[11.75rem] shrink-0 touch-manipulation select-none rounded-sm text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60 sm:w-[12.5rem] lg:w-auto"
      initial={false}
      animate={{ y: selected ? -6 : 0 }}
      whileTap={{ scale: 0.96 }}
      transition={transition}
      style={{ '--accent': accent } as CSSProperties}
    >
      {/* Glow halo (outside the clipped shell so it can bleed) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-[3px] rounded-md transition-opacity duration-300 ${
          selected ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ boxShadow: `0 0 0 1px ${accent}55, 0 0 26px ${accent}55, 0 14px 30px rgba(0,0,0,0.5)` }}
      />

      {/* Outer edge (acts as the border) */}
      <div
        className="relative aspect-[10/11.5] w-full p-[1.5px]"
        style={{
          clipPath: SHELL_CLIP,
          background: selected
            ? `linear-gradient(180deg, ${accent}, ${accent}66)`
            : 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
        }}
      >
        {/* Graphite shell */}
        <div
          className="relative flex h-full w-full flex-col"
          style={{
            clipPath: SHELL_CLIP,
            background: 'linear-gradient(170deg, #25292f 0%, #17191d 55%, #111316 100%)',
          }}
        >
          {/* Grip ridges + slot meta */}
          <div className="mx-3 mt-3 flex items-center gap-2">
            <div
              aria-hidden
              className="h-3 flex-1 rounded-[1px] opacity-70"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(180deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 3px)',
              }}
            />
            <span className="mr-3 font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
              ▼ {slot}
            </span>
          </div>

          {/* Recessed label well */}
          <div className="mx-2 mt-2 flex-1 rounded-md bg-black/55 p-[3px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.85)]">
            {/* Printed sticker */}
            <div className="relative flex h-full flex-col overflow-hidden rounded-[4px] bg-[#f2eee4] text-[#101214]">
              {/* Color header stripe with serial */}
              <div
                className="truncate whitespace-nowrap px-2 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#0b0f12]"
                style={{ background: accent }}
              >
                {cartridge.code} <span className="opacity-40">{'//'}</span> {cartridge.title}
              </div>

              {/* Inner sticker border */}
              <div className="relative m-[3px] flex flex-1 flex-col rounded-[2px] border border-black/15 px-1.5 pb-2 pt-1.5">
                <span
                  aria-hidden
                  className="absolute right-1.5 top-0.5 font-arcade text-[28px] font-bold leading-none tracking-tight opacity-40"
                  style={{ color: accent, WebkitTextStroke: '1px rgba(0,0,0,0.25)' }}
                >
                  {slot}
                </span>
                <div className="cart-title-wrap mt-auto">
                  <p
                    className="cart-title whitespace-nowrap font-arcade font-bold uppercase leading-[0.95]"
                    style={{ '--chars': cartridge.title.length } as CSSProperties}
                  >
                    {cartridge.title}
                  </p>
                </div>
                <div aria-hidden className="mt-1.5 flex gap-[3px]">
                  <span className="h-[3px] flex-1 rounded-full" style={{ background: accent }} />
                  <span className="h-[3px] w-3 rounded-full bg-black/80" />
                  <span className="h-[3px] w-1.5 rounded-full bg-black/80" />
                </div>
                <p className="mt-1.5 flex justify-between gap-2 font-mono text-[8.5px] uppercase tracking-[0.14em] text-black/55">
                  <span className="truncate">{cartridge.subtitle}</span>
                  <span className="shrink-0 tabular-nums text-black/40">{cartridge.year}</span>
                </p>
              </div>

              {/* Paper sheen */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.45)_0%,transparent_30%)]"
              />
            </div>
          </div>

          {/* Base edge */}
          <div className="mx-3 mb-2.5 mt-2 flex items-center justify-between">
            <span
              className={`font-mono text-[8px] font-bold uppercase tracking-[0.2em] ${
                selected ? 'text-[color:var(--accent)]' : 'text-white/30'
              }`}
            >
              {selected ? '● Inserted' : 'Tap to load'}
            </span>
            <span aria-hidden className="flex gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-1.5 w-[3px] rounded-[1px] bg-white/10" />
              ))}
            </span>
          </div>

          {/* Smoky frosted veil for unselected carts */}
          <div
            aria-hidden
            className={`cart-veil pointer-events-none absolute inset-0 transition-opacity duration-300 ${
              selected ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </div>
      </div>
    </motion.button>
  );
});
