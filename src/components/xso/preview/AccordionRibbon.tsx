'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
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
import { LOOP_CARDS, type AuditMetrics, type XsoData } from '@/types/xso';
import { auditLabel } from '@/lib/formats';
import { stackCards } from '@/lib/formatCards';
import { playFoley } from '@/lib/foley';
import { useCoarsePointer } from '@/hooks/useTouchSpring';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { PolaroidThumb } from '@/components/xso/PolaroidThumb';
import { overallStars } from '@/components/xso/Side2Audit';
import { getArtifacts, playMechanicalCue, type Artifact } from '@/components/xso/viewers/shared';
import { useProgress } from '@/components/xso/stage/useProgress';

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

const TAB_PULL = 140;

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
}

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
  artifacts,
}: RibbonProps & { artifacts: Artifact[] }) {
  const onChange = useProgress(artifacts.length, report, onFinish);
  const count = artifacts.length;
  const last = count - 1;
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
  const panelW = Math.min(box.w - 24, 360);
  const panelH = clamp(Math.round(box.h * 0.56), 190, 320);
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
  const target = useTransform([scrollY, stepValue], ([y, s]: number[]) => clamp(y / s, 0, last));
  const travel = useSpring(target, reduce ? SNAPPY : TRAVEL);
  const crease = useSpring(target, reduce ? SNAPPY : CREASE);

  /** 0 = laid out, 1 = folded into a bundle; the cascade reads each panel's share off it. */
  const shut = useMotionValue(reduce ? 0 : 1);
  const closing = useRef(false);
  const cascade = useRef<AnimationPlaybackControls | null>(null);

  const stretchTarget = useMotionValue(0);
  const stretch = useSpring(stretchTarget, reduce ? SNAPPY : TENSION);

  const fold = useTransform([travel, crease, shut, height, stretch], ([t, c, s, h, st]: number[]) =>
    foldRibbon(
      t,
      c,
      artifacts.map((_, i) => panelShut(s, i, last, closing.current)),
      Math.abs(st),
      count,
      h,
    ),
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
    onChange?.(next, artifacts[next].label);
  });

  const folded = useRef(reduce ? 0 : count);
  useMotionValueEvent(shut, 'change', (value) => {
    let n = 0;
    for (let i = 0; i < count; i += 1) if (panelShut(value, i, last, closing.current) > 0.5) n += 1;
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
  const selectRef = useRef(select);
  selectRef.current = select;
  /** Stable identity, so the memoised panels skip re-rendering when `active` ticks over. */
  const selectPanel = useCallback((index: number) => selectRef.current(index), []);

  return (
    <section
      className={`relative isolate flex w-full max-w-[400px] flex-col items-center ${size === 'fill' ? 'h-full' : ''}`}
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
        aria-label={`Accordion letter, panel ${active + 1} of ${count}. ${
          coarse ? 'Swipe or tap a fold to unfold it.' : 'Scroll, drag or use arrow keys to unfold.'
        }`}
      >
        <div className="relative" style={{ height: box.h + last * step }}>
          {artifacts.map((artifact, index) => (
            <span
              key={artifact.id}
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
                    index={index}
                    fold={fold}
                    height={panelH}
                    data={data}
                    onSelect={selectPanel}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 -mt-3 flex w-full items-center justify-between gap-3">
        <p className="w-24 font-receipt text-[10px] uppercase tracking-[0.18em] text-[#e0b4c6]">
          {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          <span className="block truncate text-[#9a6a7e]">{artifacts[active].label}</span>
        </p>
        <PullTab
          opened={opened}
          reduce={reduce || coarse}
          shut={shut}
          onGrab={() => {
            cascade.current?.stop();
            closing.current = opened;
          }}
          onSet={setOpen}
        />
        <div className="flex w-24 justify-end gap-1.5">
          <button
            type="button"
            className="accordion-step"
            onClick={() => (opened ? goTo(active - 1) : setOpen(true))}
            disabled={opened && active === 0}
            aria-label="Previous fold"
          >
            ↑
          </button>
          <button
            type="button"
            className="accordion-step"
            onClick={() => (opened ? goTo(active + 1) : setOpen(true))}
            disabled={opened && active === last}
            aria-label="Next fold"
          >
            ↓
          </button>
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
        {opened
          ? `Panel ${active + 1} of ${count}: ${artifacts[active].label}`
          : 'Ribbon folded shut'}
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
  index,
  fold,
  height,
  data,
  onSelect,
}: {
  index: number;
  fold: MotionValue<Fold>;
  height: number;
  data: XsoData;
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
      <div className="accordion-panel__face">
        <PanelFace data={data} index={index} />
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

/** Stitched ribbon handle: pull down to let the letter unfurl, push up to fold it away. */
const PullTab = memo(function PullTab({
  opened,
  reduce,
  shut,
  onGrab,
  onSet,
}: {
  opened: boolean;
  reduce: boolean;
  shut: MotionValue<number>;
  onGrab: () => void;
  onSet: (open: boolean) => void;
}) {
  const start = useRef(0);
  const draggedAt = useRef(0);
  return (
    <motion.button
      type="button"
      className={`accordion-tab gpu-layer ${reduce ? 'touch-manipulation' : 'touch-none'}`}
      drag={reduce ? false : 'y'}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.45}
      dragSnapToOrigin
      onDragStart={() => {
        onGrab();
        start.current = shut.get();
      }}
      onDrag={(_, info) => {
        shut.set(clamp(start.current - info.offset.y / TAB_PULL, 0, 1));
      }}
      onDragEnd={(_, info) => {
        draggedAt.current = performance.now();
        const projected = shut.get() - (info.velocity.y / TAB_PULL) * 0.15;
        onSet(projected < 0.5);
      }}
      onClick={() => {
        if (performance.now() - draggedAt.current < 250) return;
        onSet(!opened);
      }}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      aria-expanded={opened}
      aria-label={opened ? 'Fold the letter away' : 'Pull the letter open'}
    >
      <span aria-hidden className="accordion-tab__ribbon" />
      <span className="accordion-tab__label">{opened ? 'Fold away' : 'Pull open'}</span>
    </motion.button>
  );
});

const PanelFace = memo(function PanelFace({ data, index }: { data: XsoData; index: number }) {
  const scope = useId();
  if (index === 0) {
    return (
      <div className="xso-receipt flex h-full flex-col font-receipt text-[11px] leading-snug">
        <p className="text-[9px] uppercase tracking-[0.24em] opacity-60">Fold 01 · the receipt</p>
        <p className="mt-1.5 font-serif text-lg font-semibold leading-tight">{data.merchantName}</p>
        <p className="text-[9px] uppercase tracking-[0.16em] opacity-60">{data.timestamp}</p>
        <div className="my-2 border-t border-dashed border-current/40" />
        <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
          {data.lineItems.slice(0, 5).map((item) => (
            <p key={item.id} className="flex justify-between gap-3">
              <span className="truncate">
                {item.qty} {item.description}
              </span>
              <span className="shrink-0">{item.price}</span>
            </p>
          ))}
        </div>
        <p className="mt-2 flex justify-between border-t border-dashed border-current/40 pt-1.5 text-sm font-bold">
          <span>Total</span>
          <span>{data.total}</span>
        </p>
        {data.accordion?.sentiment ? (
          <p className="mt-1 truncate text-right font-hand text-[17px] leading-none text-[#b4234a]">
            {data.accordion.sentiment}
          </p>
        ) : null}
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="flex h-full flex-col">
        <p className="font-receipt text-[9px] uppercase tracking-[0.24em] opacity-60">
          Fold 02 · the audit
        </p>
        <p className="mt-1.5 font-serif text-lg font-semibold leading-tight">
          {overallStars(data.auditMetrics).toFixed(1)} / 5 stars
        </p>
        <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-hidden">
          {Object.entries(data.auditMetrics).map(([key, score]) => (
            <div key={key}>
              <p className="flex justify-between gap-2 font-receipt text-[9px] uppercase tracking-[0.14em]">
                <span className="truncate">{auditLabel(data, key as keyof AuditMetrics)}</span>
                <strong>{score}</strong>
              </p>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[#2d1b22]/10">
                <div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-[#ec4899] to-[#fb923c]"
                  style={{ transform: `scaleX(${score / 100})` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 self-end -rotate-6 rounded border-2 border-[#b4234a]/70 px-2 py-0.5 font-receipt text-[9px] font-bold uppercase tracking-[0.18em] text-[#b4234a]/80">
          {data.certifiedStampText}
        </p>
      </div>
    );
  }
  if (index === 2) {
    const photos = data.photos.slice(0, 3);
    return (
      <div className="flex h-full flex-col">
        <p className="font-receipt text-[9px] uppercase tracking-[0.24em] opacity-60">
          Fold 03 · the faces
        </p>
        <div className="mt-2 grid min-h-0 flex-1 grid-cols-3 items-center gap-2">
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              className="bg-white p-1 pb-4 shadow-[0_2px_6px_rgba(45,27,34,0.18)]"
              style={{ transform: `rotate(${[-4, 2, -1][slot]}deg)` }}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#2d1b22]">
                {photos[slot] ? (
                  <PolaroidThumb
                    id={`${scope}${slot}`}
                    src={photos[slot]}
                    alt={`Memory ${slot + 1}`}
                    caption={slot === 0 ? `${data.customerName} & ${data.billerName}` : undefined}
                    rotate={[-4, 2, -1][slot]}
                    className="absolute inset-0 h-full w-full"
                  >
                    <LazyMedia
                      src={photos[slot]}
                      alt={`Memory ${slot + 1}`}
                      fill
                      sizes="110px"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </PolaroidThumb>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <p className="font-receipt text-[9px] uppercase tracking-[0.24em] opacity-60">
        Fold 04 · the note
      </p>
      <p className="mt-1.5 font-hand text-2xl leading-none text-[#3a2530]">
        Dear {data.customerName},
      </p>
      <p className="accordion-letter mt-2 min-h-0 flex-1 overflow-hidden font-hand text-[19px] leading-[1.15] text-[#3a2530]">
        {data.birthdayMessage}
      </p>
      <p className="mt-1 self-end font-hand text-xl leading-none text-[#b4234a]">
        — {data.billerName}
      </p>
    </div>
  );
});
