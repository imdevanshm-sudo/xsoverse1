'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { LazyMedia } from '@/components/xso/LazyMedia';
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

export function Side3PhotoStrip({ data }: Side3PhotoStripProps) {
  const panels = data.photos.slice(0, 4);
  const reducedMotion = useReducedMotion();

  return (
    <article
      className="relative mx-auto w-full max-w-[230px]"
      aria-label="Y2K Purikura photo strip"
    >
      <div
        className="relative overflow-hidden px-2.5 pb-4 pt-3 mobile-flat-shadow shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
        style={{
          background:
            'linear-gradient(180deg, #ffd6ec 0%, #ffe4f1 18%, #1a1218 18%, #1a1218 100%)',
          borderRadius: '4px 4px 10px 10px',
          border: '3px solid #fff',
          boxShadow:
            '0 0 0 4px #ff4db8, 0 0 0 7px #fff, 0 20px 44px rgba(0,0,0,0.5)',
        }}
      >
        <p className="mb-2 text-center font-mono text-[9px] font-bold tracking-[0.24em] text-pink-800">
          PURIKURA · {data.customerName.toUpperCase()}
        </p>

        <div className="relative z-10 flex flex-col gap-2 rounded-sm bg-[#120c14] p-2">
          {panels.map((src, i) => (
            <motion.figure
              key={`${data.id}-photo-${i}`}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reducedMotion
                  ? LIGHT_TWEEN
                  : { delay: 0.08 * i, duration: 0.35 }
              }
              className="relative overflow-hidden"
              style={{
                border: '3px solid rgba(255,255,255,0.95)',
              }}
            >
              <LazyMedia
                src={src}
                alt={`Photo ${i + 1}`}
                className="aspect-[3/4] w-full object-cover mobile-no-filter"
                width={220}
                height={293}
                style={
                  reducedMotion
                    ? undefined
                    : {
                        filter: 'contrast(1.1) saturate(1.15) brightness(1.08)',
                      }
                }
              />
              <div
                className="pointer-events-none absolute inset-0 max-md:hidden"
                style={{
                  background:
                    'radial-gradient(circle at 28% 18%, rgba(255,255,255,0.55), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.18), transparent 30%)',
                }}
                aria-hidden
              />
              <figcaption className="absolute bottom-1 right-1 rounded bg-black/45 px-1 py-0.5 font-mono text-[7px] tracking-wider text-white/90">
                {String(i + 1).padStart(2, '0')}
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {STICKERS.map((sticker) => (
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
        <p
          className="pointer-events-none absolute bottom-10 left-3 z-30 max-w-[7rem] font-hand text-[12px] leading-snug text-[#2a4a7a]/85 max-md:hidden"
          style={{ transform: 'rotate(-7deg)' }}
          aria-hidden
        >
          this one tho ✨
        </p>
      </div>
    </article>
  );
}
