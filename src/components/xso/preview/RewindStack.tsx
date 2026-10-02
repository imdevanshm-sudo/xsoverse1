'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useDragControls,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { playFoley } from '@/lib/foley';
import { useTouchSpring } from '@/hooks/useTouchSpring';
import { Side1Receipt } from '@/components/xso/Side1Receipt';
import { Side4BirthdayCard } from '@/components/xso/Side4BirthdayCard';
import {
  getArtifacts,
  playMechanicalCue,
  seededOffset,
  type Artifact,
} from '@/components/xso/viewers/shared';

/** Pointer travel needed to let go of a memory; the card itself only gives ~⅓ of that. */
const PULL_DISTANCE = 90;
const PULL_VELOCITY = 550;
const PULL_ELASTIC = 0.35;
const INTERACTIVE = 'button, a, input, audio, canvas, [role="slider"]';

/**
 * Depth 0 is the memory in focus; older ones recede up and back and fade
 * the further they sit in the past. Only these depths are mounted.
 */
const DEPTH = [
  { y: 0, scale: 1, opacity: 1 },
  { y: -20, scale: 0.92, opacity: 0.72 },
  { y: -38, scale: 0.84, opacity: 0.42 },
];
const BACK = DEPTH[DEPTH.length - 1];

const DECK_HEIGHT = {
  hero: 'memory-deck',
  studio: 'memory-deck--studio',
  fill: 'min-h-0 flex-1',
};

const SPRING = { type: 'spring' as const, stiffness: 200, damping: 20 };
const INSTANT = { duration: 0 };

type Direction = 1 | -1;

/** The memory in focus drifts up and off to one side as it lets go. */
const SHEET: Variants = {
  exit: (direction: Direction) => ({
    x: direction * 170,
    y: -80,
    rotate: direction * 11,
    scale: 0.97,
    opacity: 0,
    zIndex: 30,
    pointerEvents: 'none',
  }),
};

interface Pile {
  order: number[];
  /** Bumped when a sheet is sent to the back so it leaves and re-enters as a new presence. */
  passes: number[];
  turn: number;
  direction: Direction;
}

