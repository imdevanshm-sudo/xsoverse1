'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { usePolaroidStore, type PolaroidData } from '@/store/usePolaroidStore';
import { LazyMedia } from '@/components/xso/LazyMedia';

const ZOOM = { type: 'spring' as const, stiffness: 260, damping: 28 };
const FLIP = { type: 'spring' as const, stiffness: 180, damping: 22 };
const INSTANT = { duration: 0 };
/** Print height over width: 4:5 photo inside a 6% border plus the caption strip. */
const PRINT_RATIO = 1.36;

/**
 * The one lightbox for every photo in the app. Mounted once in the root layout; it
 * renders nothing until a thumbnail calls `usePolaroidStore.open`.
 */
export function PolaroidLightbox() {
  const isOpen = usePolaroidStore((state) => state.isOpen);
  const active = usePolaroidStore((state) => state.activePolaroidData);
  const settle = usePolaroidStore((state) => state.settle);

  if (typeof document === 'undefined' || !active) return null;
  return createPortal(
    <AnimatePresence onExitComplete={settle}>
      {isOpen ? <Lightbox key={active.id} data={active} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

function Lightbox({ data }: { data: PolaroidData }) {
  const close = usePolaroidStore((state) => state.close);
  const reduce = Boolean(useReducedMotion());
  const [flipped, setFlipped] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [view] = useState(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return { vw, vh, width: Math.min(vw * 0.84, 400, (vh * 0.74) / PRINT_RATIO) };
  });
  useBodyScrollLock(true);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [close]);

  const { origin } = data;
  const home = origin
    ? {
        x: origin.x - view.vw / 2,
        y: origin.y - view.vh / 2,
        scale: origin.width / view.width,
        rotate: origin.rotate ?? 0,
        opacity: 1,
      }
    : { x: 0, y: 24, scale: 0.86, rotate: 0, opacity: 0 };
  const zoom = reduce ? INSTANT : ZOOM;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={data.alt}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#120a0e]/65 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduce ? INSTANT : { duration: 0.25 }}
      />

      <motion.div
        className="relative will-change-transform"
        style={{ width: view.width, perspective: 1200 }}
        initial={home}
        animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
        exit={home}
        transition={zoom}
      >
        <motion.div
          className="relative will-change-transform"
          style={{ transformStyle: 'preserve-3d' }}
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduce ? INSTANT : FLIP}
          onClick={() => data.back && setFlipped((on) => !on)}
        >
          <figure
            className="bg-[#fbf8f2] p-[6%] pb-0 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
            style={{ backfaceVisibility: 'hidden' }}
            aria-hidden={flipped}
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-[#2d1b22]">
              <LazyMedia
                src={data.src}
                alt={data.alt}
                fill
                priority
                sizes={`${Math.ceil(view.width)}px`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <figcaption className="truncate py-[7%] text-center font-hand text-[22px] leading-none text-[#3a2530]">
              {data.caption ?? '\u00a0'}
            </figcaption>
          </figure>

          {data.back ? (
            <div
              className="absolute inset-0 flex flex-col bg-[#f6f0e6] p-[9%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
              aria-hidden={!flipped}
            >
              {data.back.meta ? (
                <p className="font-receipt text-[10px] uppercase tracking-[0.2em] text-[#9a6a7e]">
                  {data.back.meta}
                </p>
              ) : null}
              <p className="mt-3 break-words font-hand text-[26px] leading-[1.05] text-[#3a2530]">
                {data.back.text}
              </p>
              {data.back.note ? (
                <p className="mt-2 -rotate-2 font-hand text-[21px] leading-none text-[#b4234a]">
                  {data.back.note}
                </p>
              ) : null}
              <div className="flex-1" />
              {data.back.footer ? (
                <p className="font-receipt text-[10px] uppercase tracking-[0.18em] text-[#9a6a7e]">
                  {data.back.footer}
                </p>
              ) : null}
              {data.back.signoff ? (
                <p className="text-right font-hand text-[22px] leading-none text-[#b4234a]">
                  {data.back.signoff}
                </p>
              ) : null}
            </div>
          ) : null}
        </motion.div>

        {data.back ? (
          <motion.p
            className="pointer-events-none absolute inset-x-0 -bottom-9 text-center font-receipt text-[10px] uppercase tracking-[0.2em] text-white/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {flipped ? 'Tap to turn it back' : 'Tap to flip it over'}
          </motion.p>
        ) : null}
      </motion.div>

      <motion.button
        ref={closeButton}
        type="button"
        onClick={close}
        aria-label="Close photo"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <X className="h-5 w-5" />
      </motion.button>
    </motion.div>
  );
}
