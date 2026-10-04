'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion';
import { LOOP_CARDS, isPlaceholderPhoto, type AuditMetrics, type XsoData } from '@/types/xso';
import { auditLabel } from '@/lib/formats';
import { photoCaption } from '@/lib/photoStrips';
import { stackCards } from '@/lib/formatCards';
import { playFoley } from '@/lib/foley';
import { useCoarsePointer } from '@/hooks/useTouchSpring';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { PolaroidThumb } from '@/components/xso/PolaroidThumb';
import { overallStars } from '@/components/xso/Side2Audit';
import { getArtifacts, playMechanicalCue, type Artifact } from '@/components/xso/viewers/shared';
import { useProgress } from '@/components/xso/stage/useProgress';
import { YOUR_TURN, YourTurn } from '@/components/xso/stage/YourTurn';

const RIBBON_HEIGHT = {
  hero: 'memory-deck',
  studio: 'memory-deck--studio',
  fill: 'min-h-0 flex-1',
};

/** |distance from the panel in focus| → fold angle (deg). Neighbours rest at ±8°, the ends fold shut. */
const FOLD_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.45, 8],
  [1, 34],
  [1.7, 62],
  [2.6, 78],
];
/** Angle of every panel when the ribbon is compressed into a bundle. */
const SHUT = 86;

/** Scroll drives the ribbon almost 1:1; a light spring only takes the edge off wheel steps. */
const TRAVEL = { stiffness: 320, damping: 36 };
/** Folds lag the travel a touch and overshoot slightly, like paper settling. */
const CREASE = { stiffness: 70, damping: 15, mass: 1.2 };
const SNAPPY = { stiffness: 1000, damping: 100 };
/** Paper let go of after a pull: springs past its rest once, then settles. */
const TENSION = { stiffness: 380, damping: 14, mass: 0.8 };
/** Scroll distance per fold, as a share of a panel's height. */
const SCROLL_PER_FOLD = 0.9;
/** How many panels are mid-fold at once while the sheet cascades shut or open. */
const CASCADE = 1.4;
const CASCADE_TIME = 1.3;

