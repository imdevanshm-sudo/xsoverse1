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
    <div className="space-y-xso-5">
      <div
        className="flex gap-xso-3 overflow-x-auto overscroll-x-contain pb-xso-3 pt-xso-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:gap-xso-4 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        role="radiogroup"
        aria-label="Souvenir cartridges"
      >
        {CARTRIDGES.map((cart, index) => (
          <GameCartridge
            key={cart.id}
            cartridge={cart}
            selected={selectedId === cart.id}
            onSelect={() => onSelect(cart.id)}
            index={index}
          />
        ))}
      </div>

      <SlotHud cartridge={selected} />
    </div>
  );
});

function SlotHud({ cartridge }: { cartridge: CartridgeSpec }) {
  return (
    <div className="grid gap-xso-3 overflow-hidden rounded-xso-panel border border-phosphor/15 bg-black/35 p-xso-3 sm:grid-cols-[1.2fr_0.8fr] sm:p-xso-4">
      <div className="min-w-0">
        <p className="font-pixel text-[8px] uppercase tracking-[0.22em] text-phosphor/60">
          Slot A · Mounted
        </p>
        <motion.p
          key={cartridge.id}
          className="mt-2 truncate font-arcade text-lg uppercase tracking-[0.14em] sm:text-xl"
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
  );
}