export const RewindStack = memo(function RewindStack({
  data,
  onChange,
  size = 'hero',
  focusIndex,
}: {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: keyof typeof DECK_HEIGHT;
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
}) {
  const artifacts = useMemo(() => getArtifacts(data), [data]);
  const faces = useMemo<Record<Artifact['id'], ReactNode>>(
    () => ({
      receipt: <Side1Receipt data={data} bare />,
      audit: artifacts[1].content,
      photos: artifacts[2].content,
      letter: <Side4BirthdayCard data={data} bare />,
    }),
    [artifacts, data],
  );
  /** A slightly messy pile: stable, human-placed tilt per sheet (−3° … 3°). */
  const tilts = useMemo(
    () => artifacts.map((_, i) => seededOffset(data.id || 'xso', i, 3)),
    [artifacts, data.id],
  );
  const [pile, setPile] = useState<Pile>(() => ({
    order: artifacts.map((_, i) => i),
    passes: artifacts.map(() => 0),
    turn: 0,
    direction: -1,
  }));
  const reduce = Boolean(useReducedMotion());
  const spring = useTouchSpring(SPRING);
  const stage = useRef<HTMLElement>(null);
  const visible = useInView(stage, { margin: '120px' });

  useEffect(() => {
    if (focusIndex === undefined) return;
    setPile((current) => {
      const at = current.order.indexOf(focusIndex);
      if (at <= 0) return current;
      return {
        ...current,
        order: [...current.order.slice(at), ...current.order.slice(0, at)],
      };
    });
  }, [focusIndex]);

  const { order, passes, turn, direction } = pile;
  const front = order[0];
  const next = order[1];

  /** Mirrors the pile synchronously so back-to-back pulls report the sheet that's really on top. */
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const rewind = useCallback(
    (towards: Direction = -1) => {
      playMechanicalCue('click');
      if (!reduce) playFoley('land', 0.55);
      const [first, ...others] = orderRef.current;
      orderRef.current = [...others, first];
      setPile((current) => {
        const [top, ...rest] = current.order;
        const bumped = [...current.passes];
        bumped[top] += 1;
        return {
          order: [...rest, top],
          passes: bumped,
          turn: current.turn + 1,
          direction: towards,
        };
      });
      const shown = orderRef.current[0];
      onChange?.(shown, artifacts[shown].label);
    },
    [artifacts, reduce, onChange],
  );

  return (
    <section
      ref={stage}
      className={`relative isolate flex w-full max-w-[400px] touch-pan-y flex-col items-center ${size === 'fill' ? 'h-full' : ''}`}
      aria-label="Rewind stack"
      aria-roledescription="card stack"
    >
      <Backlight pulsing={!reduce && visible} turn={reduce ? 0 : turn} />

      <div className={`relative w-full ${DECK_HEIGHT[size]}`}>
        <AnimatePresence initial={false} custom={direction}>
          {order.slice(0, DEPTH.length).map((index, depth) => {
            const artifact = artifacts[index];
            const pose = DEPTH[depth];
            const isFront = depth === 0;
            return (
              <motion.div
                key={`${artifact.id}:${passes[index]}`}
                custom={direction}
                variants={SHEET}
                className={`gpu-layer absolute inset-x-1 bottom-7 top-14 ${isFront ? '' : 'pointer-events-none'}`}
                style={{ zIndex: 10 - depth, transformOrigin: '50% 0%' }}
                initial={{
                  y: BACK.y - 14,
                  scale: BACK.scale - 0.04,
                  opacity: 0,
                  rotate: tilts[index],
                }}
                animate={{
                  y: pose.y,
                  scale: pose.scale,
                  opacity: pose.opacity,
                  rotate: isFront ? tilts[index] * 0.25 : tilts[index],
                }}
                exit={reduce ? { opacity: 0, transition: INSTANT } : 'exit'}
                transition={
                  reduce ? INSTANT : { ...spring, opacity: { duration: 0.42, ease: 'easeOut' } }
                }
              >
                <RewindCard
                  artifact={artifact}
                  face={faces[artifact.id]}
                  number={index + 1}
                  active={isFront}
                  reduce={reduce}
                  onRewind={rewind}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-1.5" aria-hidden>
          {artifacts.map((artifact, index) => (
            <span
              key={artifact.id}
              className={`h-1.5 w-1.5 rounded-full transition-[transform,background-color] duration-500 ease-out ${
                index === front ? 'scale-[1.6] bg-[#fdba74]' : 'bg-[#fce7f3]/20'
              }`}
            />
          ))}
        </div>
        <motion.button
          type="button"
          onClick={() => rewind()}
          whileTap={reduce ? undefined : { scale: 0.97, y: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="paper-button inline-flex touch-manipulation items-center gap-2"
          aria-label={`Rewind — bring back: ${artifacts[next].label}`}
        >
          <span aria-hidden className="text-sm leading-none">
            ↺
          </span>
          Rewind
        </motion.button>
      </div>
      <p className="sr-only" aria-live="polite">
        Memory {front + 1} of {artifacts.length}: {artifacts[front].label}
      </p>
    </section>
  );
});

/**
 * Room light falling on the desk: a slow resting heartbeat in the CTA's
 * pinks and ambers, with a brief warm swell each time a memory changes hands.
 */
function Backlight({ pulsing, turn }: { pulsing: boolean; turn: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-x-8 -top-4 bottom-6 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 50% 42%, rgba(251,207,232,0.18), transparent 70%)',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 48% 42% at 50% 38%, rgba(236,72,153,0.30), transparent 68%), radial-gradient(ellipse 40% 34% at 34% 64%, rgba(251,146,60,0.26), transparent 70%), radial-gradient(ellipse 36% 30% at 68% 60%, rgba(244,63,94,0.18), transparent 70%)',
          willChange: 'transform, opacity',
        }}
        initial={false}
        animate={
          pulsing
            ? { scale: [1, 1.04, 1.01, 1.03, 1], opacity: [0.7, 1, 0.82, 0.95, 0.7] }
            : { scale: 1, opacity: 0.85 }
        }
        transition={
          pulsing
            ? {
                duration: 4.8,
                times: [0, 0.12, 0.24, 0.36, 1],
                ease: 'easeInOut',
                repeat: Infinity,
              }
            : { duration: 0.6 }
        }
      />
      {turn > 0 ? (
        <motion.div
          key={turn}
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 44% 38% at 50% 40%, rgba(251,146,60,0.30), rgba(236,72,153,0.16) 45%, transparent 72%)',
            willChange: 'transform, opacity',
          }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: [0, 1, 0], scale: [0.92, 1.06, 1.12] }}
          transition={{ duration: 1.2, times: [0, 0.3, 1], ease: 'easeOut' }}
        />
      ) : null}
    </div>
  );
}

