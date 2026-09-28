'use client';

import { motion } from 'framer-motion';

interface ConversionBarProps {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  styleTitle?: string;
  styleCode?: string;
  accent?: string;
  price?: string;
}

/** Frosted sticky footer holding the primary build action in thumb reach. */
export function ConversionBar({
  onPress,
  disabled = false,
  label = 'Build your XSO',
  styleTitle,
  styleCode,
  accent = '#9dffb0',
  price,
}: ConversionBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="pointer-events-auto border-t border-white/10 bg-[#0b0f12]/90 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_rgba(0,0,0,0.35)] supports-[backdrop-filter]:bg-[#0b0f12]/65 supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:backdrop-saturate-150 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 md:max-w-4xl lg:max-w-5xl">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
              />
              {styleCode ? <span>{styleCode}</span> : null}
              {styleTitle ? <span className="text-white/70">{styleTitle}</span> : null}
            </p>
            {price ? (
              <p className="mt-1 font-mono text-base font-bold tabular-nums tracking-tight text-white">
                {price}
                <span className="ml-1.5 text-[10px] font-normal uppercase tracking-[0.16em] text-white/35">
                  once
                </span>
              </p>
            ) : null}
          </div>
          <motion.button
            type="button"
            onClick={onPress}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.94, y: 2 }}
            transition={{ type: 'spring', stiffness: 600, damping: 28, mass: 0.5 }}
            className="relative min-h-12 shrink-0 touch-manipulation rounded-full bg-phosphor px-6 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#0a120e] shadow-[0_4px_0_#4fae66,0_10px_28px_rgba(157,255,176,0.28)] transition-[box-shadow,opacity] duration-100 active:shadow-[0_1px_0_#4fae66,0_4px_14px_rgba(157,255,176,0.2)] disabled:cursor-wait disabled:opacity-60 sm:px-8 sm:text-[10px]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3 top-1 h-1/3 rounded-full bg-gradient-to-b from-white/40 to-transparent"
            />
            <span className="relative">{label}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
