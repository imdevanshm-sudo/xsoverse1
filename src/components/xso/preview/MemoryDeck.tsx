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
  AnimatePresence,
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
import { RotateCw } from 'lucide-react';
import { LOOP_CARDS, type XsoData } from '@/types/xso';
import { playSound } from '@/lib/sound';
import { ActiveScope } from '@/components/xso/stage/ActiveScope';
import { resolveLoop } from '@/lib/formats';
import { useCoarsePointer } from '@/hooks/useTouchSpring';
import { Side1Receipt } from '@/components/xso/Side1Receipt';
import { Side4BirthdayCard } from '@/components/xso/Side4BirthdayCard';
import { getArtifacts, type Artifact } from '@/components/xso/viewers/shared';
import { useProgress } from '@/components/xso/stage/useProgress';
import { YOUR_TURN, YourTurn } from '@/components/xso/stage/YourTurn';
import { DeckProgress, SideZone, SwipeHint } from '@/components/xso/stage/DeckControls';

const TILT_MAX = 6;
/** Release past this distance, or this fast, and the card is flicked off the pile. */
const FLICK_DISTANCE = 90;
const FLICK_VELOCITY = 550;
/** Far enough to clear the gift canvas from the middle of the pile in any direction. */
const FLIGHT = 720;
/** Presses on these stay with the card content; photo thumbnails still drag the card. */
const INTERACTIVE = 'button:not([data-polaroid]), a, input, audio, canvas, [role="slider"]';

const SPRING = { type: 'spring', stiffness: 220, damping: 26 } as const;
/** Going back plays the same paper slide, a little lower. */
const REVERSE_PITCH = 0.88;
/** Going back, the card comes in from the left: the reverse of a flick. */
const ENTER_FROM = { x: -FLIGHT * 0.55, y: -40 };
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

/** The sender's cards, plus the recipient's closing "Your turn" card. */
type SlotId = Artifact['id'] | 'end';

type Material = { surface: string; sheen: number };
const MATERIALS: Record<SlotId, Material> = {
  receipt: { surface: 'mat-receipt', sheen: 0.3 },
  audit: { surface: 'mat-cardstock', sheen: 0.35 },
  photos: { surface: 'mat-photo', sheen: 0.9 },
  letter: { surface: 'mat-letter', sheen: 0.14 },
  end: { surface: 'mat-letter', sheen: 0.14 },
};