/** Hover lift: a touch closer, with a softer, wider shadow pooling underneath. */
const LIFTABLE: Variants = {
  rest: { scale: 1 },
  lift: { scale: 1.02 },
};
const LIFT_SHADOW: Variants = {
  rest: { opacity: 0 },
  lift: { opacity: 1 },
};

const RewindCard = memo(function RewindCard({
  artifact,
  face,
  number,
  active,
  reduce,
  onRewind,
}: {
  artifact: Artifact;
  face: ReactNode;
  number: number;
  active: boolean;
  reduce: boolean;
  onRewind: (towards?: Direction) => void;
}) {
  /** The click that trails a swipe must not rewind a second time. */
  const dragEndedAt = useRef(0);
  const dragControls = useDragControls();
  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-60, 0, 60], [-4, 0, 4]);
  const sheet = useRef<HTMLDivElement>(null);
  const tactile = active && !reduce;

  /** Memories further back stay out of reach for taps, tabbing and screen readers. */
  useEffect(() => {
    sheet.current?.toggleAttribute('inert', !active);
  }, [active]);

  return (
    <motion.div
      ref={sheet}
      className="relative h-full w-full touch-pan-y"
      style={{ x: dragX, rotate: dragRotate }}
      variants={LIFTABLE}
      initial="rest"
      animate="rest"
      whileHover={tactile ? 'lift' : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      drag={tactile ? 'x' : false}
      dragDirectionLock
      dragControls={dragControls}
      dragListener={false}
      onPointerDown={(event) => {
        if (!tactile) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        dragControls.start(event);
      }}
      dragSnapToOrigin
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={PULL_ELASTIC}
      dragTransition={{ bounceStiffness: 200, bounceDamping: 20 }}
      onDragEnd={(_, info) => {
        dragEndedAt.current = performance.now();
        if (Math.abs(info.offset.x) > PULL_DISTANCE || Math.abs(info.velocity.x) > PULL_VELOCITY) {
          onRewind(info.offset.x > 0 ? 1 : -1);
        }
      }}
      onClick={(event) => {
        if (!active || performance.now() - dragEndedAt.current < 250) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        onRewind();
      }}
    >
      <motion.span
        aria-hidden
        className="rewind-card__lift-shadow"
        variants={LIFT_SHADOW}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
      <div className={`rewind-card ${active ? 'cursor-pointer' : ''}`}>
        <div className="rewind-card__body">{face}</div>
        <div className="deck-card__footer">
          <span className="truncate">
            No. {String(number).padStart(2, '0')} · {artifact.label}
          </span>
          {active ? <span className="shrink-0 text-[#ec4899]">Tap · pull back</span> : null}
        </div>
        <span aria-hidden className="rewind-card__glow" />
        <span aria-hidden className="rewind-card__grain" />
      </div>
    </motion.div>
  );
});
