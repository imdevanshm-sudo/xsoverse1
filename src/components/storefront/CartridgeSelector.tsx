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
    <div className="flex flex-col gap-3 sm:gap-xso-5">
      <div
        className="cart-bay -mx-1 flex gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-1 pt-1 sm:mx-0 sm:justify-center sm:gap-xso-4 sm:overflow-visible sm:px-0 sm:pb-xso-3 sm:pt-xso-2"
        role="radiogroup"
        aria-label="Souvenir cartridges"
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

function SlotHud({ cartridge }: { cartridge: CartridgeSpec }) {
  return (
    <div className="overflow-hidden rounded-sm border border-phosphor/20 bg-[#050706]/90 px-3 py-2.5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] sm:p-xso-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[7px] uppercase tracking-[0.2em] text-phosphor/55">
            Mounted · Slot A
          </p>
          <motion.p
            key={cartridge.id}
            className="mt-1 truncate font-arcade text-base uppercase tracking-[0.12em] sm:text-xl sm:tracking-[0.14em]"
            style={{ color: cartridge.accent }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={XSO_MOTION.fade}
          >
            {cartridge.title}
          </motion.p>
          <p className="mt-1.5 font-mono text-[10px] leading-snug text-console-mist/60 sm:text-[11px] sm:leading-relaxed">
            An emotional digital time-capsule —{' '}
            <span className="text-phosphor/85">Curated Text</span>
            {', '}
            <span className="text-phosphor/85">Visual Imagery</span>
            {', and '}
            <span className="text-phosphor/85">Immersive Audio</span>.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-pixel text-[7px] uppercase tracking-[0.16em] text-phosphor/45">
            From
          </p>
          <p className="mt-0.5 font-arcade text-sm uppercase tracking-[0.14em] text-phosphor sm:text-base">
            {CARTRIDGE_PRICE}
          </p>
        </div>
      </div>
    </div>
  );
}