function foldAt(distance: number) {
  const d = Math.abs(distance);
  for (let i = 1; i < FOLD_STOPS.length; i += 1) {
    const [d1, a1] = FOLD_STOPS[i];
    if (d <= d1) {
      const [d0, a0] = FOLD_STOPS[i - 1];
      return a0 + ((a1 - a0) * (d - d0)) / (d1 - d0);
    }
  }
  return FOLD_STOPS[FOLD_STOPS.length - 1][1];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const RAD = Math.PI / 180;
const smooth = (t: number) => t * t * (3 - 2 * t);
const between = (v: number, from: number, to: number) =>
  smooth(clamp((v - from) / (to - from), 0, 1));
/** Diminishing give past the end of the paper: never quite reaches 1. */
const rubber = (distance: number) => 1 - 1 / (1 + Math.max(0, distance) / 220);

/**
 * How shut panel `i` is while the sheet is `shut` of the way to a bundle.
 * Both directions start at the top fold, so the letter always moves in reading order.
 */
function panelShut(shut: number, i: number, last: number, closing: boolean) {
  const order = closing ? i : last - i;
  return smooth(clamp((shut * (last + CASCADE) - order) / CASCADE, 0, 1));
}

/** Darkness of the crease between two panels: zero when they lie flat, deepest when pressed together. */
const creaseDepth = (a: number, b: number) => Math.min(1, Math.abs(a - b) / 150) ** 0.8;

interface Fold {
  angles: number[];
  ys: number[];
  zs: number[];
}

/**
 * Z-fold geometry. Seams alternate mountain/valley, so each panel hangs off the
 * bottom edge of the one above it; the strip is laid out seam by seam and then
 * shifted so the panel in focus sits flat in the middle of the stage. `taut`
 * (0–1) pulls every fold a little flatter, as when the paper is stretched.
 */
function foldRibbon(
  travel: number,
  crease: number,
  shuts: number[],
  taut: number,
  count: number,
  h: number,
): Fold {
  const angles: number[] = [];
  const ys = [0];
  const zs = [0];
  for (let i = 0; i < count; i += 1) {
    const rest = foldAt(i - crease) * (1 - taut * 0.4);
    const magnitude = rest + (SHUT - rest) * shuts[i];
    const angle = (i % 2 === 0 ? 1 : -1) * magnitude;
    angles.push(angle);
    ys.push(ys[i] + h * Math.cos(angle * RAD));
    zs.push(zs[i] + h * Math.sin(angle * RAD));
  }
  const anchor = clamp(travel, 0, count - 1) + 0.5;
  const seam = Math.min(count - 1, Math.floor(anchor));
  const t = anchor - seam;
  const cy = ys[seam] + (ys[seam + 1] - ys[seam]) * t;
  const cz = zs[seam] + (zs[seam + 1] - zs[seam]) * t;
  return {
    angles,
    ys: ys.map((y) => y - cy),
    zs: zs.map((z) => z - cz),
  };
}

interface RibbonProps {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: keyof typeof RIBBON_HEIGHT;
  /** Index into `LOOP_CARDS`, so editors can bring a panel forward. */
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
  /** Fires once every card has been on top, so the viewer can offer what comes next. */
  onFinish?: () => void;
  /** Keeps the letter folded in its bundle, e.g. while the parcel is still opening over it. */
  held?: boolean;
  /** A received gift: once the letter has been read, a last fold offers to make one back. */
  cta?: boolean;
}

/** How long the finished letter is left alone before the last fold appears beneath it. */
const END_DELAY = 1800;
const END_LABEL = YOUR_TURN;

type FoldId = Artifact['id'] | 'end';

export const AccordionRibbon = memo(function AccordionRibbon(props: RibbonProps) {
  const { data, focusIndex } = props;
  const cards = stackCards(data, 'accordion');
  const key = cards.join('|');
  const artifacts = useMemo(
    () => getArtifacts(data, key.split('|') as Artifact['id'][]),
    [data, key],
  );
  const focused =
    focusIndex === undefined
      ? undefined
      : artifacts.findIndex((a) => a.id === LOOP_CARDS[focusIndex]);
  return (
    <Ribbon
      key={key}
      {...props}
      artifacts={artifacts}
      focusIndex={focused === undefined || focused < 0 ? undefined : focused}
    />
  );
});

const Ribbon = memo(function Ribbon({
  data,
  onChange: report,
  onFinish,
  size = 'hero',
  focusIndex,
  held = false,
  cta = false,
  artifacts,
}: RibbonProps & { artifacts: Artifact[] }) {
  const onChange = useProgress(artifacts.length, report, onFinish);
  /** The sender's folds; the "your turn" fold, once it's added, sits after them. */
  const count = artifacts.length;
  const [read, setRead] = useState(false);
  const [ending, setEnding] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const panels = count + (ending ? 1 : 0);
  const last = panels - 1;
  /** Motion transforms subscribe once, so they read the current length from here. */
  const geometry = useRef({ panels, last });
  geometry.current = { panels, last };
  const markRead = useCallback(() => setRead(true), []);
  useEffect(() => {
    if (!cta || !read || dismissed) return;
    const id = window.setTimeout(() => setEnding(true), END_DELAY);
    return () => window.clearTimeout(id);
  }, [cta, read, dismissed]);
  const reduce = Boolean(useReducedMotion());
  const coarse = useCoarsePointer();
  /** On storefront phones the page owns vertical swipes; everywhere else the ribbon scrolls itself. */
  const scrolly = size === 'fill' || !coarse;
  const stage = useRef<HTMLDivElement>(null);
  const visible = useInView(stage, { once: true, amount: 0.35 });
  const [box, setBox] = useState({ w: 340, h: 460 });
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  /** Recipients get a reading column: full-bleed on phones, up to 680px wide on desktop. */
  const fill = size === 'fill';
  const panelW = fill ? Math.min(box.w - 16, 680) : Math.min(box.w - 24, 360);
  const wide = panelW >= 520;
  const panelH = fill
    ? clamp(Math.round(Math.min(box.h * 0.62, panelW * (wide ? 0.8 : 1.15))), 240, 520)
    : clamp(Math.round(box.h * 0.56), 190, 320);
  const step = Math.round(panelH * SCROLL_PER_FOLD);

  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState(reduce);

  /** The stage is a real scroller: its scroll offset is the ribbon's position, in folds. */
  const { scrollY } = useScroll({ container: stage });
  const stepValue = useMotionValue(step);
  const halfStage = useMotionValue(box.h / 2);
  const height = useMotionValue(panelH);
  useEffect(() => {
    stepValue.set(step);
    halfStage.set(box.h / 2);
    height.set(panelH);
  }, [stepValue, halfStage, height, step, box.h, panelH]);
  const target = useTransform([scrollY, stepValue], ([y, s]: number[]) =>
    clamp(y / s, 0, geometry.current.last),
  );
  const travel = useSpring(target, reduce ? SNAPPY : TRAVEL);
  const crease = useSpring(target, reduce ? SNAPPY : CREASE);

  /** 0 = laid out, 1 = folded into a bundle; the cascade reads each panel's share off it. */
  const shut = useMotionValue(reduce ? 0 : 1);
  const closing = useRef(false);
  const cascade = useRef<AnimationPlaybackControls | null>(null);

  const stretchTarget = useMotionValue(0);
  const stretch = useSpring(stretchTarget, reduce ? SNAPPY : TENSION);

  const fold = useTransform(
    [travel, crease, shut, height, stretch],
    ([t, c, s, h, st]: number[]) => {
      const { panels: n, last: end } = geometry.current;
      return foldRibbon(
        t,
        c,
        Array.from({ length: n }, (_, i) => panelShut(s, i, end, closing.current)),
        Math.abs(st),
        n,
        h,
      );
    },
  );

  /** Pulled past either end, the sheet stretches from the edge being held. */
  const sheetY = useTransform(stretch, (s) => s * 28);
  const sheetScaleY = useTransform(stretch, (s) => 1 + Math.abs(s) * 0.05);
  const sheetOrigin = useTransform(
    [stretch, halfStage],
    ([s, half]: number[]) => `50% ${s < 0 ? half : -half}px`,
  );
  /** Once the last fold closes, the bundle turns to face the reader and shrinks to a folded card. */
  const bundleRotate = useTransform(shut, (s) => -SHUT * between(s, 0.62, 1));
  const bundleScale = useTransform(shut, (s) => 1 - 0.3 * between(s, 0.45, 1));
  const openness = useTransform(shut, (s) => 1 - s);

  const activeRef = useRef(0);
  useMotionValueEvent(target, 'change', (value) => {
    const next = clamp(Math.round(value), 0, last);
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    playMechanicalCue('click');
    if (!reduce) playFoley('flip', 0.35);
    if (next < count) onChange?.(next, artifacts[next].label);
  });

  const folded = useRef(reduce ? 0 : count);
  useMotionValueEvent(shut, 'change', (value) => {
    let n = 0;
    for (let i = 0; i < panels; i += 1)
      if (panelShut(value, i, last, closing.current) > 0.5) n += 1;
    if (n === folded.current) return;
    folded.current = n;
    if (!reduce) playFoley('tap', 0.22);
  });

  const goTo = (index: number, instant = false) => {
    stage.current?.scrollTo({
      top: clamp(Math.round(index), 0, last) * step,
      behavior: instant || reduce ? 'auto' : 'smooth',
    });
  };

  const setOpen = (value: boolean) => {
    cascade.current?.stop();
    closing.current = !value;
    setOpened(value);
    const to = value ? 0 : 1;
    if (reduce) {
      shut.set(to);
      return;
    }
    playFoley(value ? 'shuffle' : 'flip', 0.4);
    cascade.current = animate(shut, to, {
      duration: 0.15 + CASCADE_TIME * Math.abs(shut.get() - to),
      ease: [0.45, 0, 0.25, 1],
      onComplete: () => {
        if (!value) playFoley('thunk', 0.5);
      },
    });
  };
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  /** Unfurls, top fold first, the first time it scrolls into view. */
  useEffect(() => {
    if (!visible || reduce || held) return;
    const id = window.setTimeout(() => setOpenRef.current(true), 260);
    return () => window.clearTimeout(id);
  }, [visible, reduce, held]);

  useEffect(() => {
    if (focusIndex === undefined) return;
    goToRef.current(focusIndex, true);
    if (shut.get() > 0.01) setOpenRef.current(true);
  }, [focusIndex, shut]);

  /** A resize changes the fold pitch; keep the same panel under the reader. */
  useEffect(() => {
    if (stage.current) stage.current.scrollTop = activeRef.current * step;
  }, [step]);

  /** Rubber-band past the first or last fold, from wheel or touch. */
  useEffect(() => {
    const el = stage.current;
    if (!el || !scrolly) return;
    const atTop = () => el.scrollTop <= 0;
    const atEnd = () => el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
    let idle = 0;
    let wheelPull = 0;
    const onWheel = (event: WheelEvent) => {
      if (shut.get() > 0.5) return;
      const up = event.deltaY < 0;
      if (!((up && atTop()) || (!up && atEnd()))) return;
      wheelPull -= event.deltaY;
      stretchTarget.set(Math.sign(wheelPull) * rubber(Math.abs(wheelPull)));
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        wheelPull = 0;
        stretchTarget.set(0);
      }, 120);
    };

    let lastY = 0;
    let edge: 'top' | 'end' | null = null;
    let edgeY = 0;
    const onTouchStart = (event: TouchEvent) => {
      lastY = event.touches[0].clientY;
      edge = null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0].clientY;
      const down = y > lastY;
      lastY = y;
      if (shut.get() > 0.5) return;
      if (!edge) {
        if (down && atTop()) edge = 'top';
        else if (!down && atEnd()) edge = 'end';
        else return;
        edgeY = y;
        return;
      }
      const pull = edge === 'top' ? y - edgeY : edgeY - y;
      if (pull <= 0) {
        edge = null;
        stretchTarget.set(0);
        return;
      }
      stretchTarget.set((edge === 'top' ? 1 : -1) * rubber(pull));
    };
    const onTouchEnd = () => {
      edge = null;
      stretchTarget.set(0);
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      window.clearTimeout(idle);
    };
  }, [scrolly, shut, stretchTarget]);

  const panStart = useRef(0);
  const pannedAt = useRef(0);
  const resnap = useRef(0);

  const select = (index: number) => {
    if (performance.now() - pannedAt.current < 250) return;
    if (!opened) setOpen(true);
    else if (index !== active) goTo(index);
    else if (coarse) goTo(active === last ? 0 : active + 1);
  };
  const keepLooking = useCallback(() => {
    setDismissed(true);
    setEnding(false);
    goToRef.current(count - 1);
  }, [count]);
  const activeLabel = active < count ? artifacts[active].label : END_LABEL;
  const label =
    active < count ? `panel ${active + 1} of ${count}: ${activeLabel}` : `last fold: ${END_LABEL}`;

  const selectRef = useRef(select);
  selectRef.current = select;
  /** Stable identity, so the memoised panels skip re-rendering when `active` ticks over. */
  const selectPanel = useCallback((index: number) => selectRef.current(index), []);

  return (
    <section
      className={`relative isolate flex w-full flex-col items-center ${
        fill ? 'h-full max-w-[720px]' : 'max-w-[400px]'
      }`}
      aria-label="Accordion letter"
      aria-roledescription="folding ribbon"
    >
      <Aura open={openness} />

      <motion.div
        ref={stage}
        tabIndex={0}
        className={`accordion-stage relative w-full touch-pan-y select-none outline-none ${
          scrolly && opened ? 'accordion-stage--scroll' : ''
        } ${size === 'fill' ? 'overscroll-contain' : ''} ${RIBBON_HEIGHT[size]}`}
        onPanStart={
          coarse
            ? undefined
            : () => {
                const el = stage.current;
                if (!el) return;
                window.clearTimeout(resnap.current);
                el.style.scrollSnapType = 'none';
                panStart.current = el.scrollTop;
              }
        }
        onPan={
          coarse
            ? undefined
            : (_, info) => {
                const el = stage.current;
                if (!el || shut.get() > 0.5) return;
                const max = el.scrollHeight - el.clientHeight;
                const raw = panStart.current - info.offset.y;
                stretchTarget.set(raw < 0 ? rubber(-raw) : raw > max ? -rubber(raw - max) : 0);
                el.scrollTop = clamp(raw, 0, max);
              }
        }
        onPanEnd={
          coarse
            ? undefined
            : (_, info) => {
                const el = stage.current;
                pannedAt.current = performance.now();
                stretchTarget.set(0);
                if (!el) return;
                if (shut.get() > 0.5) {
                  el.style.scrollSnapType = '';
                  if (info.offset.y > 40) setOpen(true);
                  return;
                }
                goTo((el.scrollTop - info.velocity.y * 0.18) / step);
                resnap.current = window.setTimeout(() => {
                  el.style.scrollSnapType = '';
                }, 650);
              }
        }
        onKeyDown={(event) => {
          const keys: Record<string, number> = {
            ArrowDown: active + 1,
            PageDown: active + 1,
            ArrowUp: active - 1,
            PageUp: active - 1,
            Home: 0,
            End: last,
          };
          if (!(event.key in keys)) return;
          event.preventDefault();
          if (!opened) setOpen(true);
          goTo(keys[event.key]);
        }}
        aria-label={`Accordion letter, ${label}. ${
          coarse ? 'Swipe or tap a fold to unfold it.' : 'Scroll, drag or use arrow keys to unfold.'
        }`}
      >
        <div className="relative" style={{ height: box.h + last * step }}>
          {Array.from({ length: panels }, (_, index) => (
            <span
              key={index}
              aria-hidden
              className="accordion-snap"
              style={{ top: index * step, height: box.h }}
            />
          ))}
          <div className="accordion-camera sticky top-0" style={{ height: box.h }}>
            <motion.div
              className="absolute left-1/2 top-1/2"
              style={{
                width: panelW,
                marginLeft: -panelW / 2,
                transformStyle: 'preserve-3d',
                y: sheetY,
                scaleY: sheetScaleY,
                transformOrigin: sheetOrigin,
                willChange: 'transform',
              }}
            >
              <motion.div
                style={{
                  transformStyle: 'preserve-3d',
                  rotateX: bundleRotate,
                  scale: bundleScale,
                  willChange: 'transform',
                }}
              >
                {artifacts.map((artifact, index) => (
                  <RibbonPanel
                    key={artifact.id}
                    id={artifact.id}
                    index={index}
                    fold={fold}
                    height={panelH}
                    wide={wide}
                    data={data}
                    reading={artifact.id === 'letter' && opened && !held && active === index}
                    onRead={artifact.id === 'letter' ? markRead : undefined}
                    onSelect={selectPanel}
                  />
                ))}
                {ending ? (
                  <RibbonPanel
                    key="end"
                    id="end"
                    index={count}
                    fold={fold}
                    height={panelH}
                    wide={wide}
                    data={data}
                    onDismiss={keepLooking}
                    onSelect={selectPanel}
                  />
                ) : null}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 -mt-3 flex w-full flex-col items-center gap-2">
        <div
          className={`flex w-full items-center gap-4 ${wide ? 'justify-between' : 'justify-center'}`}
        >
          <p className="whitespace-nowrap font-receipt uppercase text-[#fde7d4]" aria-hidden>
            <span
              className={`tracking-[0.1em] ${wide ? 'text-[24px]' : 'text-[19px]'} text-[#fdba74]`}
            >
              {String(Math.min(active, count - 1) + 1).padStart(2, '0')}
            </span>
            <span className={`tracking-[0.1em] ${wide ? 'text-[24px]' : 'text-[19px]'}`}>
              {' '}
              / {String(count).padStart(2, '0')}
            </span>
            {wide && active < count ? null : (
              <span className="ml-3 text-[13px] tracking-[0.18em] text-[#e0b4c6]">
                {activeLabel}
              </span>
            )}
          </p>
          {wide ? (
            <ol aria-label="Folds" className="flex items-center gap-1">
              {artifacts.map((artifact, index) => (
                <li key={artifact.id}>
                  <button
                    type="button"
                    className="accordion-crumb"
                    aria-current={opened && index === active ? 'step' : undefined}
                    title={`Go to the ${artifact.label.toLowerCase()} fold`}
                    onClick={() => {
                      if (!opened) setOpen(true);
                      goTo(index);
                    }}
                  >
                    {artifact.label}
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        <div role="group" aria-label="Fold controls" className="flex items-center gap-1.5 sm:gap-2">
          <FoldButton
            label="Previous fold"
            short="Prev"
            icon="↑"
            full={wide}
            disabled={opened && active === 0}
            onClick={() => (opened ? goTo(active - 1) : setOpen(true))}
          />
          <FoldButton
            label={opened ? 'Close all folds' : 'Open the folds'}
            short={opened ? 'Close all' : 'Open'}
            full={wide}
            onClick={() => setOpen(!opened)}
          />
          <FoldButton
            label="Next fold"
            short="Next"
            icon="↓"
            iconAfter
            full={wide}
            disabled={opened && active === last}
            onClick={() => (opened ? goTo(active + 1) : setOpen(true))}
          />
        </div>
      </div>
      {coarse && size !== 'fill' ? (
        <p className="mt-2 font-receipt text-[10px] uppercase tracking-[0.18em] text-[#c99aae]">
          {!opened
            ? 'Tap to unfold'
            : scrolly
              ? 'Swipe through the folds'
              : 'Tap a fold to unfold it'}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {opened ? label : 'Ribbon folded shut'}
      </p>
    </section>
  );
});

const Aura = memo(function Aura({ open }: { open: MotionValue<number> }) {
  const opacity = useTransform(open, [0, 1], [0.45, 1]);
  const scale = useTransform(open, [0, 1], [0.82, 1]);
  return (
    <motion.div
      aria-hidden
      className="accordion-aura gpu-layer pointer-events-none absolute -inset-x-10 -top-6 bottom-4 -z-10"
      style={{ opacity, scale }}
    />
  );
});

const RibbonPanel = memo(function RibbonPanel({
  id,
  index,
  fold,
  height,
  wide,
  data,
  reading,
  onRead,
  onDismiss,
  onSelect,
}: {
  id: FoldId;
  index: number;
  fold: MotionValue<Fold>;
  height: number;
  wide: boolean;
  data: XsoData;
  reading?: boolean;
  onRead?: () => void;
  onDismiss?: () => void;
  onSelect: (index: number) => void;
}) {
  const y = useTransform(fold, (f) => f.ys[index]);
  const z = useTransform(fold, (f) => f.zs[index]);
  const rotateX = useTransform(fold, (f) => f.angles[index]);
  /** Light falls from above: panels tipped up catch it, panels tipped down sit in the crease's shadow. */
  const sheen = useTransform(rotateX, (a) => Math.max(0, Math.sin(a * RAD)) * 0.6);
  const shade = useTransform(rotateX, (a) => {
    const s = Math.sin(a * RAD);
    return Math.max(0, -s) * 0.62 + Math.abs(s) * 0.08;
  });
  const creaseTop = useTransform(fold, (f) =>
    index === 0 ? 0 : creaseDepth(f.angles[index - 1], f.angles[index]),
  );
  const creaseBottom = useTransform(fold, (f) =>
    index === f.angles.length - 1 ? 0 : creaseDepth(f.angles[index], f.angles[index + 1]),
  );

  return (
    <motion.div
      className="accordion-panel gpu-layer absolute inset-x-0 top-0"
      style={{
        height,
        y,
        z,
        rotateX,
        transformOrigin: '50% 0%',
        willChange: 'transform, opacity',
      }}
      onClick={() => onSelect(index)}
    >
      <div className={`accordion-panel__face ${wide ? 'accordion-panel__face--wide' : ''}`}>
        {id === 'end' ? (
          <YourTurn source="accordion_end" large={wide} onDismiss={onDismiss} />
        ) : (
          <PanelFace
            data={data}
            id={id}
            index={index}
            wide={wide}
            reading={reading}
            onRead={onRead}
          />
        )}
      </div>
      <span aria-hidden className="accordion-panel__grain" />
      {index > 0 ? (
        <>
          <span aria-hidden className="accordion-panel__seam" />
          {index % 2 === 1 ? (
            <span
              aria-hidden
              className={`accordion-tape ${index === 1 ? 'accordion-tape--left' : 'accordion-tape--right'}`}
            />
          ) : null}
        </>
      ) : null}
      <motion.span
        aria-hidden
        className="accordion-panel__light accordion-panel__light--sheen"
        style={{ opacity: sheen }}
      />
      <motion.span
        aria-hidden
        className="accordion-panel__light accordion-panel__light--shade"
        style={{ opacity: shade }}
      />
      <motion.span
        aria-hidden
        className="accordion-panel__crease accordion-panel__crease--top"
        style={{ opacity: creaseTop }}
      />
      <motion.span
        aria-hidden
        className="accordion-panel__crease accordion-panel__crease--bottom"
        style={{ opacity: creaseBottom }}
      />
    </motion.div>
  );
});

/** A plain, labelled control under the ribbon; short words on phones, with the full name as a tooltip. */
const FoldButton = memo(function FoldButton({
  label,
  short,
  icon,
  iconAfter = false,
  full,
  disabled,
  onClick,
}: {
  label: string;
  short: string;
  icon?: string;
  iconAfter?: boolean;
  full: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const glyph = icon ? <span aria-hidden>{icon}</span> : null;
  return (
    <button
      type="button"
      className={`accordion-control ${full ? 'accordion-control--full' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {iconAfter ? null : glyph}
      <span>{full ? label : short}</span>
      {iconAfter ? glyph : null}
    </button>
  );
});

/** Two type scales: the phone-sized ribbon, and the desktop reading column. */
const TYPE = {
  narrow: {
    label: 'text-[10px] tracking-[0.22em]',
    title: 'text-lg',
    body: 'text-[12px]',
    total: 'text-sm',
    hand: 'text-[18px]',
    audit: 'text-[11px]',
    bar: 'h-1.5',
    stamp: 'text-[10px] px-2 py-0.5',
    dear: 'text-2xl',
    letter: 'text-[19px]',
    signoff: 'text-xl',
    rows: 5,
  },
  wide: {
    label: 'text-[13px] tracking-[0.24em]',
    title: 'text-[30px]',
    body: 'text-[16px]',
    total: 'text-lg',
    hand: 'text-[24px]',
    audit: 'text-[14px]',
    bar: 'h-2.5',
    stamp: 'text-[15px] px-3 py-1',
    dear: 'text-[34px]',
    letter: 'text-[22px]',
    signoff: 'text-[28px]',
    rows: 8,
  },
};

const PRINT_TILT = [-3.5, 2, -1.5];
const CARD_PAPERS = ['#f8d5e1', '#f6cd85', '#d9e7d0'];

interface Print {
  src?: string;
  text?: string;
  paper?: string;
  caption: string;
}

/**
 * The sender's own photos, up to three. The theme's stand-in cards only show when nothing was
 * uploaded, and a gift with no photos at all gets plain paper cards written from the receipt.
 */
function printsOf(data: XsoData): Print[] {
  const uploaded = data.photos.filter((src) => src && !isPlaceholderPhoto(src));
  const photos = (uploaded.length ? uploaded : data.photos.filter(Boolean)).slice(0, 3);
  if (photos.length) {
    return photos.map((src, i) => ({ src, caption: photoCaption(data, i) }));
  }
  const year = `'${data.timestamp.split(' ')[0].slice(-2)} ♡`;
  const captions = [`${data.customerName} & ${data.billerName}`, data.occasion.toLowerCase(), year];
  return [0, 1, 2].map((i) => {
    const lore = data.lineItems[i]?.description.toLowerCase();
    return {
      text: lore ? `the ${lore} era` : 'one I keep coming back to',
      paper: CARD_PAPERS[i],
      caption: captions[i],
    };
  });
}

const FOLD_NAMES: Record<Artifact['id'], string> = {
  receipt: 'the receipt',
  audit: 'the audit',
  photos: 'the faces',
  letter: 'the note',
};

const PanelFace = memo(function PanelFace({
  data,
  id,
  index,
  wide,
  reading = false,
  onRead,
}: {
  data: XsoData;
  id: Artifact['id'];
  index: number;
  wide: boolean;
  /** The letter is the fold in focus, so it starts writing itself. */
  reading?: boolean;
  onRead?: () => void;
}) {
  const scope = useId();
  const t = wide ? TYPE.wide : TYPE.narrow;
  const label = (
    <p className={`font-receipt uppercase opacity-60 ${t.label}`}>
      Fold {String(index + 1).padStart(2, '0')} · {FOLD_NAMES[id]}
    </p>
  );
  if (id === 'receipt') {
    return (
      <div className={`xso-receipt flex h-full flex-col font-receipt leading-snug ${t.body}`}>
        {label}
        <p className={`mt-1.5 font-serif font-semibold leading-tight ${t.title}`}>
          {data.merchantName}
        </p>
        <p className={`uppercase opacity-60 ${t.label}`}>{data.timestamp}</p>
        <div className="my-2 border-t border-dashed border-current/40" />
        <div className={`min-h-0 flex-1 overflow-hidden ${wide ? 'space-y-1' : 'space-y-0.5'}`}>
          {data.lineItems.slice(0, t.rows).map((item) => (
            <p key={item.id} className="flex justify-between gap-3">
              <span className="truncate">
                {item.qty} {item.description}
              </span>
              <span className="shrink-0">{item.price}</span>
            </p>
          ))}
        </div>
        <p
          className={`mt-2 flex justify-between border-t border-dashed border-current/40 pt-1.5 font-bold ${t.total}`}
        >
          <span>Total</span>
          <span>{data.total}</span>
        </p>
        {data.accordion?.sentiment ? (
          <p className={`mt-1 truncate text-right font-hand leading-none text-[#b4234a] ${t.hand}`}>
            {data.accordion.sentiment}
          </p>
        ) : null}
      </div>
    );
  }
  if (id === 'audit') {
    return (
      <div className="flex h-full flex-col">
        {label}
        <p className={`mt-1.5 font-serif font-semibold leading-tight ${t.title}`}>
          {overallStars(data.auditMetrics).toFixed(1)} / 5 stars
        </p>
        <div
          className={`mt-2 min-h-0 flex-1 overflow-hidden ${wide ? 'space-y-2.5' : 'space-y-1.5'}`}
        >
          {Object.entries(data.auditMetrics).map(([key, score]) => (
            <div key={key}>
              <p
                className={`flex justify-between gap-2 font-receipt uppercase tracking-[0.14em] ${t.audit}`}
              >
                <span className="truncate">{auditLabel(data, key as keyof AuditMetrics)}</span>
                <strong>{score}</strong>
              </p>
              <div className={`mt-0.5 overflow-hidden rounded-full bg-[#2d1b22]/10 ${t.bar}`}>
                <div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-[#ec4899] to-[#fb923c]"
                  style={{ transform: `scaleX(${score / 100})` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p
          className={`mt-2 self-end -rotate-6 rounded border-2 border-[#b4234a]/70 font-receipt font-bold uppercase tracking-[0.18em] text-[#b4234a]/80 ${t.stamp}`}
        >
          {data.certifiedStampText}
        </p>
      </div>
    );
  }
  if (id === 'photos') {
    const prints = printsOf(data);
    const n = Math.max(1, prints.length);
    /** Caption strip plus the print's border, so the photo never pushes past the fold. */
    const chrome = wide ? 46 : 34;
    /** On a phone three prints overlap like a fanned hand, so each stays big enough to see. */
    const fan = !wide && n === 3;
    const across = fan ? 34 : Math.floor(92 / n);
    return (
      <div className="flex h-full flex-col">
        {label}
        <div
          className={`mt-2 flex min-h-0 flex-1 items-center justify-center ${fan ? '' : 'gap-[4%]'}`}
          style={{ containerType: 'size' }}
        >
          {prints.map((print, i) => (
            <figure
              key={i}
              className="flex shrink-0 flex-col bg-white p-[4%] pb-0 shadow-[0_2px_8px_rgba(45,27,34,0.2)]"
              style={{
                width: `min(${across}cqw, calc((100cqh - ${chrome}px) * 0.76))`,
                rotate: `${PRINT_TILT[i % PRINT_TILT.length]}deg`,
                marginInline: fan ? '-2cqw' : undefined,
                translate: fan && i === 1 ? '0 -4%' : undefined,
              }}
            >
              <div
                className="relative aspect-[4/5] w-full overflow-hidden"
                style={{ background: print.src ? '#2d1b22' : print.paper }}
              >
                {print.src ? (
                  <PolaroidThumb
                    id={`${scope}${i}`}
                    src={print.src}
                    alt={`Memory ${i + 1}`}
                    caption={print.caption}
                    rotate={PRINT_TILT[i % PRINT_TILT.length]}
                    className="absolute inset-0 h-full w-full"
                  >
                    <LazyMedia
                      src={print.src}
                      alt={`Memory ${i + 1}`}
                      fill
                      sizes={wide ? '220px' : '(max-width: 768px) 30vw, 120px'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </PolaroidThumb>
                ) : (
                  <p
                    className={`absolute inset-0 grid place-items-center p-[10%] text-center font-hand leading-tight text-[#3a2530] ${
                      wide ? 'text-[22px]' : 'text-[15px]'
                    }`}
                  >
                    {print.text}
                  </p>
                )}
              </div>
              <figcaption
                className={`truncate text-center font-hand leading-none text-[#3a2530] ${
                  wide ? 'py-2.5 text-[20px]' : 'py-1.5 text-[15px]'
                }`}
              >
                {print.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      {label}
      <p className={`mt-1.5 font-hand leading-none text-[#3a2530] ${t.dear}`}>
        Dear {data.customerName},
      </p>
      <LetterBody
        text={data.birthdayMessage}
        signoff={`— ${data.billerName}`}
        signoffClass={t.signoff}
        wide={wide}
        reading={reading}
        onRead={onRead}
      />
    </div>
  );
});

/** Seconds to write one line, and the breath taken before the sign-off. */
const LINE_TIME = 0.62;
const LAST_PAUSE = 0.9;

/**
 * The letter writes itself in line by line as it comes into focus: each word is inked left to
 * right, and the sign-off follows a short pause. It's sized to fit the fold (never below 20px
 * on desktop or 16px on phones) and scrolls inside the fold if it still doesn't. Tapping it
 * mid-way finishes it; with reduced motion it's simply there.
 */
const LetterBody = memo(function LetterBody({
  text,
  signoff,
  signoffClass,
  wide,
  reading,
  onRead,
}: {
  text: string;
  signoff: string;
  signoffClass: string;
  wide: boolean;
  reading: boolean;
  onRead?: () => void;
}) {
  const reduce = Boolean(useReducedMotion());
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(wide ? 22 : 19);
  const [lines, setLines] = useState<number[] | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [state, setState] = useState<'idle' | 'play' | 'done'>('idle');
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n+/)
        .map((p) => p.split(/\s+/).filter(Boolean))
        .filter((p) => p.length),
    [text],
  );

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const max = wide ? 22 : 19;
    const min = wide ? 20 : 16;
    const measure = () => {
      let next = max;
      el.style.fontSize = `${next}px`;
      while (next > min && el.scrollHeight > el.clientHeight + 1) {
        next -= 1;
        el.style.fontSize = `${next}px`;
      }
      setSize(next);
      setOverflows(el.scrollHeight > el.clientHeight + 1);
      let line = -1;
      let top = -Infinity;
      const out: number[] = [];
      el.querySelectorAll<HTMLElement>('[data-word]').forEach((word) => {
        if (word.offsetTop > top + 2) {
          line += 1;
          top = word.offsetTop;
        }
        out.push(line);
      });
      setLines(out);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [wide, paragraphs]);

  const timing = useMemo(() => {
    if (!lines) return null;
    const total = lines.length ? lines[lines.length - 1] + 1 : 0;
    const counts = new Array<number>(total).fill(0);
    lines.forEach((l) => (counts[l] += 1));
    const seen = new Array<number>(total).fill(0);
    const delays = lines.map((l) => {
      const k = seen[l]++;
      return l * LINE_TIME + (k / counts[l]) * LINE_TIME * 0.8;
    });
    return { delays, total, signoffAt: total * LINE_TIME + LAST_PAUSE };
  }, [lines]);

  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  const finish = useCallback(() => {
    setState('done');
    onReadRef.current?.();
  }, []);

  useEffect(() => {
    if (!reading || state !== 'idle' || !timing) return;
    if (reduce) return finish();
    setState('play');
  }, [reading, state, timing, reduce, finish]);

  /** While writing, keep the newest line in view when the letter is taller than its fold. */
  useEffect(() => {
    if (state !== 'play' || !timing) return;
    const el = box.current;
    const started = performance.now();
    const done = window.setTimeout(finish, (timing.signoffAt + 0.7) * 1000);
    const follow = window.setInterval(() => {
      if (!el || el.scrollHeight <= el.clientHeight + 1) return;
      const elapsed = (performance.now() - started) / 1000;
      const line = Math.min(timing.total, Math.floor(elapsed / LINE_TIME));
      const words = el.querySelectorAll<HTMLElement>('[data-word]');
      const index = lines?.findIndex((l) => l === line) ?? -1;
      const target = index >= 0 ? words[index] : el.lastElementChild;
      if (!(target instanceof HTMLElement)) return;
      const bottom = target.offsetTop + target.offsetHeight + 8;
      if (bottom > el.scrollTop + el.clientHeight) {
        el.scrollTo({ top: bottom - el.clientHeight, behavior: 'smooth' });
      }
    }, 250);
    return () => {
      window.clearTimeout(done);
      window.clearInterval(follow);
    };
  }, [state, timing, lines, finish]);

  let w = 0;
  return (
    <div
      ref={box}
      className={`accordion-letter letter--${state} mt-2 min-h-0 flex-1 overflow-y-auto font-hand leading-[1.22] text-[#3a2530] outline-none focus-visible:ring-2 focus-visible:ring-[#b4234a]/40`}
      style={{ fontSize: size }}
      tabIndex={overflows ? 0 : undefined}
      aria-label={overflows ? 'Letter (scrolls)' : undefined}
      onClick={(event) => {
        if (state !== 'play') return;
        event.stopPropagation();
        finish();
      }}
    >
      {paragraphs.map((words, p) => (
        <p key={p} className="mb-[0.45em]">
          {words.map((word) => {
            const i = w++;
            return (
              <span key={i}>
                <span
                  data-word
                  className="accordion-letter__word"
                  style={{ '--d': `${timing?.delays[i] ?? 0}s` } as CSSProperties}
                >
                  {word}
                </span>{' '}
              </span>
            );
          })}
        </p>
      ))}
      <p className={`mt-1 text-right leading-none text-[#b4234a] ${signoffClass}`}>
        <span
          className="accordion-letter__word"
          style={{ '--d': `${timing?.signoffAt ?? 0}s` } as CSSProperties}
        >
          {signoff}
        </span>
      </p>
    </div>
  );
});
