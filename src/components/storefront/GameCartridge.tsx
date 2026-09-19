'use client';

import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { CartridgeSpec } from '@/lib/cartridges';
import { XSO_MOTION } from '@/lib/layout';

interface GameCartridgeProps {
  cartridge: CartridgeSpec;
  selected: boolean;
  index: number;
}

/** Display-only cart shell — selection is hardware D-pad only. */
export const GameCartridge = memo(function GameCartridge({
  cartridge,
  selected,
  index,
}: GameCartridgeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected || !ref.current) return;
    ref.current.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [selected]);

  return (
    <motion.div
      ref={ref}
      role="listitem"
      aria-current={selected ? 'true' : undefined}
      aria-label={`${cartridge.title} cartridge${selected ? ' · mounted' : ''}`}
      className="relative w-[7.25rem] shrink-0 text-left sm:w-32"
      initial={false}
      animate={{
        y: selected ? -10 : 0,
        scale: selected ? 1.05 : 0.96,
        opacity: selected ? 1 : 0.72,
      }}
      transition={XSO_MOTION.snappy}
      style={{ transitionDelay: `${index * 12}ms` }}
    >
      <div
        className={`relative overflow-hidden rounded-b-md rounded-t-[0.65rem] border ${
          selected
            ? 'border-white/35 shadow-[0_12px_24px_rgba(0,0,0,0.45),0_0_16px_var(--glow)]'
            : 'border-black/55 shadow-[0_6px_14px_rgba(0,0,0,0.35)]'
        }`}
        style={
          {
            '--glow': cartridge.accentSoft,
            background:
              'linear-gradient(165deg, #4a4e54 0%, #2c3036 38%, #1a1d22 72%, #0e1013 100%)',
            transform: 'translateZ(0)',
          } as CSSProperties
        }
      >
        <div className="relative mx-auto h-3 w-[72%] rounded-b-[3px] bg-gradient-to-b from-[#1a1e24] to-[#0d1014]">
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
          className="relative m-2 mt-2.5 min-h-[7.5rem] overflow-hidden rounded-sm border border-black/40 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:min-h-[8.25rem]"
          style={{ backgroundColor: cartridge.labelBg, color: cartridge.ink }}
        >
          <div
            className="mb-1.5 h-1 w-full rounded-sm opacity-90"
            style={{ backgroundColor: cartridge.accent }}
          />
          <p className="font-pixel text-[7px] uppercase tracking-[0.22em] opacity-70">
            {cartridge.code} · {cartridge.year}
          </p>
          <p
            className="mt-1 font-pixel text-[11px] uppercase leading-tight tracking-wider sm:text-xs"
            style={{ color: cartridge.accent }}
          >
            {cartridge.title}
          </p>
          <p className="mt-1 font-arcade text-[9px] uppercase tracking-[0.14em] opacity-80">
            {cartridge.subtitle}
          </p>
          <p className="mt-2 line-clamp-3 font-mono text-[8px] leading-snug opacity-65 sm:text-[9px]">
            {cartridge.tagline}
          </p>
          <div className="absolute bottom-1.5 right-1.5 font-pixel text-[6px] uppercase tracking-widest opacity-45">
            XSO™
          </div>
        </div>

        <div className="mx-2 mb-2 flex items-center justify-between">
          <span className="h-2 w-2 rounded-full bg-[#1a1e24] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]" />
          <span className="mx-2 h-1.5 flex-1 rounded-sm bg-black/35" />
          <span className="h-2 w-2 rounded-full bg-[#1a1e24] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]" />
        </div>

        {selected ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
            style={{ backgroundColor: cartridge.accent }}
          />
        ) : null}
      </div>

      <span
        className={`mt-2 block text-center font-arcade text-[9px] uppercase tracking-[0.2em] ${
          selected ? 'text-phosphor' : 'text-console-mist/45'
        }`}
      >
        {selected ? 'IN SLOT' : 'STANDBY'}
      </span>
    </motion.div>
  );
});
