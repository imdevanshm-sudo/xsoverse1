'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ThemePack } from '@/lib/themes';

const CARD_COUNT = 4;
const SPRING = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 22,
  mass: 0.8,
};

function cardVariants(index: number): Variants {
  const offset = index - (CARD_COUNT - 1) / 2;
  return {
    rest: { x: offset * 3, y: -14 - index * 3, rotate: offset * 2, rotateX: 0 },
    open: {
      x: offset * 30,
      y: -62 - Math.abs(offset) * -6,
      rotate: offset * 11,
      rotateX: -10,
    },
  };
}

const OPEN_DELAY_MS = 320;
/** If navigation never happens (offline, cancelled), re-arm the box. */
const REARM_MS = 2500;

/** Physical deck box: four mini cards peek out and fan open on hover/tap. */
export function DeckBox({
  theme,
  styleLabel,
  loaded,
  onOpen,
  onCustomize,
}: {
  theme: ThemePack;
  styleLabel: string;
  loaded: boolean;
  onOpen: () => void;
  onCustomize: () => void;
}) {
  const reduce = useReducedMotion();
  const [opening, setOpening] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const open = () => {
    if (opening) return;
    if (reduce) {
      onOpen();
      return;
    }
    setOpening(true);
    timers.current.push(
      window.setTimeout(onOpen, OPEN_DELAY_MS),
      window.setTimeout(() => setOpening(false), REARM_MS),
    );
  };

  return (
    <div className="relative flex w-full flex-col items-center">
      <motion.button
        type="button"
        onClick={open}
        initial="rest"
        animate={opening ? 'open' : 'rest'}
        whileHover="open"
        whileFocus="open"
        whileTap={{ scale: 0.98 }}
        className="deck-box group flex w-full touch-manipulation flex-col items-center rounded-3xl pb-2 text-center"
        aria-label={`${theme.title}: load this deck and open the preview in ${styleLabel}`}
      >
        <div className="relative h-[250px] w-full max-w-[230px]" style={{ perspective: 900 }}>
          {loaded ? (
            <span className="pointer-events-none absolute -right-2 top-[98px] z-40 rotate-[6deg] rounded-md border-2 border-[#9daf88]/80 bg-[#1f231c] px-2 py-0.5 font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9d6b6] shadow-[0_6px_14px_-6px_rgba(0,0,0,0.7)]">
              ✓ Loaded
            </span>
          ) : null}
          <div
            aria-hidden
            className="absolute inset-x-3 bottom-[52%] h-6 rounded-t-[10px]"
            style={{ background: theme.box.body, filter: 'brightness(0.62)' }}
          />

          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <motion.div
              key={index}
              aria-hidden
              variants={reduce ? undefined : cardVariants(index)}
              transition={SPRING}
              className="paper-card absolute bottom-[40%] left-1/2 -ml-[52px] h-[140px] w-[104px] origin-bottom overflow-hidden !rounded-[10px] p-2"
              style={{ zIndex: 10 + index }}
            >
              <MiniFace kind={index} />
            </motion.div>
          ))}

          <div
            className="absolute inset-x-0 bottom-0 z-30 flex h-[56%] flex-col justify-end overflow-hidden rounded-[16px] p-3"
            style={{
              background: `linear-gradient(180deg, ${theme.box.body} 0%, color-mix(in srgb, ${theme.box.body} 82%, #000) 100%)`,
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 18px rgba(0,0,0,0.25), 0 18px 30px -12px rgba(0,0,0,0.7)',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60 mix-blend-multiply"
              style={{
                backgroundImage: 'var(--paper-noise)',
                backgroundSize: '200px 200px',
              }}
            />
            <div
              className="relative rounded-[10px] px-3 py-2.5 text-left"
              style={{ background: theme.box.label, color: '#2b2825' }}
            >
              <p className="font-receipt text-[10px] uppercase tracking-[0.2em] text-[#8a7b66]">
                {theme.code} · 4 memories inside
              </p>
              <p className="mt-0.5 font-serif text-[19px] font-semibold leading-tight">
                {theme.title}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 max-w-[250px] text-[14px] leading-relaxed text-[#b3a794]">
          {theme.blurb}
        </p>
        <p className="mt-2 font-receipt text-[11px] font-bold uppercase tracking-[0.16em] text-[#e2b48f] transition-colors group-hover:text-[#f7f4eb]">
          Open the box →
        </p>
      </motion.button>
      <button
        type="button"
        onClick={onCustomize}
        className="mt-2 inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-xl px-4 font-receipt text-[11px] font-bold uppercase tracking-[0.16em] text-[#a89c8a] underline decoration-[#5a534b] underline-offset-4 transition-colors hover:text-[#f7f4eb] hover:decoration-[#e2b48f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2b48f] active:scale-[0.98]"
        aria-label={`Start from ${theme.title} and write your own`}
      >
        Write your own
      </button>
    </div>
  );
}

/** Tiny stand-ins for receipt, audit, photo strip and letter. */
export function MiniFace({ kind }: { kind: number }) {
  if (kind === 0) {
    return (
      <div className="flex h-full flex-col gap-1 font-receipt text-[6px] uppercase text-[#6b6257]">
        <p className="text-center text-[7px] font-bold text-[#2b2825]">Receipt</p>
        {[70, 90, 60, 80, 50].map((w, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="h-[3px] rounded bg-[#2b2825]/25" style={{ width: `${w}%` }} />
            <span className="ml-auto h-[3px] w-3 rounded bg-[#2b2825]/35" />
          </div>
        ))}
        <div className="mt-auto border-t border-dashed border-[#2b2825]/30 pt-1 text-right font-bold text-[#2b2825]">
          Priceless
        </div>
      </div>
    );
  }
  if (kind === 1) {
    return (
      <div className="flex h-full flex-col gap-1.5">
        <p className="text-center font-receipt text-[7px] font-bold uppercase text-[#2b2825]">
          Audit
        </p>
        {[92, 99, 76, 88].map((w, i) => (
          <div key={i} className="h-[5px] overflow-hidden rounded-full bg-[#2b2825]/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${w}%`,
                background: i % 2 ? '#9daf88' : '#c85a32',
              }}
            />
          </div>
        ))}
        <div className="mx-auto mt-auto rotate-[-8deg] rounded border border-[#c85a32] px-1 font-receipt text-[6px] font-bold uppercase text-[#c85a32]">
          Certified
        </div>
      </div>
    );
  }
  if (kind === 2) {
    return (
      <div className="grid h-full grid-rows-4 gap-1 rounded bg-[#2b2825] p-1">
        {['#f3d9c9', '#dfe6d3', '#e9dcc5', '#f6e1b8'].map((c) => (
          <div key={c} className="rounded-[2px]" style={{ background: c }} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-1.5">
      <p className="font-serif text-[9px] italic text-[#2b2825]">Dear you,</p>
      {[95, 80, 90, 60].map((w, i) => (
        <span key={i} className="h-[3px] rounded bg-[#2b2825]/25" style={{ width: `${w}%` }} />
      ))}
      <p className="mt-auto text-right font-hand text-[11px] text-[#c85a32]">♥</p>
    </div>
  );
}
