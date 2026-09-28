'use client';

import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, ImageIcon, Type, type LucideIcon } from 'lucide-react';
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
    <div className="flex w-full flex-col gap-6 sm:gap-8">
      <div
        className="cart-bay -mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-5 pt-3 sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0"
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

      <StyleDetail cartridge={selected} />
    </div>
  );
});

const PILLARS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Type, title: 'Curated Text', body: 'Letters, lore and inside jokes, in your words.' },
  { icon: ImageIcon, title: 'Visual Imagery', body: 'Photos framed as tactile, hand-held keepsakes.' },
  { icon: AudioLines, title: 'Immersive Audio', body: 'Sound design and a voice note they can replay.' },
];

function StyleDetail({ cartridge }: { cartridge: CartridgeSpec }) {
  return (
    <section
      className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_48px_rgba(0,0,0,0.35)] sm:p-6 md:backdrop-blur-xl"
      aria-live="polite"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full opacity-60 transition-[background] duration-500"
        style={{
          background: `radial-gradient(circle, ${cartridge.accentSoft}, transparent 65%)`,
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            Slot A <span className="text-white/20">{"//"}</span> {cartridge.code}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={cartridge.id}
              className="mt-2 font-arcade text-2xl font-bold uppercase tracking-[0.08em] sm:text-3xl"
              style={{ color: cartridge.accent }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={XSO_MOTION.fade}
            >
              {cartridge.title}
            </motion.h2>
          </AnimatePresence>
          <p className="mt-1.5 font-mono text-xs text-white/45">{cartridge.tagline}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
            One-time
          </p>
          <p className="mt-2 font-mono text-lg font-bold tabular-nums tracking-tight text-white sm:text-xl">
            {CARTRIDGE_PRICE}
          </p>
        </div>
      </div>

      <div className="my-4 h-px bg-gradient-to-r from-white/15 via-white/5 to-transparent sm:my-5" />

      <ul className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
        {PILLARS.map(({ icon: Icon, title, body }, index) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3 sm:flex-col sm:gap-2.5 sm:p-4"
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"
              style={{ color: cartridge.accent }}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="flex items-baseline gap-2 text-sm font-semibold text-white/90">
                <span className="font-mono text-[10px] font-normal tabular-nums text-white/30">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {title}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-white/50">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