interface DeckProps {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: 'hero' | 'studio' | 'fill';
  /** Brings this card (0–3, of all four) to the top whenever it changes. */
  focusIndex?: number;
  /** Fires with the new top card after each loop. */
  onChange?: (index: number, label: string) => void;
  /** Fires once every card has been on top, so the viewer can offer what comes next. */
  onFinish?: () => void;
  /**
   * A received gift: once the last card reaches the top, a "Your turn" card slips in beneath it,
   * so Make one back comes next instead of covering anything.
   */
  cta?: boolean;
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

const Deck = memo(function Deck({
  data,
  artifacts,
  onChange: report,
  onFinish,
  size = 'hero',
  focusIndex,
  cta = false,
}: DeckProps & { artifacts: Artifact[] }) {
  const onChange = useProgress(artifacts.length, report, onFinish);
  const count = artifacts.length;
  /** The end card's slot; it only joins the pile once, after the last card. */
  const end = count;
  const slots = useMemo<{ id: SlotId; label: string }[]>(
    () => [...artifacts, ...(cta ? [{ id: 'end' as const, label: YOUR_TURN }] : [])],
    [artifacts, cta],
  );
  /** Each card's own throw, so the Loop button flicks whichever card is on top. */
  const throws = useRef<Record<number, () => void>>({});
  /** Each card's entrance from the left, for going back a card. */
  const entrances = useRef<Record<number, () => void>>({});
  /** The swipe hint stays until the first move through the deck. */
  const [moved, setMoved] = useState(false);
  /** Goes up each time the pile comes back round to the first card. */
  const [round, setRound] = useState(1);
  /** Receipt and letter render bare so the deck card itself is the paper. */
  const faces = useMemo<Record<SlotId, ReactNode>>(
    () => ({
      receipt: <Side1Receipt data={data} bare />,
      audit: artifacts.find((a) => a.id === 'audit')?.content,
      photos: artifacts.find((a) => a.id === 'photos')?.content,
      letter: <Side4BirthdayCard data={data} bare />,
      end: <YourTurn source="loop_end" onDismiss={() => throws.current[end]?.()} />,
    }),
    [artifacts, data, end],
  );
  /** Every card stays mounted while it's in the pile; only its depth changes. */
  const [order, setOrder] = useState(() => artifacts.map((_, i) => i));
  const [offered, setOffered] = useState(false);
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

  useEffect(() => {
    if (!cta || offered || flying !== null || order[0] !== count - 1) return;
    setOffered(true);
    setOrder((current) => [current[0], end, ...current.slice(1)]);
  }, [cta, offered, flying, order, count, end]);

  const restarting = useRef(false);
  const latest = useRef({ order, flying, slots, onChange, reduce, count });
  latest.current = { order, flying, slots, onChange, reduce, count };

  const launch = useCallback((index: number) => {
    const { order: current, flying: inAir } = latest.current;
    if (inAir !== null || current[0] !== index) return false;
    playSound(restarting.current ? 'loop.restart' : 'loop.slide');
    /** With reduced motion the card lands in the same tick, before React has re-rendered. */
    latest.current.flying = index;
    setFlying(index);
    return true;
  }, []);

  /** The flicked card is out of frame: it drops to the back of the pile and glides in under it. */
  const land = useCallback((index: number) => {
    const {
      order: current,
      flying: inAir,
      slots: cards,
      onChange: notify,
      count: total,
    } = latest.current;
    if (inAir !== index) return;
    setMoved(true);
    /** The end card is offered once: flicked away, it leaves the pile and the loop carries on. */
    const rest = current.filter((i) => i !== index);
    const next = cards[index].id === 'end' ? rest : [...rest, index];
    const wrapped = next[0] === 0 && (index === total - 1 || cards[index].id === 'end');
    /** Coming round on its own gets the tape blip; Start over already played its rewind. */
    if (wrapped) {
      if (!restarting.current) playSound('loop.round');
      setRound((r) => r + 1);
    }
    restarting.current = false;
    setOrder(next);
    setFlying(null);
    if (cards[next[0]].id !== 'end') notify?.(next[0], cards[next[0]].label);
  }, []);

  const topIndex = order[0];
  const nextIndex = order[1] ?? order[0];
  const pile = order.length;
  const register = useCallback((index: number, fly: () => void, enter: () => void) => {
    throws.current[index] = fly;
    entrances.current[index] = enter;
  }, []);

  const next = useCallback(() => throws.current[latest.current.order[0]]?.(), []);
  /** Back to the first card: a waiting end card steps aside and the top card is flicked away. */
  const restart = useCallback(() => {
    const { order: current, flying: inAir } = latest.current;
    if (inAir !== null) return;
    const top = current[0];
    if (top !== end && current.includes(end)) {
      const trimmed = current.filter((i) => i !== end);
      latest.current.order = trimmed;
      setOrder(trimmed);
    }
    restarting.current = true;
    throws.current[top]?.();
  }, [end]);
  /** The card at the back of the pile comes back on top, from the left. */
  const back = useCallback(() => {
    const { order: current, flying: inAir, slots: cards, onChange: notify } = latest.current;
    if (inAir !== null || current.length < 2) return;
    const last = current[current.length - 1];
    const prev = [last, ...current.slice(0, -1)];
    playSound('loop.slide', { rate: REVERSE_PITCH });
    setMoved(true);
    setOrder(prev);
    entrances.current[last]?.();
    if (cards[last].id !== 'end') notify?.(last, cards[last].label);
  }, []);

  useEffect(() => {
    if (chrome) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const { target } = event;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]'))
        return;
      if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') back();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chrome, next, back]);

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
        className={`deck-stage relative w-full will-change-transform ${size === 'studio' ? 'memory-deck--studio' : size === 'fill' ? 'min-h-0 flex-1' : 'memory-deck'}`}
        style={lean3d ? { rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 } : undefined}
        onPointerMove={(e) => {
          if (lean3d && e.pointerType === 'mouse') lean(e, 1);
        }}
        onPointerLeave={settle}
      >
        {slots.map((slot, index) => {
          const depth = order.indexOf(index);
          const inAir = flying === index;
          if (depth < 0 && !inAir) return null;
          /** While the top card is in the air, everything under it has already moved up one. */
          const shown = inAir ? 0 : flying !== null ? depth - 1 : depth;
          /** Contents live only on the top card, the one under it and the one gliding in behind. */
          const near = shown <= 1 || depth === pile - 1;
          return (
            <DeckCard
              key={slot.id}
              index={index}
              id={slot.id}
              label={slot.label}
              face={near ? faces[slot.id] : null}
              depth={shown}
              zIndex={inAir ? pile + 1 : pile - depth}
              active={shown === 0 && flying === null}
              inAir={inAir}
              reduce={reduce}
              chrome={chrome}
              tiltY={tiltY}
              onLaunch={launch}
              onLand={land}
              onRegister={register}
            />
          );
        })}
        {chrome ? null : (
          <>
            <SwipeHint shown={!moved} reduce={reduce} />
            <LoopCue round={round} reduce={reduce} />
          </>
        )}
      </motion.div>

      {chrome ? null : (
        <>
          <SideZone side="left" onClick={back} />
          <SideZone side="right" onClick={next} />
          <DeckProgress
            count={count}
            top={topIndex === end ? null : topIndex}
            onBack={back}
            onNext={next}
            onRestart={
              topIndex === end || (topIndex === count - 1 && !order.includes(end))
                ? restart
                : undefined
            }
          />
        </>
      )}

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
            aria-label={`Loop memory — next up: ${slots[nextIndex].label}`}
          >
            <span aria-hidden className="text-sm leading-none">
              ↻
            </span>
            Loop memory
          </motion.button>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {topIndex === end
          ? YOUR_TURN
          : `Memory ${topIndex + 1} of ${count}: ${slots[topIndex].label}`}
      </p>
    </section>
  );
});

const DeckCard = memo(function DeckCard({
  index,
  id,
  label,
  face,
  depth,
  zIndex,
  active,
  inAir,
  reduce,
  chrome,
  tiltY,
  onLaunch,
  onLand,
  onRegister,
}: {
  index: number;
  id: SlotId;
  label: string;
  face: ReactNode;
  depth: number;
  zIndex: number;
  active: boolean;
  inAir: boolean;
  reduce: boolean;
  /** Card numbers, tags and gesture hints; off for the recipient. */
  chrome: boolean;
  tiltY: MotionValue<number>;
  onLaunch: (index: number) => boolean;
  onLand: (index: number) => void;
  onRegister: (index: number, fly: () => void, enter: () => void) => void;
}) {
  const material = MATERIALS[id];
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

  const enter = useCallback(() => {
    if (reduce) return;
    stopFlight();
    x.set(ENTER_FROM.x);
    y.set(ENTER_FROM.y);
    flight.current = [animate(x, 0, SPRING), animate(y, 0, SPRING)];
  }, [reduce, x, y]);

  useEffect(() => {
    onRegister(index, () => fly(1, -0.3), enter);
  }, [onRegister, index, fly, enter]);
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
  }, [face]);
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
          className={`deck-shadow ${id === 'receipt' ? 'deck-shadow--receipt' : ''}`}
          initial={false}
          animate={
            inAir
              ? { opacity: 0.45, y: 30, scale: 1.05 }
              : { opacity: SHADOW[Math.min(depth, 3)], y: 0, scale: 1 }
          }
          transition={reduce ? { duration: 0 } : SPRING}
        />

