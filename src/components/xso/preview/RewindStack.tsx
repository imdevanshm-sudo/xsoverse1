'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useDragControls,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { playFoley } from '@/lib/foley';
import { Side1Receipt } from '@/components/xso/Side1Receipt';
import { Side4BirthdayCard } from '@/components/xso/Side4BirthdayCard';
import {
  getArtifacts,
  playMechanicalCue,
  seededOffset,
  type Artifact,
} from '@/components/xso/viewers/shared';

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 500;
const INTERACTIVE = 'button, a, input, audio, canvas, [role="slider"]';

/**
 * Depth 0 is the memory in focus; older ones recede up and back, softening
 * out of focus the further they sit in the past.
 */
const DEPTH = [
  { y: 0, scale: 1, opacity: 1, blur: 0 },
  { y: -18, scale: 0.93, opacity: 0.82, blur: 1.2 },
  { y: -34, scale: 0.86, opacity: 0.62, blur: 2.2 },
  { y: -48, scale: 0.8, opacity: 0.45, blur: 3.2 },
];
/** Front card tips away from the viewer before it slips behind the pile. */
const LIFT = { y: -66, scale: 1.03, opacity: 1, blur: 0, rotateX: 16 };

const DECK_HEIGHT = {
  hero: 'memory-deck',
  studio: 'memory-deck--studio',
  fill: 'min-h-0 flex-1',
};

/** Low stiffness, moderate damping: a photo settling onto a bed, not a UI snap. */
const SETTLE = { type: 'spring' as const, stiffness: 78, damping: 15, mass: 1.15 };
const LIFT_TWEEN = { duration: 0.38, ease: [0.33, 0, 0.2, 1] as const };

export function RewindStack({
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
  /** Stable, human-placed tilt per sheet (−2° … 2°). */
  const tilts = useMemo(
    () => artifacts.map((_, i) => seededOffset(data.id || 'xso', i, 2)),
    [artifacts, data.id],
  );
  const [order, setOrder] = useState(() => artifacts.map((_, i) => i));
  const [lifting, setLifting] = useState(false);
  const reduce = Boolean(useReducedMotion());
  const stage = useRef<HTMLElement>(null);
  const visible = useInView(stage, { margin: '120px' });

  useEffect(() => {
    if (focusIndex === undefined) return;
    setLifting(false);
    setOrder((current) => {
      const at = current.indexOf(focusIndex);
      return at <= 0 ? current : [...current.slice(at), ...current.slice(0, at)];
    });
  }, [focusIndex]);

  const front = order[0];
  const next = order[1];

  /** Once the front memory has tipped back, tuck it under the pile and let the rest settle. */
  useEffect(() => {
    if (!lifting) return;
    const timer = window.setTimeout(
      () => {
        if (!reduce) playFoley('land', 0.7);
        setLifting(false);
        setOrder((current) => [...current.slice(1), current[0]]);
        onChange?.(next, artifacts[next].label);
      },
      reduce ? 0 : LIFT_TWEEN.duration * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [lifting, reduce, next, artifacts, onChange]);

  const rewind = () => {
    if (lifting) return;
    playMechanicalCue('click');
    setLifting(true);
  };

  return (
    <section
      ref={stage}
      className={`relative isolate flex w-full max-w-[400px] flex-col items-center ${size === 'fill' ? 'h-full' : ''}`}
      aria-label="Rewind stack"
      aria-roledescription="card stack"
    >
      <Backlight pulsing={!reduce && visible} />

      <div className={`relative w-full ${DECK_HEIGHT[size]}`} style={{ perspective: 1100 }}>
        {artifacts.map((artifact, index) => {
          const depth = order.indexOf(index);
          const isFront = depth === 0;
          const isLifting = isFront && lifting;
          /** The rest swell forward while the front memory is pulled back. */
          const settled = lifting && !isFront ? depth - 1 : depth;
          const pose = isLifting && !reduce ? LIFT : DEPTH[settled];
          return (
            <motion.div
              key={artifact.id}
              className={`absolute inset-x-1 bottom-7 top-14 ${isFront && !lifting ? '' : 'pointer-events-none'}`}
              style={{
                zIndex: isLifting ? 20 : 10 - settled,
                transformOrigin: '50% 0%',
                willChange: 'transform, opacity',
              }}
              initial={false}
              animate={{
                y: pose.y,
                scale: pose.scale,
                opacity: pose.opacity,
                rotate: tilts[index],
                rotateX: isLifting ? LIFT.rotateX : 0,
                filter: reduce ? 'blur(0px)' : `blur(${pose.blur}px)`,
              }}
              transition={reduce ? { duration: 0 } : isLifting ? LIFT_TWEEN : SETTLE}
            >
              <RewindCard
                artifact={artifact}
                face={faces[artifact.id]}
                number={index + 1}
                active={isFront && !lifting}
                reduce={reduce}
                onRewind={rewind}
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
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                index === front ? 'w-5 bg-[#fdba74]' : 'w-1.5 bg-[#fce7f3]/20'
              }`}
            />
          ))}
        </div>
        <motion.button
          type="button"
          onClick={rewind}
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
}

/** Sunset backlight that breathes in a slow, resting two-beat rhythm. */
function Backlight({ pulsing }: { pulsing: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-x-8 -top-4 bottom-6 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 50% 42%, rgba(251,207,232,0.20), transparent 70%)',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 48% 42% at 50% 38%, rgba(249,168,212,0.42), transparent 68%), radial-gradient(ellipse 40% 34% at 36% 64%, rgba(253,186,116,0.32), transparent 70%), radial-gradient(ellipse 36% 30% at 66% 60%, rgba(251,191,36,0.2), transparent 70%)',
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
    </div>
  );
}

function RewindCard({
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
  onRewind: () => void;
}) {
  /** The click that trails a swipe must not rewind a second time. */
  const dragEndedAt = useRef(0);
  const dragControls = useDragControls();
  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-180, 0, 180], [-6, 0, 6]);
  const sheet = useRef<HTMLDivElement>(null);

  /** Memories further back stay out of reach for taps, tabbing and screen readers. */
  useEffect(() => {
    sheet.current?.toggleAttribute('inert', !active);
  }, [active]);

  return (
    <motion.div
      ref={sheet}
      className="relative h-full w-full"
      style={{ x: dragX, rotate: dragRotate }}
      drag={active && !reduce ? 'x' : false}
      dragControls={dragControls}
      dragListener={false}
      onPointerDown={(event) => {
        if (!active || reduce) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        dragControls.start(event);
      }}
      dragSnapToOrigin
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      dragTransition={{ bounceStiffness: 160, bounceDamping: 18 }}
      onDragEnd={(_, info) => {
        dragEndedAt.current = performance.now();
        if (
          Math.abs(info.offset.x) > SWIPE_DISTANCE ||
          Math.abs(info.velocity.x) > SWIPE_VELOCITY
        ) {
          onRewind();
        }
      }}
      onClick={(event) => {
        if (!active || performance.now() - dragEndedAt.current < 250) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        onRewind();
      }}
    >
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
}
