'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { MiniFace } from '@/components/storefront/DeckBox';
import type { GiftStyle } from '@/types/xso';

const CARDS = 4;
const STEP_MS = 1500;
const SPRING = {
  type: 'spring' as const,
  stiffness: 190,
  damping: 22,
  mass: 0.9,
};

type Pose = {
  x: number;
  y: number;
  rotate: number;
  rotateY: number;
  scale: number;
  opacity: number;
  zIndex: number;
};

const pose = (p: Partial<Pose>): Pose => ({
  x: 0,
  y: 0,
  rotate: 0,
  rotateY: 0,
  scale: 1,
  opacity: 1,
  zIndex: 1,
  ...p,
});

const STACK = [
  { x: 0, y: 0, rotate: 0 },
  { x: 5, y: 7, rotate: 3 },
  { x: -4, y: 13, rotate: -3 },
  { x: 3, y: 19, rotate: 1.5 },
];

const SCATTER = [
  { x: -78, y: -26, rotate: -14 },
  { x: 70, y: -34, rotate: 11 },
  { x: -58, y: 38, rotate: 8 },
  { x: 76, y: 34, rotate: -9 },
];

/** Where card `i` sits at animation step `step` for a given format. */
function poseFor(style: GiftStyle, i: number, step: number): Pose {
  switch (style) {
    case 'loop': {
      const depth = (i - (step % CARDS) + CARDS) % CARDS;
      return pose({
        ...STACK[depth],
        scale: 1 - depth * 0.03,
        zIndex: 10 - depth,
      });
    }
    case 'rewind': {
      // Four discards, then everything is recalled in one sweep.
      const k = step % (CARDS + 1);
      const discarded = i < k;
      return discarded
        ? pose({
            x: -96 + i * 6,
            y: 26 + i * 4,
            rotate: -20 + i * 3,
            scale: 0.86,
            opacity: 0.55,
            zIndex: i + 1,
          })
        : pose({ ...(STACK[i - k] ?? STACK[0]), zIndex: 10 - i });
    }
    case 'scrapbook':
      return step % 2
        ? pose({ ...SCATTER[i], scale: 0.9, zIndex: i + 1 })
        : pose({ ...STACK[i], zIndex: 10 - i });
    case 'accordion':
      return step % 2
        ? pose({
            x: (i - 1.5) * 64,
            rotateY: i % 2 ? -16 : 16,
            scale: 0.66,
            zIndex: 5,
          })
        : pose({
            x: (i - 1.5) * 8,
            rotateY: i % 2 ? -70 : 70,
            scale: 0.66,
            zIndex: 5,
          });
    default:
      return pose({});
  }
}

/** Looping miniature of how each format plays, so switching styles is felt instantly. */
export function StyleDemo({ style, glow }: { style: GiftStyle; glow: string }) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const visible = useInView(stage, { margin: '80px' });
  const [step, setStep] = useState(0);

  useEffect(() => setStep(0), [style]);

  // Idle when scrolled away or the tab is hidden so older phones aren't animating offscreen.
  useEffect(() => {
    if (reduce || !visible) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setStep((s) => s + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [reduce, style, visible]);

  return (
    <div
      ref={stage}
      aria-hidden
      className="felt relative grid h-[196px] w-full place-items-center overflow-hidden sm:h-[260px]"
      style={{ perspective: 800 }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={style}
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 55% at 50% 38%, ${glow}2e, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.45 }}
        />
      </AnimatePresence>
      {style === 'moviebox' ? (
        <FilmStrip reduce={Boolean(reduce)} playing={visible} />
      ) : (
        Array.from({ length: CARDS }, (_, i) => {
          const p = poseFor(style, i, step);
          return (
            <motion.div
              key={i}
              className="paper-card absolute h-[124px] w-[92px] overflow-hidden !rounded-[10px] p-2"
              initial={false}
              animate={{
                x: p.x,
                y: p.y,
                rotate: p.rotate,
                rotateY: p.rotateY,
                scale: p.scale,
                opacity: p.opacity,
              }}
              style={{ zIndex: p.zIndex }}
              transition={reduce ? { duration: 0 } : SPRING}
            >
              <MiniFace kind={i} />
            </motion.div>
          );
        })
      )}
    </div>
  );
}

function FilmStrip({ reduce, playing }: { reduce: boolean; playing: boolean }) {
  const frames = [0, 1, 2, 3, 0, 1, 2, 3];
  return (
    <div className="relative w-full overflow-hidden">
      <motion.div
        className="flex w-max gap-0 bg-[#1b1714] py-3"
        animate={reduce || !playing ? undefined : { x: ['0%', '-50%'] }}
        transition={{ duration: 7, ease: 'linear', repeat: Infinity }}
      >
        {frames.map((kind, i) => (
          <div key={i} className="relative px-2.5">
            <div className="mb-1.5 flex justify-between px-0.5">
              {Array.from({ length: 5 }, (_, h) => (
                <span key={h} className="h-1.5 w-2 rounded-[1px] bg-[#efe7d7]/70" />
              ))}
            </div>
            <div className="paper-card h-[112px] w-[84px] overflow-hidden !rounded-[4px] p-1.5">
              <MiniFace kind={kind} />
            </div>
            <div className="mt-1.5 flex justify-between px-0.5">
              {Array.from({ length: 5 }, (_, h) => (
                <span key={h} className="h-1.5 w-2 rounded-[1px] bg-[#efe7d7]/70" />
              ))}
            </div>
          </div>
        ))}
      </motion.div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 45% 70% at 50% 50%, rgba(255,236,200,0.16), transparent 70%), linear-gradient(90deg, rgba(20,18,16,0.85), transparent 20%, transparent 80%, rgba(20,18,16,0.85))',
        }}
      />
    </div>
  );
}
