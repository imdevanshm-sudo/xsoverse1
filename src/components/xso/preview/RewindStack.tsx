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
import { Play } from 'lucide-react';
import { TRACK_TITLES, TapePlayer, sideOf } from '@/components/xso/rewind/TapePlayer';
import { useMixtape } from '@/components/xso/rewind/useMixtape';
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
import { useProgress } from '@/components/xso/stage/useProgress';
import { YOUR_TURN, YourTurn } from '@/components/xso/stage/YourTurn';

/** Pointer travel needed to let go of a memory; the card itself only gives ~⅓ of that. */
const PULL_DISTANCE = 90;
const PULL_VELOCITY = 550;
const PULL_ELASTIC = 0.35;
/** Presses on these stay with the control; photo thumbnails still drag the card. */
const INTERACTIVE = 'button:not([data-polaroid]), a, input, audio, canvas, [role="slider"]';

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

type Sheet = Omit<Artifact, 'id'> & { id: Artifact['id'] | 'liner' | 'end' };

interface StackProps {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: keyof typeof DECK_HEIGHT;
  /** 0–3 are the four keepsakes; 4 is the liner notes when present. */
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
  /** Fires once every card has been on top, so the viewer can offer what comes next. */
  onFinish?: () => void;
  /** Recipients get a "Your turn" card once, right after the last memory. */
  cta?: boolean;
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
              content: (
                <LinerNotes
                  data={data}
                  review={review}
                  tracks={[...base.map((a) => TRACK_TITLES[a.id] ?? a.label), TRACK_TITLES.liner]}
                />
              ),
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

const Stack = memo(function Stack({
  data,
  artifacts,
  onChange: report,
  onFinish,
  size = 'hero',
  focusIndex,
  cta = false,
}: StackProps & { artifacts: Sheet[] }) {
  const onChange = useProgress(artifacts.length, report, onFinish);
  const count = artifacts.length;
  /** The end card's slot; it only joins the pile once, after the last memory. */
  const end = count;
  const sheets = useMemo<Sheet[]>(
    () =>
      cta
        ? [
            ...artifacts,
            { id: 'end', label: YOUR_TURN, rotation: 0, contentScale: 1, content: null },
          ]
        : artifacts,
    [artifacts, cta],
  );
  const dismiss = useRef<() => void>(() => {});
  const faces = useMemo(() => {
    const out: Partial<Record<Sheet['id'], ReactNode>> = {};
    for (const a of artifacts) out[a.id] = a.content;
    out.receipt = <Side1Receipt data={data} bare />;
    out.letter = <Side4BirthdayCard data={data} bare />;
    out.end = <YourTurn source="rewind_end" onDismiss={() => dismiss.current()} />;
    return out;
  }, [artifacts, data]);
  /** A slightly messy pile: stable, human-placed tilt per sheet (−3° … 3°). */
  const tilts = useMemo(
    () => sheets.map((_, i) => seededOffset(data.id || 'xso', i, 3)),
    [sheets, data.id],
  );
  const [offered, setOffered] = useState(false);
  const [pile, setPile] = useState<Pile>(() => ({
    order: artifacts.map((_, i) => i),
    passes: sheets.map(() => 0),
    turn: 0,
    direction: -1,
  }));
  const reduce = Boolean(useReducedMotion());
  /** The recipient sees only the tape and the pile: no buttons, counters, tags or hints. */
  const chrome = size !== 'fill';
  const stage = useRef<HTMLElement>(null);
  const visible = useInView(stage, { margin: '120px' });
  const music = useMixtape(data.rewind);
  /** Recipients choose sound or silence before the first card; nothing plays until they tap. */
  const [opened, setOpened] = useState(chrome);

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

  const tracks = useMemo(
    () => sheets.map((a) => ({ id: a.id, title: TRACK_TITLES[a.id] ?? a.label })),
    [sheets],
  );
  const { order, passes, turn, direction } = pile;
  const front = order[0];
  const next = order[1] ?? front;

  useEffect(() => {
    if (!cta || offered || order[0] !== count - 1) return;
    setOffered(true);
    setPile((current) => ({
      ...current,
      order: [current.order[0], end, ...current.order.slice(1)],
    }));
  }, [cta, offered, order, count, end]);

  /** Mirrors the pile synchronously so back-to-back pulls report the sheet that's really on top. */
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const rewind = useCallback(
    (towards: Direction = -1) => {
      playMechanicalCue('click');
      if (!reduce) playFoley('land', 0.55);
      /** The end card is offered once: put away, it leaves the pile and the tape plays on. */
      const keep = (top: number, rest: number[]) => (top === end ? rest : [...rest, top]);
      const [first, ...others] = orderRef.current;
      orderRef.current = keep(first, others);
      setPile((current) => {
        const [top, ...rest] = current.order;
        const bumped = [...current.passes];
        bumped[top] += 1;
        return {
          order: keep(top, rest),
          passes: bumped,
          turn: current.turn + 1,
          direction: towards,
        };
      });
      const shown = orderRef.current[0];
      if (shown !== end) onChange?.(shown, sheets[shown].label);
    },
    [sheets, end, reduce, onChange],
  );
  dismiss.current = rewind;

  return (
    <section
      ref={stage}
      className={`relative isolate flex w-full max-w-[400px] touch-pan-y flex-col items-center ${size === 'fill' ? 'h-full' : ''}`}
      aria-label="Rewind stack"
      aria-roledescription="card stack"
    >
      <Backlight pulsing={!reduce && visible} turn={reduce ? 0 : turn} />

      <TapePlayer
        tape={tapeOf(data)}
        tracks={tracks}
        current={front}
        playing={music.playing}
        progress={music.progress}
        available={music.available}
        muted={music.muted}
        voice={music.voice}
        transcript={music.transcript}
        failed={music.failed}
        onToggle={() => {
          setOpened(true);
          music.toggle();
        }}
        onMute={music.toggleMute}
      />

      <div className={`relative w-full ${DECK_HEIGHT[size]}`}>
        {music.available && !opened ? (
          <TapeOpener
            voice={music.voice}
            from={data.billerName}
            onPlay={() => {
              setOpened(true);
              music.toggle();
            }}
            onSkip={() => setOpened(true)}
          />
        ) : null}
        <AnimatePresence initial={false} custom={direction}>
          {order.slice(0, DEPTH.length).map((index, depth) => {
            const artifact = sheets[index];
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
                  chrome={chrome}
                  onRewind={rewind}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {chrome ? (
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
            aria-label={`Rewind — bring back: ${sheets[next].label}`}
          >
            <span aria-hidden className="text-sm leading-none">
              ↺
            </span>
            Rewind
          </motion.button>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {front === end ? YOUR_TURN : `Memory ${front + 1} of ${count}: ${sheets[front].label}`}
      </p>
    </section>
  );
});

function TapeOpener({
  voice,
  from,
  onPlay,
  onSkip,
}: {
  voice: boolean;
  from: string;
  onPlay: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="tape-opener"
      role="dialog"
      aria-label="Soundtrack"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onSkip();
      }}
    >
      <p className="font-receipt text-[11px] uppercase tracking-[0.24em] text-[#fdba74]">
        {voice ? 'Side A · a voice note' : 'Side A · with a soundtrack'}
      </p>
      <p className="max-w-[16rem] font-serif text-[24px] font-semibold leading-tight text-[#fdf2f8]">
        {voice ? `${from || 'Someone'} recorded something for you` : 'This tape comes with music'}
      </p>
      <button type="button" autoFocus onClick={onPlay} className="tape-opener__button">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2a1408] text-[#fbbf24]">
          <Play className="h-4 w-4 translate-x-[1px] fill-current" aria-hidden />
        </span>
        <span className="font-receipt text-[13px] font-bold uppercase tracking-[0.18em]">
          Press play
        </span>
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="min-h-11 px-3 text-[15px] text-[#e9c9b4] underline decoration-[#e9c9b4]/40 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
      >
        Read in silence
      </button>
    </div>
  );
}

/** Gifts from before the tape label existed still get a J-card. */
function tapeOf(data: XsoData): RewindLayers {
  return (
    data.rewind ?? { sideA: data.occasion, sideB: 'The ones we replay', tapeDate: '', review: '' }
  );
}

/** The J-card insert: the track list by side, then the sender's review in their own hand. */
const LinerNotes = memo(function LinerNotes({
  data,
  review,
  tracks,
}: {
  data: XsoData;
  review: string;
  tracks: string[];
}) {
  const tape = tapeOf(data);
  const numbered = tracks.map((title, i) => {
    const side = sideOf(i, tracks.length);
    const first = tracks.findIndex((_, n) => sideOf(n, tracks.length) === side);
    return { title, side, label: `${side}${i - first + 1}` };
  });
  return (
    <article className="liner-notes">
      <header className="border-b-2 border-[#2d1b22] pb-3">
        <p className="liner-notes__kicker font-receipt uppercase tracking-[0.24em] text-[#9a4a2a]">
          Liner notes{tape.tapeDate ? ` · ${tape.tapeDate}` : ''}
        </p>
        <h3 className="liner-notes__title mt-1 font-serif font-semibold leading-tight">
          {tape.sideA || 'The review'}
        </h3>
        {tape.sideB ? (
          <p className="liner-notes__text mt-0.5 font-serif italic leading-snug text-[#6b4a3a]">
            b/w {tape.sideB}
          </p>
        ) : null}
      </header>
      <ol className="liner-notes__tracks" aria-label="Track list">
        {numbered.map(({ title, side, label }, i) => (
          <li
            key={label}
            className={i > 0 && side !== numbered[i - 1].side ? 'liner-notes__side-b' : ''}
          >
            <span className="font-receipt text-[#b45309]">{label}</span>
            <span>{title}</span>
          </li>
        ))}
      </ol>
      <p className="liner-notes__hand mt-4 whitespace-pre-line font-hand leading-[1.25] text-[#3a2530]">
        {review}
      </p>
      <p className="liner-notes__hand mt-3 self-end font-hand leading-none text-[#b4234a]">
        — {data.billerName}
      </p>
    </article>
  );
});

/**
 * Room light falling on the desk: a slow resting heartbeat in the CTA's
 * pinks and ambers, with a brief warm swell each time a memory changes hands.
 */
const Backlight = memo(function Backlight({ pulsing, turn }: { pulsing: boolean; turn: number }) {
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
});

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
  chrome,
  onRewind,
}: {
  artifact: Sheet;
  face: ReactNode;
  number: number;
  active: boolean;
  reduce: boolean;
  chrome: boolean;
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
        {chrome ? (
          <div className="deck-card__footer">
            <span className="truncate">
              No. {String(number).padStart(2, '0')} · {artifact.label}
            </span>
            {active ? <span className="shrink-0 text-[#ec4899]">Tap · pull back</span> : null}
          </div>
        ) : null}
        <span aria-hidden className="rewind-card__glow" />
        <span aria-hidden className="rewind-card__grain" />
      </div>
    </motion.div>
  );
});
