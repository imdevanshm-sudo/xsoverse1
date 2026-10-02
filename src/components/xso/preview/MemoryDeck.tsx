'use client';

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  animate,
  AnimatePresence,
  motion,
  useIsPresent,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { playFoley } from '@/lib/foley';
import { useCoarsePointer } from '@/hooks/useTouchSpring';
import { CINEMA_EASE, CINEMATIC, SOFT_SPRING } from '@/lib/motion';
import { Side1Receipt } from '@/components/xso/Side1Receipt';
import { Side4BirthdayCard } from '@/components/xso/Side4BirthdayCard';
import { getArtifacts, playMechanicalCue, type Artifact } from '@/components/xso/viewers/shared';

const TILT_MAX = 6;
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 500;
/** Presses on these stay with the card content (voice note, scratch foil, links). */
const INTERACTIVE = 'button, a, input, audio, canvas, [role="slider"]';

type Direction = 1 | -1;

/** Resting pose per depth: a hand-stacked pile, each sheet slightly off-square. */
const REST = [
  { x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0, scale: 1 },
  { x: 7, y: 10, rotate: 2.8, rotateX: 0, rotateY: 0, scale: 0.97 },
  { x: -6, y: 19, rotate: -2.4, rotateX: 0, rotateY: 0, scale: 0.945 },
  { x: 4, y: 27, rotate: 1.6, rotateX: 0, rotateY: 0, scale: 0.92 },
];
/** Top sheet is thumbed off the pile toward the swipe, tipping up off the desk. */
const flingPose = (dir: Direction) => ({
  x: dir * 210,
  y: -30,
  rotate: dir * 17,
  rotateX: 10,
  rotateY: dir * -30,
  scale: 1.05,
});
const FLING = { duration: 0.7, ease: CINEMA_EASE };
/** Finger-down lift stays immediate; only the stack change itself is slow. */
const LIFT = { duration: 0.3, ease: CINEMA_EASE };
/** Sheets underneath drift up; the flung sheet glides back under with a little weight. */
const PROMOTE = CINEMATIC;
const TUCK = SOFT_SPRING;

/** Deeper sheets sit in shade from the top-down light and move less with tilt. */
const DIM = [0, 0.1, 0.18, 0.26];
/** Sheets at this depth or deeper are unmounted; they're fully hidden under the pile anyway. */
const MOUNTED_DEPTH = 3;
const PARALLAX = [1.3, 0.85, 0.5, 0.22];
const SHADOW = [
  { opacity: 1, y: 0, scale: 1 },
  { opacity: 0.8, y: 0, scale: 1 },
  { opacity: 0.65, y: 0, scale: 1 },
  { opacity: 0.5, y: 0, scale: 1 },
];
const LIFTED_SHADOW = { opacity: 0.45, y: 30, scale: 1.05 };

type Material = { surface: string; sheen: number };
const MATERIALS: Record<Artifact['id'], Material> = {
  receipt: { surface: 'mat-receipt', sheen: 0.3 },
  audit: { surface: 'mat-cardstock', sheen: 0.35 },
  photos: { surface: 'mat-photo', sheen: 0.9 },
  letter: { surface: 'mat-letter', sheen: 0.14 },
};

