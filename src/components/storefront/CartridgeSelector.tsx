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
    <div className="flex w-full flex-col gap-5 sm:gap-6">
      {/* Mobile / tablet: horizontal snap bay */}
      <div
        className="cart-bay flex w-full gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1 pt-1 md:hidden"
        role="radiogroup"
        aria-label="Choose a souvenir style"
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

      {/* Desktop: responsive card grid */}
      <div
        className="hidden md:grid md:grid-cols-5 md:gap-3"
        role="radiogroup"
        aria-label="Choose a souvenir style"
      >
        {CARTRIDGES.map((cart) => {
          const active = selectedId === cart.id;
          return (
            <button
              key={cart.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(cart.id)}
              className={`rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 ${
                active
                  ? 'border-white/25 bg-white/[0.07]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
              style={
                active
                  ? {
                      boxShadow: `0 0 0 1px ${cart.accent}, 0 12px 28px rgba(0,0,0,0.35)`,
                    }
                  : undefined
              }
            >
              <div
                className="mb-3 h-1 w-8 rounded-full"
                style={{ backgroundColor: cart.accent }}
              />
              <p
                className="font-arcade text-sm uppercase tracking-[0.12em]"
                style={{ color: cart.accent }}
              >
                {cart.title}
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
                {cart.subtitle}
              </p>
              <p className="mt-2 line-clamp-2 font-mono text-[11px] leading-snug text-white/40">
                {cart.tagline}
              </p>
            </button>
          );
        })}
      </div>

      <StyleDetail cartridge={selected} />
    </div>
  );
});

function StyleDetail({ cartridge }: { cartridge: CartridgeSpec }) {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Your keep · {cartridge.code}
          </p>
          <motion.h2
            key={cartridge.id}
            className="mt-1.5 font-arcade text-2xl uppercase tracking-[0.1em] sm:text-3xl"
            style={{ color: cartridge.accent }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={XSO_MOTION.fade}
          >
            {cartridge.title}
          </motion.h2>
          <p className="mt-2 max-w-xl font-mono text-sm leading-relaxed text-white/55">
            An emotional digital time-capsule crafted from{' '}
            <span className="text-phosphor/90">Curated Text</span>,{' '}
            <span className="text-phosphor/90">Visual Imagery</span>, and{' '}
            <span className="text-phosphor/90">Immersive Audio</span>.
          </p>
          <p className="mt-2 font-mono text-xs text-white/40">
            {cartridge.tagline}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
            From
          </p>
          <p className="mt-1 font-arcade text-lg tracking-[0.08em] text-phosphor">
            {CARTRIDGE_PRICE}
          </p>
        </div>
      </div>
    </section>
  );
}
