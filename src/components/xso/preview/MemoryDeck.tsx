'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type PanInfo,
} from 'framer-motion';
import { LOOP_CARDS, type XsoData } from '@/types/xso';
import { playFoley } from '@/lib/foley';
import { resolveLoop } from '@/lib/formats';
import { useCoarsePointer } from '@/hooks/useTouchSpring';
import { Side1Receipt } from '@/components/xso/Side1Receipt';
import { Side4BirthdayCard } from '@/components/xso/Side4BirthdayCard';
import { getArtifacts, playMechanicalCue, type Artifact } from '@/components/xso/viewers/shared';

const TILT_MAX = 6;
/** Release past this distance, or this fast, and the card is flicked off the pile. */
const FLICK_DISTANCE = 90;
const FLICK_VELOCITY = 550;
/** Far enough to clear the gift canvas from the middle of the pile in any direction. */
const FLIGHT = 720;
/** Presses on these stay with the card content (voice note, scratch foil, links). */
const INTERACTIVE = 'button, a, input, audio, canvas, [role="slider"]';

const SPRING = { type: 'spring', stiffness: 300, damping: 20 } as const;
const FLY_OUT = { duration: 0.34, ease: [0.4, 0, 1, 1] } as const;

/** Resting pose per depth: a hand-stacked pile, each sheet slightly off-square. */
const REST = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: 7, y: 12, rotate: 2.8, scale: 0.95 },
  { x: -6, y: 22, rotate: -2.4, scale: 0.91 },
  { x: 4, y: 31, rotate: 1.6, scale: 0.87 },
];
const restAt = (depth: number) => REST[Math.min(depth, REST.length - 1)];
/** Deeper sheets sit in shade from the top-down light. */
const DIM = [0, 0.12, 0.22, 0.3];
const SHADOW = [1, 0.8, 0.65, 0.5];

type Material = { surface: string; sheen: number };
const MATERIALS: Record<Artifact['id'], Material> = {
  receipt: { surface: 'mat-receipt', sheen: 0.3 },
  audit: { surface: 'mat-cardstock', sheen: 0.35 },
  photos: { surface: 'mat-photo', sheen: 0.9 },
  letter: { surface: 'mat-letter', sheen: 0.14 },
};

interface DeckProps {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: 'hero' | 'studio' | 'fill';
  /** Brings this card (0–3, of all four) to the top whenever it changes. */
  focusIndex?: number;
  /** Fires with the new top card after each loop. */
  onChange?: (index: number, label: string) => void;
}

export const MemoryDeck = memo(function MemoryDeck(props: DeckProps) {
  const { data, focusIndex } = props;
  const { cards } = resolveLoop(data);
  const key = cards.join('|');
  const all = useMemo(() => getArtifacts(data), [data]);
  const artifacts = useMemo(
    () => all.filter((artifact) => key.split('|').includes(artifact.id)),
    [all, key],
  );
  const focused =
    focusIndex === undefined
      ? undefined
      : artifacts.findIndex((artifact) => artifact.id === LOOP_CARDS[focusIndex]);
  /** A different hand of cards is a new deck; remounting keeps the pile order valid. */
  return (
    <Deck
      key={key}
      {...props}
      artifacts={artifacts}
      focusIndex={focused === undefined || focused < 0 ? undefined : focused}
    />
  );
});

