'use client';

import { useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { XsoData } from '@/types/xso';
import {
  getArtifacts,
  playMechanicalCue,
  type Artifact,
} from '@/components/xso/viewers/shared';

const TILT_MAX = 8;
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 500;
/** Taps on these stay with the card content (voice note, links). */
const INTERACTIVE = 'button, a, input, audio, [role="slider"]';

/** Resting pose per depth — slightly fanned, like a hand-stacked deck. */
const REST = [
  { x: 0, y: 0, rotate: 0, rotateX: 0, scale: 1 },
  { x: 5, y: 10, rotate: 2.6, rotateX: 0, scale: 0.965 },
  { x: -4, y: 19, rotate: -2.2, rotateX: 0, scale: 0.93 },
  { x: 2, y: 27, rotate: 1.3, rotateX: 0, scale: 0.9 },
];
const LIFT = { x: 46, y: -70, rotate: 12, rotateX: 18, scale: 1.03 };
const LIFT_TWEEN = { duration: 0.26, ease: [0.3, 0, 0.6, 1] as const };
const DROP_SPRING = { type: 'spring' as const, stiffness: 240, damping: 22, mass: 0.9 };

export function MemoryDeck({
  data,
  onChange,
}: {
  data: XsoData;
  /** Fires with the new top card after each loop. */
  onChange?: (index: number, label: string) => void;
}) {
  const artifacts = useMemo(() => getArtifacts(data), [data]);
  const [order, setOrder] = useState(() => artifacts.map((_, i) => i));
  const [lifting, setLifting] = useState(false);
  const reduce = useReducedMotion();

  const topIndex = order[0];
  const nextIndex = order[1];

  const commit = () => {
    setLifting(false);
    setOrder((current) => [...current.slice(1), current[0]]);
    onChange?.(nextIndex, artifacts[nextIndex].label);
  };

  const advance = () => {
    if (lifting) return;
    playMechanicalCue('click');
    if (reduce) {
      commit();
      return;
    }
    setLifting(true);
  };

  return (
    <section
      className="flex w-full max-w-[400px] flex-col items-center"
      aria-label="Memory deck"
      aria-roledescription="card deck"
    >
      <div className="memory-deck relative w-full" style={{ perspective: 1200 }}>
        {artifacts.map((artifact, index) => {
          const depth = order.indexOf(index);
          const isTop = depth === 0;
          const isLifting = isTop && lifting;
          return (
            <motion.div
              key={artifact.id}
              className={`absolute inset-x-0 bottom-7 top-0 ${isTop ? '' : 'pointer-events-none'}`}
              style={{ zIndex: 10 - depth }}
              initial={false}
              animate={isLifting ? LIFT : REST[depth]}
              transition={isLifting ? LIFT_TWEEN : DROP_SPRING}
              onAnimationComplete={() => {
                if (isLifting) commit();
              }}
            >
              <DeckCard
                artifact={artifact}
                number={index + 1}
                active={isTop && !lifting}
                reduce={Boolean(reduce)}
                onLoop={advance}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-1.5" aria-hidden>
          {artifacts.map((artifact, index) => (
            <span
              key={artifact.id}
              className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                index === topIndex ? 'w-5 bg-[#2f5443]' : 'w-1.5 bg-[#2b2621]/20'
              }`}
            />
          ))}
        </div>
        <motion.button
          type="button"
          onClick={advance}
          whileTap={reduce ? undefined : { scale: 0.97, y: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="paper-button inline-flex touch-manipulation items-center gap-2"
          aria-label={`Loop memory — next up: ${artifacts[nextIndex].label}`}
        >
          <span aria-hidden className="text-sm leading-none">↻</span>
          Loop memory
        </motion.button>
      </div>
      <p className="sr-only" aria-live="polite">
        Memory {topIndex + 1} of {artifacts.length}: {artifacts[topIndex].label}
      </p>
    </section>
  );
}

function DeckCard({
  artifact,
  number,
  active,
  reduce,
  onLoop,
}: {
  artifact: Artifact;
  number: number;
  active: boolean;
  reduce: boolean;
  onLoop: () => void;
}) {
  /** The click that trails a swipe must not loop a second time. */
  const dragEndedAt = useRef(0);
  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-180, 0, 180], [-8, 0, 8]);
  const dragYaw = useTransform(dragX, [-180, 0, 180], [-14, 0, 14]);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 200, damping: 20 });
  const glareX = useTransform(rotateY, [-TILT_MAX, TILT_MAX], ['15%', '85%']);
  const glareY = useTransform(rotateX, [-TILT_MAX, TILT_MAX], ['80%', '20%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,248,235,0.42), transparent 60%)`;
  const tilt = active && !reduce;

  const lean = (e: PointerEvent<HTMLDivElement>, strength = 1) => {
    if (!tilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * TILT_MAX * 2 * strength);
    rx.set(-py * TILT_MAX * 2 * strength);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      className="h-full w-full"
      style={{ x: dragX, rotate: dragRotate, rotateY: dragYaw }}
      drag={active && !reduce ? 'x' : false}
      dragSnapToOrigin
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        dragEndedAt.current = performance.now();
        if (
          Math.abs(info.offset.x) > SWIPE_DISTANCE ||
          Math.abs(info.velocity.x) > SWIPE_VELOCITY
        ) {
          onLoop();
        }
      }}
      onClick={(event) => {
        if (!active || performance.now() - dragEndedAt.current < 250) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        onLoop();
      }}
    >
      <motion.div
        className="paper-card relative h-full w-full cursor-pointer overflow-hidden"
        style={{ rotateX, rotateY, transformPerspective: 1000 }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse') lean(e);
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') lean(e, 0.5);
        }}
        onPointerUp={reset}
        onPointerLeave={reset}
        onPointerCancel={reset}
      >
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
            {artifact.content}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-dashed border-[#d8ccb6] bg-[#f3ecdf] px-3 py-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-[#8a7b66]">
            <span className="truncate">
              No. {String(number).padStart(2, '0')} · {artifact.label}
            </span>
            {active ? <span className="shrink-0 text-[#b8603e]">Tap · swipe</span> : null}
          </div>
        </div>
        {tilt ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
            style={{ background: glare }}
            aria-hidden
          />
        ) : null}
      </motion.div>
    </motion.div>
  );
}
