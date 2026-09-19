'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  CARTRIDGE_PRICE,
  CARTRIDGES,
  getCartridge,
  type CartridgeSpec,
} from '@/lib/cartridges';
import { XSO_MOTION } from '@/lib/layout';
import type { GiftStyle } from '@/types/xso';
import { GameCartridge } from '@/components/storefront/GameCartridge';

interface CartridgeSelectorProps {
  selectedId: GiftStyle;
  onSelect: (id: GiftStyle) => void;
}

export const CartridgeSelector = memo(function CartridgeSelector({
  selectedId,
  onSelect,
}: CartridgeSelectorProps) {
  const selected = getCartridge(selectedId);

  return (
    <div className="space-y-xso-4 sm:space-y-xso-5">
      <div
        className="flex gap-xso-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-xso-3 pt-xso-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:gap-xso-4 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label="Souvenir cartridges · tap or use D-pad"
      >
        {CARTRIDGES.map((cart, index) => (
          <GameCartridge
            key={cart.id}
            cartridge={cart}
            selected={selectedId === cart.id}
            index={index}
            onSelect={() => onSelect(cart.id)}
          />
        ))}
      </div>

      <SlotHud cartridge={selected} />
    </div>
  );
});

function AudioWaveform({ color }: { color: string }) {
  return (
    <svg
      width="36"
      height="16"
      viewBox="0 0 36 16"
      aria-hidden
      className="shrink-0 opacity-90"
    >
      {[3, 7, 11, 5, 13, 8, 4, 10, 6].map((h, i) => (
        <rect
          key={i}
          x={i * 4}
          y={(16 - h) / 2}
          width="2.2"
          height={h}
          rx="1"
          fill={color}
          className="origin-center animate-pulse"
          style={{ animationDelay: `${i * 90}ms`, animationDuration: '1.4s' }}
        />
      ))}
    </svg>
  );
}

function SlotHud({ cartridge }: { cartridge: CartridgeSpec }) {
  return (
    <div className="overflow-hidden rounded-sm border border-phosphor/20 bg-[#050706]/85 p-xso-3 shadow-[inset_0_0_24px_rgba(0,0,0,0.55)] sm:p-xso-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-phosphor/10 pb-2">
        <p className="font-pixel text-[8px] uppercase tracking-[0.22em] text-phosphor/65">
          Slot A · Mounted
        </p>
        <div className="flex items-center gap-2">
          <AudioWaveform color={cartridge.accent} />
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-console-mist/45">
            AUDIO LIVE
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-xso-3 sm:grid-cols-[1.35fr_0.65fr] sm:items-end">
        <div className="min-w-0">
          <motion.p
            key={cartridge.id}
            className="truncate font-arcade text-lg uppercase tracking-[0.14em] sm:text-xl"
            style={{ color: cartridge.accent }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={XSO_MOTION.fade}
          >
            {cartridge.title}
          </motion.p>
          <p className="mt-1 font-mono text-xs text-console-mist/60">
            {cartridge.tagline}
          </p>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-console-mist/55 sm:text-[11px]">
            Emotional time-capsule ·{' '}
            <span className="text-phosphor/80">Curated Text</span>
            {' · '}
            <span className="text-phosphor/80">Visual Imagery</span>
            {' · '}
            <span className="text-phosphor/80">Immersive Audio</span>
          </p>
        </div>
        <div className="flex flex-col items-start justify-center border-t border-phosphor/10 pt-xso-3 sm:items-end sm:border-l sm:border-t-0 sm:pl-xso-4 sm:pt-0">
          <p className="font-pixel text-[8px] uppercase tracking-[0.2em] text-phosphor/55">
            Credit
          </p>
          <p className="mt-1 font-arcade text-base uppercase tracking-[0.16em] text-phosphor animate-blink sm:text-lg">
            INSERT {CARTRIDGE_PRICE}
          </p>
        </div>
      </div>
    </div>
  );
}