function Deck({
  data,
  artifacts,
  onChange,
  size = 'hero',
  focusIndex,
}: DeckProps & { artifacts: Artifact[] }) {
  /** Receipt and letter render bare so the deck card itself is the paper. */
  const faces = useMemo<Record<Artifact['id'], ReactNode>>(
    () => ({
      receipt: <Side1Receipt data={data} bare />,
      audit: artifacts.find((a) => a.id === 'audit')?.content,
      photos: artifacts.find((a) => a.id === 'photos')?.content,
      letter: <Side4BirthdayCard data={data} bare />,
    }),
    [artifacts, data],
  );
  const count = artifacts.length;
  /** Every card stays mounted for the life of the deck; only its depth in the pile changes. */
  const [order, setOrder] = useState(() => artifacts.map((_, i) => i));
  /** The card currently in the air; the rest have already stepped up beneath it. */
  const [flying, setFlying] = useState<number | null>(null);
  const reduce = Boolean(useReducedMotion());
  const coarse = useCoarsePointer();
  /** Whole-stage 3D lean is a mouse nicety; on touch it only costs compositor time. */
  const lean3d = !reduce && !coarse;
  /** The recipient sees only the pile: no buttons, counters or dots. */
  const chrome = size !== 'fill';

  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const tiltX = useSpring(rawTiltX, { stiffness: 150, damping: 18, mass: 0.6 });
  const tiltY = useSpring(rawTiltY, { stiffness: 150, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (focusIndex === undefined) return;
    setFlying(null);
    setOrder((current) => {
      const at = current.indexOf(focusIndex);
      return at <= 0 ? current : [...current.slice(at), ...current.slice(0, at)];
    });
  }, [focusIndex]);

  const latest = useRef({ order, flying, artifacts, onChange, reduce });
  latest.current = { order, flying, artifacts, onChange, reduce };

  const launch = useCallback((index: number) => {
    const { order: current, flying: inAir } = latest.current;
    if (inAir !== null || current[0] !== index) return false;
    playMechanicalCue('click');
    setFlying(index);
    return true;
  }, []);

  /** The flicked card is out of frame: it drops to the back of the pile and glides in under it. */
  const land = useCallback((index: number) => {
    const {
      order: current,
      flying: inAir,
      artifacts: cards,
      onChange: notify,
      reduce: still,
    } = latest.current;
    if (inAir !== index) return;
    if (!still) playFoley('land', 0.7);
    const next = [...current.filter((i) => i !== index), index];
    setOrder(next);
    setFlying(null);
    notify?.(next[0], cards[next[0]].label);
  }, []);

  const topIndex = order[0];
  const nextIndex = order[1] ?? order[0];
  /** Each card's own throw, so the Loop button flicks whichever card is on top. */
  const throws = useRef<Record<number, () => void>>({});
  const register = useCallback((index: number, fly: () => void) => {
    throws.current[index] = fly;
  }, []);

  const lean = (e: PointerEvent<HTMLDivElement>, strength: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rawTiltY.set(px * TILT_MAX * 2 * strength);
    rawTiltX.set(-py * TILT_MAX * 2 * strength);
  };
  const settle = () => {
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
        style={lean3d ? { rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 } : undefined}
        onPointerMove={(e) => {
          if (lean3d && e.pointerType === 'mouse') lean(e, 1);
        }}
        onPointerLeave={settle}
      >
        {artifacts.map((artifact, index) => {
          const depth = order.indexOf(index);
          const inAir = flying === index;
          /** While the top card is in the air, everything under it has already moved up one. */
          const shown = inAir ? 0 : flying !== null ? depth - 1 : depth;
          return (
            <DeckCard
              key={artifact.id}
              index={index}
              artifact={artifact}
              face={faces[artifact.id]}
              depth={shown}
              zIndex={inAir ? count + 1 : count - depth}
              active={shown === 0 && flying === null}
              inAir={inAir}
              reduce={reduce}
              tiltY={tiltY}
              onLaunch={launch}
              onLand={land}
              onRegister={register}
            />
          );
        })}
      </motion.div>

      {chrome ? (
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
            onClick={() => throws.current[topIndex]?.()}
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
      ) : null}
      <p className="sr-only" aria-live="polite">
        Memory {topIndex + 1} of {count}: {artifacts[topIndex].label}
      </p>
    </section>
  );
}

