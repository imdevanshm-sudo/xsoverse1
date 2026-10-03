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
import type { RewindLayers, XsoData } from '@/types/xso';
import { playFoley } from '@/lib/foley';
import { CINEMATIC, SOFT_SPRING } from '@/lib/motion';
import { selectedCards, stackCards } from '@/lib/formatCards';
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

const INSTANT = { duration: 0 };
const SETTLE = { ...SOFT_SPRING, opacity: CINEMATIC };

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
    transition: CINEMATIC,
  }),
};

interface Pile {
  order: number[];
  /** Bumped when a sheet is sent to the back so it leaves and re-enters as a new presence. */
  passes: number[];
  turn: number;
  direction: Direction;
}

type Sheet = Omit<Artifact, 'id'> & { id: Artifact['id'] | 'liner' };

interface StackProps {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: keyof typeof DECK_HEIGHT;
  /** 0–3 are the four keepsakes; 4 is the liner notes when present. */
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
}

const SHEET_ORDER: Sheet['id'][] = ['receipt', 'audit', 'photos', 'letter', 'liner'];

export const RewindStack = memo(function RewindStack(props: StackProps) {
  const { data, focusIndex } = props;
  const review = data.rewind?.review.trim() ?? '';
  const cards = selectedCards(data, 'rewind');
  const key = cards.join('|');
  const base = useMemo(() => getArtifacts(data, stackCards(data, 'rewind')), [data]);
  const artifacts = useMemo<Sheet[]>(
    () =>
      review && key.split('|').includes('liner')
        ? [
            ...base,
            {
              id: 'liner',
              label: 'Liner notes',
              rotation: 0,
              contentScale: 1,
              content: <LinerNotes data={data} review={review} />,
            },
          ]
        : base,
    [base, data, key, review],
  );
  const focused =
    focusIndex === undefined
      ? undefined
      : artifacts.findIndex((a) => a.id === SHEET_ORDER[focusIndex]);
  /** A different set of sheets reshapes the pile, so it starts fresh. */
  return (
    <Stack
      key={artifacts.map((a) => a.id).join('|')}
      {...props}
      focusIndex={focused === undefined || focused < 0 ? undefined : focused}
      artifacts={artifacts}
    />
  );
});

function Stack({
  data,
  artifacts,
  onChange,
  size = 'hero',
  focusIndex,
}: StackProps & { artifacts: Sheet[] }) {
  const faces = useMemo(() => {
    const out: Partial<Record<Sheet['id'], ReactNode>> = {};
    for (const a of artifacts) out[a.id] = a.content;
    out.receipt = <Side1Receipt data={data} bare />;
    out.letter = <Side4BirthdayCard data={data} bare />;
    return out;
  }, [artifacts, data]);
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

      {data.rewind ? <TapeLabel tape={data.rewind} /> : null}

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
                className={`gpu-layer absolute inset-x-1 bottom-7 top-14 max-md:[@media(max-height:700px)]:top-11 ${isFront ? '' : 'pointer-events-none'}`}
                style={{
                  zIndex: 10 - depth,
                  transformOrigin: '50% 0%',
                  willChange: 'transform, opacity',
                }}
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
                transition={reduce ? INSTANT : SETTLE}
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
}

/** The cassette's paper J-card label: both sides' titles and the date it was dubbed. */
function TapeLabel({ tape }: { tape: RewindLayers }) {
  return (
    <div className="relative z-10 mb-2 flex w-full items-stretch gap-2 rounded-md border border-[#fdba74]/25 bg-[#f6ead7] px-2.5 py-1.5 text-[#2d1b22] shadow-[0_6px_14px_-6px_rgba(0,0,0,0.6)]">
      <span
        aria-hidden
        className="grid w-6 shrink-0 place-items-center rounded-sm bg-[#ec4899] font-receipt text-[10px] font-bold text-white"
      >
        A
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-hand text-[17px] leading-none">{tape.sideA || 'Side A'}</p>
        <p className="mt-0.5 truncate font-receipt text-[8px] uppercase tracking-[0.18em] text-[#7a5563]">
          B · {tape.sideB || 'Side B'}
        </p>
      </div>
      {tape.tapeDate ? (
        <span className="self-center font-receipt text-[9px] uppercase tracking-[0.14em] text-[#7a5563]">
          {tape.tapeDate}
        </span>
      ) : null}
    </div>
  );
}

function LinerNotes({ data, review }: { data: XsoData; review: string }) {
  return (
    <article className="flex h-full flex-col bg-[#fbf6ee] px-5 py-5 text-[#2d1b22]">
      <p className="font-receipt text-[9px] uppercase tracking-[0.24em] text-[#9a6a7e]">
        Liner notes · director&apos;s cut
      </p>
      <p className="mt-1 font-serif text-[20px] font-semibold leading-tight">
        {data.rewind?.sideA || 'The review'}
      </p>
      <p className="mt-3 min-h-0 flex-1 overflow-hidden whitespace-pre-line font-hand text-[21px] leading-[1.15] text-[#3a2530]">
        {review}
      </p>
      <p className="self-end font-hand text-[20px] leading-none text-[#b4234a]">
        — {data.billerName}
      </p>
    </article>
  );
}

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
  artifact: Sheet;
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
      style={{ x: dragX, rotate: dragRotate, willChange: 'transform' }}
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