interface Tilt {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export const MemoryDeck = memo(function MemoryDeck({
  data,
  onChange,
  size = 'hero',
  focusIndex,
}: {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: 'hero' | 'studio' | 'fill';
  /** Brings this card to the top whenever it changes (studio tabs). */
  focusIndex?: number;
  /** Fires with the new top card after each loop. */
  onChange?: (index: number, label: string) => void;
}) {
  const artifacts = useMemo(() => getArtifacts(data), [data]);
  /** Receipt and letter render bare so the deck card itself is the paper. */
  const faces = useMemo<Record<Artifact['id'], ReactNode>>(
    () => ({
      receipt: <Side1Receipt data={data} bare />,
      audit: artifacts[1].content,
      photos: artifacts[2].content,
      letter: <Side4BirthdayCard data={data} bare />,
    }),
    [artifacts, data],
  );
  const [order, setOrder] = useState(() => artifacts.map((_, i) => i));
  const [fling, setFling] = useState<Direction | null>(null);
  const reduce = Boolean(useReducedMotion());
  /** Whole-stage 3D lean is a mouse nicety; on touch it only costs compositor time. */
  const coarse = useCoarsePointer();
  const lean3d = !reduce && !coarse;

  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const tilt: Tilt = {
    x: useSpring(rawTiltX, { stiffness: 150, damping: 18, mass: 0.6 }),
    y: useSpring(rawTiltY, { stiffness: 150, damping: 18, mass: 0.6 }),
  };
  const pressed = useRef(false);

  useEffect(() => {
    if (focusIndex === undefined) return;
    setFling(null);
    setOrder((current) => {
      const at = current.indexOf(focusIndex);
      return at <= 0 ? current : [...current.slice(at), ...current.slice(0, at)];
    });
  }, [focusIndex]);

  const topIndex = order[0];
  const nextIndex = order[1];

  const commit = () => {
    if (!reduce) playFoley('land', 0.8);
    setFling(null);
    setOrder((current) => [...current.slice(1), current[0]]);
    onChange?.(nextIndex, artifacts[nextIndex].label);
  };

  const advance = (dir: Direction = 1) => {
    if (fling) return;
    playMechanicalCue('click');
    if (reduce) {
      commit();
      return;
    }
    setFling(dir);
  };

  const lean = (e: PointerEvent<HTMLDivElement>, strength: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rawTiltY.set(px * TILT_MAX * 2 * strength);
    rawTiltX.set(-py * TILT_MAX * 2 * strength);
  };
  const settle = () => {
    pressed.current = false;
    rawTiltX.set(0);
    rawTiltY.set(0);
  };

  return (
    <section
      className={`relative isolate flex w-full max-w-[400px] touch-pan-y flex-col items-center ${size === 'fill' ? 'h-full' : ''}`}
      aria-label="Memory deck"
      aria-roledescription="card deck"
    >
      <div aria-hidden className="deck-desk" />

      <motion.div
        className={`deck-stage relative w-full ${size === 'studio' ? 'memory-deck--studio' : size === 'fill' ? 'min-h-0 flex-1' : 'memory-deck'}`}
        style={
          lean3d ? { rotateX: tilt.x, rotateY: tilt.y, transformPerspective: 1200 } : undefined
        }
        onPointerMove={(e) => {
          if (!lean3d) return;
          if (e.pointerType === 'mouse') lean(e, 1);
          else if (pressed.current) lean(e, 0.55);
        }}
        onPointerDown={(e) => {
          if (!lean3d || e.pointerType === 'mouse') return;
          pressed.current = true;
          lean(e, 0.55);
        }}
        onPointerUp={settle}
        onPointerLeave={settle}
        onPointerCancel={settle}
      >
        <AnimatePresence initial={false}>
          {artifacts.map((artifact, index) => {
            const depth = order.indexOf(index);
            const isTop = depth === 0;
            const flinging = isTop && fling !== null;
            /** While the top sheet is in the air, the rest already step up. */
            const settledDepth = fling !== null && !isTop ? depth - 1 : depth;
            if (settledDepth >= MOUNTED_DEPTH) return null;
            return (
              <DeckSlot
                key={artifact.id}
                depth={depth}
                settledDepth={settledDepth}
                fling={flinging ? fling : null}
                tilt={tilt}
                reduce={reduce}
                onFlung={commit}
              >
                <DeckCard
                  artifact={artifact}
                  face={faces[artifact.id]}
                  number={index + 1}
                  active={isTop && fling === null}
                  depth={settledDepth}
                  lifted={flinging}
                  tilt={tilt}
                  reduce={reduce}
                  onLoop={advance}
                />
              </DeckSlot>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <div className="mt-4 flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-1.5" aria-hidden>
          {artifacts.map((artifact, index) => (
            <span
              key={artifact.id}
              className={`h-1.5 w-1.5 rounded-full transition-[transform,background-color] duration-300 ease-out ${
                index === topIndex ? 'scale-[1.6] bg-[#fdba74]' : 'bg-[#fce7f3]/20'
              }`}
            />
          ))}
        </div>
        <motion.button
          type="button"
          onClick={() => advance(1)}
          whileTap={reduce ? undefined : { scale: 0.97, y: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="paper-button inline-flex touch-manipulation items-center gap-2"
          aria-label={`Loop memory — next up: ${artifacts[nextIndex].label}`}
        >
          <span aria-hidden className="text-sm leading-none">
            ↻
          </span>
          Loop memory
        </motion.button>
      </div>
      <p className="sr-only" aria-live="polite">
        Memory {topIndex + 1} of {artifacts.length}: {artifacts[topIndex].label}
      </p>
    </section>
  );
});

/** Positions one sheet in the pile and gives it depth parallax against the stage tilt. */
function DeckSlot({
  depth,
  settledDepth,
  fling,
  tilt,
  reduce,
  onFlung,
  children,
}: {
  depth: number;
  settledDepth: number;
  fling: Direction | null;
  tilt: Tilt;
  reduce: boolean;
  onFlung: () => void;
  children: ReactNode;
}) {
  const parallax = useMotionValue(PARALLAX[settledDepth]);
  useEffect(() => {
    const controls = animate(parallax, PARALLAX[settledDepth], PROMOTE);
    return () => controls.stop();
  }, [parallax, settledDepth]);
  const px = useTransform([tilt.y, parallax], ([t, k]: number[]) => t * k);
  const py = useTransform([tilt.x, parallax], ([t, k]: number[]) => -t * k);

  const isPresent = useIsPresent();
  const wasFlung = useRef(false);
  const transition = fling ? FLING : wasFlung.current ? TUCK : PROMOTE;
  useEffect(() => {
    wasFlung.current = fling !== null;
  }, [fling]);

  return (
    <motion.div
      className={`deck-slot absolute inset-x-0 bottom-7 top-0 ${depth === 0 ? '' : 'pointer-events-none'}`}
      style={{ zIndex: 10 - depth, transformPerspective: 1100 }}
      initial={{ ...REST[MOUNTED_DEPTH], opacity: 0 }}
      animate={fling ? { ...flingPose(fling), opacity: 1 } : { ...REST[settledDepth], opacity: 1 }}
      exit={{ ...REST[MOUNTED_DEPTH], opacity: 0, transition: TUCK }}
      transition={transition}
      onAnimationComplete={() => {
        if (fling && isPresent) onFlung();
      }}
    >
      <motion.div className="h-full w-full" style={reduce ? undefined : { x: px, y: py }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function DeckCard({
  artifact,
  face,
  number,
  active,
  depth,
  lifted,
  tilt,
  reduce,
  onLoop,
}: {
  artifact: Artifact;
  face: ReactNode;
  number: number;
  active: boolean;
  depth: number;
  lifted: boolean;
  tilt: Tilt;
  reduce: boolean;
  onLoop: (dir: Direction) => void;
}) {
  const material = MATERIALS[artifact.id];
  /** The click that trails a swipe must not loop a second time. */
  const dragEndedAt = useRef(0);
  const dragControls = useDragControls();
  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-180, 0, 180], [-9, 0, 9]);
  const dragYaw = useTransform(dragX, [-180, 0, 180], [-16, 0, 16]);
  /** Specular band slides across the surface as the sheet tilts or drags. */
  const sheenX = useTransform([tilt.y, dragX], ([t, d]: number[]) => `${t * 5 + d * 0.18}%`);

  return (
    <motion.div
      className="deck-drag relative h-full w-full touch-pan-y"
      style={{ x: dragX, rotate: dragRotate, rotateY: dragYaw }}
      drag={active && !reduce ? 'x' : false}
      dragDirectionLock
      dragControls={dragControls}
      dragListener={false}
      onPointerDown={(event) => {
        if (!active || reduce) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        dragControls.start(event);
      }}
      dragSnapToOrigin
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      dragTransition={{ bounceStiffness: 380, bounceDamping: 24 }}
      whileDrag={{ scale: 1.02 }}
      onDragEnd={(_, info) => {
        dragEndedAt.current = performance.now();
        if (
          Math.abs(info.offset.x) > SWIPE_DISTANCE ||
          Math.abs(info.velocity.x) > SWIPE_VELOCITY
        ) {
          onLoop((info.offset.x || info.velocity.x) < 0 ? -1 : 1);
        }
      }}
      onClick={(event) => {
        if (!active || performance.now() - dragEndedAt.current < 250) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        onLoop(1);
      }}
    >
      <motion.div
        aria-hidden
        className={`deck-shadow ${artifact.id === 'receipt' ? 'deck-shadow--receipt' : ''}`}
        initial={false}
        animate={lifted ? LIFTED_SHADOW : SHADOW[depth]}
        transition={lifted ? LIFT : PROMOTE}
      />

      <div className={`deck-card ${material.surface} ${active ? 'cursor-pointer' : ''}`}>
        {artifact.id === 'receipt' ? <ReceiptTelemetry number={number} /> : null}

        <div className="deck-card__body">{face}</div>

        <div className="deck-card__footer">
          <span className="truncate">
            No. {String(number).padStart(2, '0')} · {artifact.label}
          </span>
          {active ? <span className="shrink-0 text-[#ec4899]">Tap · swipe</span> : null}
        </div>

        {artifact.id === 'letter' ? <span aria-hidden className="deck-card__creases" /> : null}
        {artifact.id === 'receipt' ? (
          <span aria-hidden className="deck-card__thermal-fade" />
        ) : null}
        <span aria-hidden className="deck-card__light" />
        {reduce ? null : (
          <motion.span
            aria-hidden
            className="deck-card__sheen"
            style={{ x: sheenX, opacity: material.sheen }}
          />
        )}
        <motion.span
          aria-hidden
          className="deck-card__dim"
          initial={false}
          animate={{ opacity: lifted ? 0 : DIM[depth] }}
          transition={PROMOTE}
        />
      </div>
    </motion.div>
  );
}

/** Faded print-head header, like the machine line on a real thermal slip. */
function ReceiptTelemetry({ number }: { number: number }) {
  return (
    <div aria-hidden className="receipt-telemetry">
      <span>TERM 03 · TXN 0041{number}7</span>
      <span className="receipt-telemetry__bars">▮▮▯▮▯▮▮▯▮</span>
    </div>
  );
}