const DeckCard = memo(function DeckCard({
  index,
  artifact,
  face,
  depth,
  zIndex,
  active,
  inAir,
  reduce,
  tiltY,
  onLaunch,
  onLand,
  onRegister,
}: {
  index: number;
  artifact: Artifact;
  face: ReactNode;
  depth: number;
  zIndex: number;
  active: boolean;
  inAir: boolean;
  reduce: boolean;
  tiltY: MotionValue<number>;
  onLaunch: (index: number) => boolean;
  onLand: (index: number) => void;
  onRegister: (index: number, fly: () => void) => void;
}) {
  const material = MATERIALS[artifact.id];
  const number = index + 1;
  /** Hand offset: follows the finger while held, carries the flight, springs home under the pile. */
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const dragControls = useDragControls();
  /** The click that trails a swipe must not loop a second time. */
  const dragEndedAt = useRef(0);
  const flight = useRef<ReturnType<typeof animate>[]>([]);
  /** Specular band slides across the surface as the sheet tilts or drags. */
  const sheenX = useTransform([tiltY, x], ([t, d]: number[]) => `${t * 5 + d * 0.18}%`);

  const stopFlight = () => {
    flight.current.forEach((a) => a.stop());
    flight.current = [];
  };

  const fly = useCallback(
    (dx: number, dy: number, vx = 0, vy = 0) => {
      if (!onLaunch(index)) return;
      stopFlight();
      if (reduce) {
        onLand(index);
        return;
      }
      const length = Math.hypot(dx, dy) || 1;
      const tx = (dx / length) * FLIGHT;
      const ty = (dy / length) * FLIGHT;
      flight.current = [
        animate(x, tx, { ...FLY_OUT, velocity: vx }),
        animate(y, ty, {
          ...FLY_OUT,
          velocity: vy,
          onComplete: () => {
            onLand(index);
            flight.current = [animate(x, 0, SPRING), animate(y, 0, SPRING)];
          },
        }),
      ];
    },
    [index, onLaunch, onLand, reduce, x, y],
  );

  useEffect(() => {
    onRegister(index, () => fly(1, -0.3));
  }, [onRegister, index, fly]);
  useEffect(() => () => flight.current.forEach((a) => a.stop()), []);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    dragEndedAt.current = performance.now();
    const { offset, velocity } = info;
    const far = Math.hypot(offset.x, offset.y) > FLICK_DISTANCE;
    const fast = Math.hypot(velocity.x, velocity.y) > FLICK_VELOCITY;
    if (far || fast) {
      const dx = fast ? velocity.x : offset.x;
      const dy = fast ? velocity.y : offset.y;
      fly(dx, dy, velocity.x, velocity.y);
      return;
    }
    flight.current = [animate(x, 0, SPRING), animate(y, 0, SPRING)];
  };

  /**
   * A body with more paper than fits is a touch scroller: vertical moves scroll it and only a
   * sideways move picks the card up. Bodies that fit leave every direction to the flick.
   */
  const body = useRef<HTMLDivElement>(null);
  const scrolls = useRef(false);
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => {
      scrolls.current = el.scrollHeight > el.clientHeight + 1;
      el.style.touchAction = scrolls.current ? 'pan-y' : 'none';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);
  const pending = useRef<{ x: number; y: number } | null>(null);

  const pose = restAt(Math.max(0, depth));

  return (
    <motion.div
      className={`deck-slot absolute inset-x-0 bottom-7 top-0 ${active ? '' : 'pointer-events-none'}`}
      style={{ zIndex, willChange: 'transform, opacity, z-index' }}
      initial={false}
      animate={pose}
      transition={reduce ? { duration: 0 } : SPRING}
    >
      <motion.div
        className={`deck-drag relative h-full w-full ${active && !reduce ? 'touch-none' : 'touch-pan-y'}`}
        style={{ x, y, rotate, willChange: 'transform' }}
        drag={active && !reduce}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        onPointerDown={(event) => {
          if (!active || reduce) return;
          if ((event.target as Element).closest(INTERACTIVE)) return;
          stopFlight();
          const inBody = body.current?.contains(event.target as Node);
          if (inBody && scrolls.current && event.pointerType !== 'mouse') {
            pending.current = { x: event.clientX, y: event.clientY };
            return;
          }
          dragControls.start(event);
        }}
        onPointerMove={(event) => {
          const start = pending.current;
          if (!start) return;
          const dx = Math.abs(event.clientX - start.x);
          const dy = Math.abs(event.clientY - start.y);
          if (dy > 10 && dy >= dx) pending.current = null;
          else if (dx > 10) {
            pending.current = null;
            dragControls.start(event);
          }
        }}
        onPointerUp={() => {
          pending.current = null;
        }}
        onPointerCancel={() => {
          pending.current = null;
        }}
        whileDrag={{ scale: 1.03 }}
        onDragEnd={onDragEnd}
        onClick={(event) => {
          if (!active || performance.now() - dragEndedAt.current < 250) return;
          if ((event.target as Element).closest(INTERACTIVE)) return;
          fly(1, -0.3);
        }}
      >
        <motion.div
          aria-hidden
          className={`deck-shadow ${artifact.id === 'receipt' ? 'deck-shadow--receipt' : ''}`}
          initial={false}
          animate={
            inAir
              ? { opacity: 0.45, y: 30, scale: 1.05 }
              : { opacity: SHADOW[Math.min(depth, 3)], y: 0, scale: 1 }
          }
          transition={reduce ? { duration: 0 } : SPRING}
        />

        <div className={`deck-card ${material.surface} ${active ? 'cursor-grab' : ''}`}>
          {artifact.id === 'receipt' ? <ReceiptTelemetry number={number} /> : null}

          <div ref={body} className="deck-card__body">
            {face}
          </div>

          <div className="deck-card__footer">
            <span className="truncate">
              No. {String(number).padStart(2, '0')} · {artifact.label}
            </span>
            {active ? <span className="shrink-0 text-[#ec4899]">Flick · tap</span> : null}
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
            animate={{ opacity: inAir ? 0 : DIM[Math.min(depth, 3)] }}
            transition={reduce ? { duration: 0 } : SPRING}
          />
        </div>
      </motion.div>
    </motion.div>
  );
});

/** Faded print-head header, like the machine line on a real thermal slip. */
function ReceiptTelemetry({ number }: { number: number }) {
  return (
    <div aria-hidden className="receipt-telemetry">
      <span>TERM 03 · TXN 0041{number}7</span>
      <span className="receipt-telemetry__bars">▮▮▯▮▯▮▮▯▮</span>
    </div>
  );
}