        <div className={`deck-card ${material.surface} ${active ? 'cursor-grab' : ''}`}>
          {chrome && id === 'receipt' ? <ReceiptTelemetry number={number} /> : null}

          <div ref={body} className="deck-card__body">
            <ActiveScope active={active}>{face}</ActiveScope>
          </div>

          {chrome ? (
            <div className="deck-card__footer">
              <span className="truncate">
                No. {String(number).padStart(2, '0')} · {label}
              </span>
              {active ? <span className="shrink-0 text-[#ec4899]">Flick · tap</span> : null}
            </div>
          ) : null}

          {id === 'letter' ? <span aria-hidden className="deck-card__creases" /> : null}
          {id === 'receipt' ? <span aria-hidden className="deck-card__thermal-fade" /> : null}
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
const ReceiptTelemetry = memo(function ReceiptTelemetry({ number }: { number: number }) {
  return (
    <div aria-hidden className="receipt-telemetry">
      <span>TERM 03 · TXN 0041{number}7</span>
      <span className="receipt-telemetry__bars">▮▮▯▮▯▮▮▯▮</span>
    </div>
  );
});

/** Shown each time the pile comes back round: the loop, made visible. */
const LoopCue = memo(function LoopCue({ round, reduce }: { round: number; reduce: boolean }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (round < 2) return;
    setShown(true);
    const timer = window.setTimeout(() => setShown(false), 2400);
    return () => window.clearTimeout(timer);
  }, [round]);
  return (
    <AnimatePresence>
      {shown ? (
        <motion.p
          key={round}
          role="status"
          className="pointer-events-none absolute inset-x-0 -top-1 z-50 mx-auto flex w-max items-center gap-2 rounded-full bg-[#1b0f15]/85 px-4 py-2 font-receipt text-[13px] uppercase tracking-[0.18em] text-[#fde7d4] shadow-[0_10px_30px_rgba(0,0,0,.45)] backdrop-blur-sm"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <motion.span
            aria-hidden
            className="inline-flex text-[#fdba74]"
            initial={{ rotate: 0 }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <RotateCw className="h-4 w-4" />
          </motion.span>
          Round {round} · on repeat
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
});
