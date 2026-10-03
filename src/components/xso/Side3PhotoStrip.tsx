'use client';

import { memo, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { FRAMES_PER_STRIP, toStrips } from '@/lib/photoStrips';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { PolaroidThumb } from '@/components/xso/PolaroidThumb';
import { LIGHT_TWEEN } from '@/components/xso/viewers/shared';

export interface Side3PhotoStripProps {
  data: XsoData;
}

const STICKERS: Array<{
  text: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rotate: number;
  color: string;
  badge?: boolean;
}> = [
  { text: 'ズッ友', top: '5%', right: '3%', rotate: 12, color: '#fff', badge: true },
  { text: '★', top: '14%', left: '2%', rotate: -18, color: '#e8ff4a' },
  { text: '♥', top: '28%', right: '1%', rotate: 22, color: '#ff4db8' },
  { text: 'キラキラ', top: '48%', left: '1%', rotate: -8, color: '#fff', badge: true },
  { text: '✦', top: '62%', right: '4%', rotate: 0, color: '#00f5ff' },
  { text: '♡', bottom: '14%', left: '6%', rotate: -24, color: '#ff4db8' },
  { text: 'ベスト', bottom: '6%', right: '2%', rotate: 6, color: '#fff', badge: true },
];

/** Alternating tilt so several strips read as a loose hand of photo-booth prints. */
const STRIP_TILT = [-2, 1.6, -1.2];

export const Side3PhotoStrip = memo(function Side3PhotoStrip({ data }: Side3PhotoStripProps) {
  const scope = useId();
  const strips = toStrips(data.photos);
  const multi = strips.length > 1;

  return (
    <article
      className={`relative mx-auto flex w-full items-start justify-center ${
        multi ? 'max-w-[460px] gap-4 px-2 pt-2' : 'max-w-[230px]'
      }`}
      aria-label={multi ? `${strips.length} Y2K Purikura photo strips` : 'Y2K Purikura photo strip'}
    >
      {strips.map((panels, s) => (
        <div
          key={s}
          className="min-w-0 flex-1"
          style={multi ? { transform: `rotate(${STRIP_TILT[s] ?? 0}deg)` } : undefined}
        >
          <Strip
            scope={scope}
            data={data}
            panels={panels}
            offset={s * FRAMES_PER_STRIP}
            decorated={s === 0}
            compact={multi}
          />
        </div>
      ))}
    </article>
  );
});

const Strip = memo(function Strip({
  scope,
  data,
  panels,
  offset,
  decorated,
  compact,
}: {
  scope: string;
  data: XsoData;
  panels: string[];
  offset: number;
  decorated: boolean;
  compact: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div
        className={`relative overflow-hidden mobile-flat-shadow shadow-[0_20px_44px_rgba(0,0,0,0.5)] ${
          compact ? 'px-1.5 pb-2.5 pt-2' : 'px-2.5 pb-4 pt-3'
        }`}
        style={{
          background: 'linear-gradient(180deg, #ffd6ec 0%, #ffe4f1 18%, #1a1218 18%, #1a1218 100%)',
          borderRadius: '4px 4px 10px 10px',
          border: '3px solid #fff',
          boxShadow: '0 0 0 4px #ff4db8, 0 0 0 7px #fff, 0 20px 44px rgba(0,0,0,0.5)',
        }}
      >
        <p
          className={`mb-2 truncate text-center font-mono font-bold text-pink-800 ${
            compact ? 'text-[7px] tracking-[0.12em]' : 'text-[9px] tracking-[0.24em]'
          }`}
        >
          {compact
            ? `PURIKURA ${offset / FRAMES_PER_STRIP + 1}`
            : `PURIKURA · ${data.customerName.toUpperCase()}`}
        </p>

        <div
          className={`relative z-10 flex flex-col rounded-sm bg-[#120c14] ${
            compact ? 'gap-1.5 p-1.5' : 'gap-2 p-2'
          }`}
        >
          {panels.map((src, i) => (
            <motion.figure
              key={`${data.id}-photo-${offset + i}`}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? LIGHT_TWEEN : { delay: 0.08 * i, duration: 0.35 }}
              className="relative overflow-hidden will-change-transform"
              style={{
                border: '3px solid rgba(255,255,255,0.95)',
              }}
            >
              <PolaroidThumb
                id={`${scope}${offset + i}`}
                src={src}
                alt={`Photo ${offset + i + 1}`}
                caption={`frame ${String(offset + i + 1).padStart(2, '0')} ♡`}
                className="w-full"
              >
                <LazyMedia
                  src={src}
                  alt={`Photo ${offset + i + 1}`}
                  className="block aspect-[3/4] w-full object-cover mobile-no-filter"
                  width={220}
                  height={293}
                  sizes={
                    compact ? '(max-width: 768px) 28vw, 140px' : '(max-width: 768px) 45vw, 220px'
                  }
                  style={
                    reducedMotion
                      ? undefined
                      : {
                          filter: 'contrast(1.1) saturate(1.15) brightness(1.08)',
                        }
                  }
                />
              </PolaroidThumb>
              <div
                className="pointer-events-none absolute inset-0 max-md:hidden"
                style={{
                  background:
                    'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.55), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.18), transparent 30%)',
                }}
                aria-hidden
              />
              <figcaption className="absolute bottom-1 right-1 rounded bg-black/45 px-1 py-0.5 font-mono text-[7px] tracking-wider text-white/90">
                {String(offset + i + 1).padStart(2, '0')}
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {decorated &&
          !compact &&
          STICKERS.map((sticker) => (
            <span
              key={`${sticker.text}-${sticker.top}-${sticker.bottom}-${sticker.left}`}
              className={`pointer-events-none absolute z-20 font-display font-extrabold drop-shadow-md max-md:hidden ${
                sticker.badge
                  ? 'rounded-full border border-white/80 bg-hotpink px-1.5 py-0.5 text-[9px] tracking-wide'
                  : 'text-[14px]'
              }`}
              style={{
                top: sticker.top,
                left: sticker.left,
                right: sticker.right,
                bottom: sticker.bottom,
                color: sticker.color,
                transform: `rotate(${sticker.rotate}deg)`,
              }}
              aria-hidden
            >
              {sticker.text}
            </span>
          ))}
      </div>
    </>
  );
});
