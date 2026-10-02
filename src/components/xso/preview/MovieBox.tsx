'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { useCoarsePointer } from '@/hooks/useTouchSpring';
import { useProjectorFx } from '@/hooks/useProjectorFx';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { overallStars } from '@/components/xso/Side2Audit';
import { getArtifacts } from '@/components/xso/viewers/shared';

/** Crank travel that pulls one frame through the gate. */
const STEP = 180;
/** Film strip cell width (px). */
const CELL = 68;
const COPIES = 3;
const RATCHET = 30;

const SCREEN_SIZE = {
  hero: 'aspect-[4/3] w-full',
  studio: 'aspect-[4/3] w-full',
  fill: 'min-h-0 w-full flex-1',
};

const DUST = [
  { x: 18, y: 30, d: 9, s: 2 },
  { x: 72, y: 22, d: 12, s: 1.5 },
  { x: 40, y: 64, d: 10, s: 2.5 },
  { x: 84, y: 58, d: 14, s: 1.5 },
  { x: 28, y: 82, d: 11, s: 2 },
  { x: 60, y: 44, d: 13, s: 1.5 },
];

const wrap = (n: number, count: number) => ((n % count) + count) % count;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function firstSentence(text: string) {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

function storyFor(data: XsoData) {
  const item = data.lineItems[0]?.description.toLowerCase() ?? 'that one night';
  const flag = data.greenFlags[0]?.toLowerCase() ?? 'shows up, every single time';
  return {
    subtitles: [
      `${data.merchantName.replace(/[.!?]+$/, '')}. I kept every receipt.`,
      `Rated ${overallStars(data.auditMetrics).toFixed(1)} out of 5. I rounded down so you'd stay humble.`,
      'Some frames I replay more than others.',
      firstSentence(data.birthdayMessage),
    ],
    notes: [
      [`${item} — this is where it all started`, 'keep the receipt. always.'],
      [`green flag: ${flag}`, 'the missing stars? those were mine.'],
      [`${data.customerName}, mid-laugh — my favourite take`, 'no retakes. it was perfect.'],
      ['I rewrote this line nine times', `for ${data.customerName} — ${data.billerName}`],
    ] as const,
  };
}

export const MovieBox = memo(function MovieBox({
  data,
  onChange,
  size = 'hero',
  focusIndex,
}: {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: keyof typeof SCREEN_SIZE;
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
}) {
  const artifacts = useMemo(() => getArtifacts(data), [data]);
  const story = useMemo(() => storyFor(data), [data]);
  const count = artifacts.length;
  const reduce = Boolean(useReducedMotion());
  const coarse = useCoarsePointer();
  const fx = useProjectorFx();
  const unit = useRef<HTMLElement>(null);
  /** The beam, dust and grain loop forever; park them whenever the projector is off-screen. */
  const live = useInView(unit, { margin: '80px' });

  /** Total crank rotation in degrees; the film strip and the gate both read from it. */
  const crank = useMotionValue(0);
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState(false);
  const stepRef = useRef(0);
  const toothRef = useRef(0);
  /** Frame the mechanism is heading for, so quick repeated taps queue up instead of colliding. */
  const goal = useRef(0);
  const motion$ = useRef<AnimationPlaybackControls | null>(null);
  const frame = wrap(step, count);

  useMotionValueEvent(crank, 'change', (deg) => {
    const tooth = Math.floor(deg / RATCHET);
    if (tooth !== toothRef.current) {
      toothRef.current = tooth;
      fx.ratchet();
    }
    const next = Math.round(deg / STEP);
    if (next === stepRef.current) return;
    const direction = next > stepRef.current ? 1 : -1;
    stepRef.current = next;
    setStep(next);
    fx.step(direction);
    const index = wrap(next, count);
    onChange?.(index, artifacts[index].label);
  });

  const stop = useCallback(() => {
    motion$.current?.stop();
    motion$.current = null;
  }, []);

  const grab = useCallback(() => {
    stop();
    fx.humStart();
  }, [stop, fx]);

  /** Let go of the crank: it coasts on its own momentum and the claw catches the nearest frame. */
  const coast = useCallback(
    (velocity: number) => {
      stop();
      if (reduce) {
        goal.current = Math.round(crank.get() / STEP);
        crank.set(goal.current * STEP);
        fx.humStop();
        return;
      }
      const v = clamp(velocity, -1600, 1600);
      goal.current = Math.round((crank.get() + v * 0.2) / STEP);
      motion$.current = animate(crank, goal.current * STEP, {
        type: 'spring',
        velocity: v,
        stiffness: 90,
        damping: 16,
        onComplete: fx.humStop,
      });
    },
    [stop, reduce, crank, fx],
  );

  const advance = useCallback(
    (direction: 1 | -1) => {
      stop();
      goal.current += direction;
      const target = goal.current * STEP;
      if (reduce) {
        crank.set(target);
        return;
      }
      motion$.current = animate(crank, target, { type: 'spring', stiffness: 110, damping: 17 });
    },
    [stop, reduce, crank],
  );

  const tapCrank = useCallback(() => {
    fx.humStop();
    advance(1);
  }, [fx, advance]);
  const labels = useMemo(() => artifacts.map((a) => a.label), [artifacts]);

  useEffect(() => {
    if (focusIndex === undefined) return;
    const current = goal.current;
    let delta = wrap(focusIndex - wrap(current, count), count);
    if (delta > count / 2) delta -= count;
    if (delta === 0) return;
    goal.current = current + delta;
    motion$.current?.stop();
    motion$.current = animate(crank, (current + delta) * STEP, {
      type: 'spring',
      stiffness: 110,
      damping: 17,
    });
  }, [focusIndex, count, crank]);

  useEffect(() => () => motion$.current?.stop(), []);

  const lensBlur = !reduce && !coarse;
  const [primary, secondary] = story.notes[frame];

  return (
    <section
      ref={unit}
      className={`moviebox ${live ? '' : 'is-paused'} relative isolate flex w-full max-w-[400px] flex-col items-center ${size === 'fill' ? 'h-full' : ''}`}
      aria-label="8mm projector"
      aria-roledescription="film reel"
    >
      <div className={`relative ${SCREEN_SIZE[size]}`}>
        <div aria-hidden className="projector-beam gpu-layer">
          {(coarse ? DUST.slice(0, 3) : DUST).map((mote, i) => (
            <span
              key={i}
              className="dust-mote"
              style={{
                left: `${mote.x}%`,
                top: `${mote.y}%`,
                width: mote.s,
                height: mote.s,
                animationDuration: `${mote.d}s`,
                animationDelay: `${-i * 1.7}s`,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          className="film-screen group"
          onClick={() => {
            setNotes((open) => !open);
            fx.note();
          }}
          aria-expanded={notes}
          aria-label={`Frame ${frame + 1} of ${count}: ${artifacts[frame].label}. ${notes ? 'Hide' : 'Show'} director's notes.`}
        >
          <motion.div
            key={step}
            className="gpu-layer absolute inset-0"
            initial={false}
            animate={
              reduce
                ? undefined
                : {
                    y: [-10, 5, 0],
                    opacity: [1, 0.4, 1],
                    ...(lensBlur
                      ? { filter: ['blur(4px)', 'blur(1.5px)', 'blur(0px)'] }
                      : { scale: [1.03, 1.01, 1] }),
                  }
            }
            transition={{ duration: 0.34, times: [0, 0.4, 1], ease: 'easeOut' }}
          >
            <FrameFace data={data} index={frame} />
          </motion.div>
          {!reduce ? (
            <motion.span
              key={`shutter-${step}`}
              aria-hidden
              className="film-shutter"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: [0.7, 0, 0.25, 0] }}
              transition={{ duration: 0.28, times: [0, 0.35, 0.55, 1] }}
            />
          ) : null}
          <span aria-hidden className="film-grain" />
          <span aria-hidden className="film-vignette" />
          <motion.p
            key={`sub-${frame}`}
            className="film-subtitle"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.18 }}
          >
            {story.subtitles[frame]}
          </motion.p>
          <span className="film-screen__hint">{notes ? 'hide notes' : "director's notes"}</span>
        </button>

        <AnimatePresence>
          {notes ? (
            <motion.div
              key={`notes-${frame}`}
              className="pointer-events-none absolute inset-0 z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <DirectorNote className="-left-2 -top-6 -rotate-6" delay={0} reduce={reduce}>
                {primary}
              </DirectorNote>
              <DirectorNote
                className="-right-1 bottom-12 rotate-3 text-right"
                delay={0.12}
                reduce={reduce}
              >
                {secondary}
              </DirectorNote>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <FilmStrip
        data={data}
        crank={crank}
        count={count}
        labels={labels}
        onGrab={grab}
        onRelease={coast}
      />

      <div className="relative z-10 mt-3 flex w-full items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-receipt text-[10px] uppercase tracking-[0.2em] text-[#fdba74]">
            Reel {String(frame + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          </p>
          <p className="truncate font-receipt text-[10px] uppercase tracking-[0.16em] text-[#9a6a7e]">
            {artifacts[frame].label} · tap the frame
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="projector-step"
            onClick={() => advance(-1)}
            aria-label="Previous frame"
          >
            ‹
          </button>
          <CrankWheel
            crank={crank}
            reduce={reduce}
            onGrab={grab}
            onRelease={coast}
            onTap={tapCrank}
            onKey={advance}
          />
          <button
            type="button"
            className="projector-step"
            onClick={() => advance(1)}
            aria-label="Next frame"
          >
            ›
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        Frame {frame + 1} of {count}: {artifacts[frame].label}. {story.subtitles[frame]}
      </p>
    </section>
  );
});

function DirectorNote({
  className,
  delay,
  reduce,
  children,
}: {
  className: string;
  delay: number;
  reduce: boolean;
  children: string;
}) {
  return (
    <motion.p
      className={`director-note absolute max-w-[62%] ${className}`}
      initial={reduce ? false : { opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay }}
    >
      {children}
    </motion.p>
  );
}

/** Hand crank: turn it like the real thing (any circular drag), or tap for one frame. */
const CrankWheel = memo(function CrankWheel({
  crank,
  reduce,
  onGrab,
  onRelease,
  onTap,
  onKey,
}: {
  crank: MotionValue<number>;
  reduce: boolean;
  onGrab: () => void;
  onRelease: (velocity: number) => void;
  onTap: () => void;
  onKey: (direction: 1 | -1) => void;
}) {
  const grip = useRef<{ cx: number; cy: number; last: number; travel: number } | null>(null);
  /** The click that trails a turn must not add a frame on top of the coast. */
  const turnedAt = useRef(0);

  const angleOf = (event: PointerEvent, cx: number, cy: number) =>
    (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;

  return (
    <motion.button
      type="button"
      className="crank-wheel touch-none"
      whileTap={reduce ? undefined : { scale: 0.96 }}
      onPointerDown={(event) => {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Synthetic or already-released pointers can't be captured.
        }
        const box = event.currentTarget.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        grip.current = { cx, cy, last: angleOf(event, cx, cy), travel: 0 };
        onGrab();
      }}
      onPointerMove={(event) => {
        const g = grip.current;
        if (!g) return;
        const angle = angleOf(event, g.cx, g.cy);
        let delta = angle - g.last;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        g.last = angle;
        g.travel += Math.abs(delta);
        crank.set(crank.get() + delta);
      }}
      onPointerUp={() => {
        const g = grip.current;
        grip.current = null;
        if (!g || g.travel < 10) return;
        turnedAt.current = performance.now();
        onRelease(crank.getVelocity());
      }}
      onPointerCancel={() => {
        grip.current = null;
        onRelease(0);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          onKey(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          onKey(-1);
        }
      }}
      onClick={() => {
        if (performance.now() - turnedAt.current < 250) return;
        onTap();
      }}
      aria-label="Turn the projector crank"
    >
      <motion.span aria-hidden className="crank-wheel__disc gpu-layer" style={{ rotate: crank }}>
        <span className="crank-wheel__spoke" />
        <span className="crank-wheel__spoke rotate-90" />
        <span className="crank-wheel__knob" />
      </motion.span>
    </motion.button>
  );
});

/** Celluloid running through the gate; drag it sideways to scrub. */
const FilmStrip = memo(function FilmStrip({
  data,
  crank,
  count,
  labels,
  onGrab,
  onRelease,
}: {
  data: XsoData;
  crank: MotionValue<number>;
  count: number;
  labels: string[];
  onGrab: () => void;
  onRelease: (velocity: number) => void;
}) {
  const x = useTransform(crank, (deg) => -(count + wrap(deg / STEP, count)) * CELL);
  const start = useRef(0);
  const cells = Array.from({ length: count * COPIES }, (_, i) => i % count);

  return (
    <motion.div
      className="celluloid relative mt-4 w-full touch-pan-y select-none"
      onPanStart={() => {
        start.current = crank.get();
        onGrab();
      }}
      onPan={(_, info) => crank.set(start.current - (info.offset.x / CELL) * STEP)}
      onPanEnd={(_, info) => onRelease((-info.velocity.x / CELL) * STEP)}
      aria-hidden
    >
      <span className="celluloid__backlight" />
      <motion.div className="celluloid__track gpu-layer" style={{ x, marginLeft: -CELL / 2 }}>
        {cells.map((index, i) => (
          <div key={i} className="celluloid__cell" style={{ width: CELL }}>
            <div className="celluloid__frame">
              {index === 2 && data.photos[0] ? (
                <LazyMedia
                  src={data.photos[0]}
                  alt=""
                  fill
                  sizes="64px"
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
              ) : null}
              <span className="relative">
                {String(index + 1).padStart(2, '0')}
                <br />
                {labels[index]}
              </span>
            </div>
          </div>
        ))}
      </motion.div>
      <span className="celluloid__gate" />
    </motion.div>
  );
});

const FrameFace = memo(function FrameFace({ data, index }: { data: XsoData; index: number }) {
  const scene = (
    <p className="font-receipt text-[9px] uppercase tracking-[0.3em] text-[#fdba74]/80">
      Scene {String(index + 1).padStart(2, '0')}
    </p>
  );
  if (index === 0) {
    return (
      <div className="film-face">
        {scene}
        <p className="mt-1 font-serif text-xl font-semibold leading-tight">{data.merchantName}</p>
        <div className="mt-2 space-y-0.5 font-receipt text-[11px] text-[#fffaf0]/85">
          {data.lineItems.slice(0, 3).map((item) => (
            <p
              key={item.id}
              className="flex justify-between gap-3 border-b border-[#fffaf0]/10 py-0.5"
            >
              <span className="truncate">{item.description}</span>
              <span className="shrink-0">{item.price}</span>
            </p>
          ))}
        </div>
        <p className="mt-2 font-receipt text-sm font-bold">Total · {data.total}</p>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="film-face">
        {scene}
        <p className="mt-1 font-serif text-xl font-semibold leading-tight">
          {overallStars(data.auditMetrics).toFixed(1)} ★ friendship audit
        </p>
        <div className="mt-2 space-y-1.5">
          {Object.entries(data.auditMetrics).map(([label, score]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-16 font-receipt text-[9px] uppercase tracking-[0.14em] text-[#fffaf0]/75">
                {label}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#fffaf0]/10">
                <span
                  className="block h-full origin-left rounded-full bg-gradient-to-r from-[#fdba74] to-[#f472b6]"
                  style={{ transform: `scaleX(${score / 100})` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="absolute inset-0 grid grid-cols-3 gap-px bg-[#120806]">
        {[0, 1, 2].map((slot) => (
          <div key={slot} className="relative overflow-hidden bg-[#2a1712]">
            {data.photos[slot] ? (
              <LazyMedia
                src={data.photos[slot]}
                alt={`Memory ${slot + 1}`}
                fill
                sizes="140px"
                className="film-photo absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="film-face">
      {scene}
      <p className="mt-1 font-hand text-2xl leading-none text-[#fffaf0]">
        Dear {data.customerName},
      </p>
      <p className="film-face__letter mt-2 font-serif text-[13px] italic leading-snug text-[#fffaf0]/85">
        {data.birthdayMessage}
      </p>
    </div>
  );
});
