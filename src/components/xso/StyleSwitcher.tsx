'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { GiftStyle } from '@/types/xso';
import { STYLE_OPTIONS } from '@/lib/styleOptions';
import { XSO_MOTION } from '@/lib/layout';

interface StyleSwitcherProps {
  activeStyle: GiftStyle;
  onChange: (style: GiftStyle) => void;
  /** Overlay on the phone vs external floating pill under the hero. */
  placement?: 'overlay' | 'external';
}

export const StyleSwitcher = memo(function StyleSwitcher({
  activeStyle,
  onChange,
  placement = 'overlay',
}: StyleSwitcherProps) {
  const external = placement === 'external';

  return (
    <nav
      className={
        external
          ? 'mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/70 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'absolute left-1/2 top-3 z-30 flex -translate-x-1/2 gap-1 rounded-2xl border border-white/10 bg-black/65 p-1 shadow-xl backdrop-blur-md'
      }
      aria-label="Change souvenir style"
    >
      {STYLE_OPTIONS.map((style) => {
        const selected = activeStyle === style.id;
        return (
          <button
            key={style.id}
            type="button"
            aria-label={`Show ${style.label}`}
            aria-pressed={selected}
            title={style.label}
            onClick={() => onChange(style.id)}
            className={`relative grid touch-manipulation place-items-center text-lg text-white transition-colors hover:bg-white/10 active:scale-95 ${
              external
                ? 'h-10 w-10 rounded-full'
                : 'h-11 w-11 rounded-xl'
            }`}
          >
            {selected && (
              <motion.span
                layoutId={external ? 'style-pill-ext' : 'style-pill'}
                className={`absolute inset-0 bg-acid shadow-[0_0_18px_rgba(232,255,74,.32)] ${
                  external ? 'rounded-full' : 'rounded-xl'
                }`}
                transition={XSO_MOTION.select}
              />
            )}
            <span
              className={`relative z-10 ${selected ? 'text-ink' : ''}`}
              aria-hidden
            >
              {style.icon}
            </span>
          </button>
        );
      })}
    </nav>
  );
});
