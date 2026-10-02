'use client';

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { LOOP_CARDS, type AuditMetrics, type XsoData } from '@/types/xso';
import { auditLabel } from '@/lib/formats';
import { stackCards } from '@/lib/formatCards';
import { playFoley } from '@/lib/foley';
import { useCoarsePointer } from '@/hooks/useTouchSpring';
import { SOFT_SPRING_VALUE } from '@/lib/motion';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { overallStars } from '@/components/xso/Side2Audit';
import {
  getArtifacts,
  playMechanicalCue,
  type Artifact,
} from '@/components/xso/viewers/shared';

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

/** Ribbon travel: glides between panels and settles without wobble. */
const TRAVEL = SOFT_SPRING_VALUE;
/** Folds lag the travel a touch and overshoot slightly, like paper settling. */
const CREASE = { stiffness: 70, damping: 15, mass: 1.2 };
const SNAPPY = { stiffness: 1000, damping: 100 };

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

interface Fold {
  angles: number[];
  ys: number[];
  zs: number[];
}

/**
 * Z-fold geometry. Seams alternate mountain/valley, so each panel hangs off the
 * bottom edge of the one above it; the strip is laid out seam by seam and then
 * shifted so the panel in focus sits flat in the middle of the stage.
 */
function foldRibbon(travel: number, crease: number, open: number, count: number, h: number): Fold {
  const angles: number[] = [];
  const ys = [0];
  const zs = [0];
  for (let i = 0; i < count; i += 1) {
    const magnitude = SHUT + (foldAt(i - crease) - SHUT) * open;
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

function Ribbon({
  data,
  onChange,
  size = 'hero',
  focusIndex,
  artifacts,
}: RibbonProps & { artifacts: Artifact[] }) {
  const count = artifacts.length;
  const last = count - 1;
  const reduce = Boolean(useReducedMotion());
  const coarse = useCoarsePointer();
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

  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState(reduce);

  /** Targets: gestures write here and the springs below carry the paper there. */
  const target = useMotionValue(0);
  const openTarget = useMotionValue(reduce ? 1 : 0);
  const travel = useSpring(target, reduce ? SNAPPY : TRAVEL);
  const crease = useSpring(target, reduce ? SNAPPY : CREASE);
  const open = useSpring(openTarget, reduce ? SNAPPY : CREASE);
  const height = useMotionValue(panelH);
  useEffect(() => height.set(panelH), [height, panelH]);

  const fold = useTransform([travel, crease, open, height], ([t, c, o, h]: number[]) =>
    foldRibbon(t, c, o, count, h),
  );

  /** Unfurls the first time it scrolls into view. */
  useEffect(() => {
    if (!visible || reduce) return;
    const id = window.setTimeout(() => {
      openTarget.set(1);
      setOpened(true);
      playFoley('shuffle', 0.4);
    }, 260);
    return () => window.clearTimeout(id);
  }, [visible, reduce, openTarget]);

  const activeRef = useRef(active);
  const settle = (index: number) => {
    const next = clamp(Math.round(index), 0, last);
    target.set(next);
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    playMechanicalCue('click');
    if (!reduce) playFoley('flip', 0.35);
    onChange?.(next, artifacts[next].label);
  };

  const setOpen = (value: boolean) => {
    openTarget.set(value ? 1 : 0);
    setOpened(value);
    if (!reduce) playFoley(value ? 'shuffle' : 'thunk', 0.4);
  };

  useEffect(() => {
    if (focusIndex === undefined) return;
    const next = clamp(focusIndex, 0, last);
    activeRef.current = next;
    setActive(next);
    target.set(next);
    openTarget.set(1);
    setOpened(true);
  }, [focusIndex, last, target, openTarget]);

  /** Wheel/trackpad scrubs the ribbon, then lets the page scroll once it runs out of paper. */
  const settleRef = useRef(settle);
  settleRef.current = settle;
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let idle = 0;
    const onWheel = (event: WheelEvent) => {
      const now = target.get();
      const atEnd = (now <= 0 && event.deltaY < 0) || (now >= last && event.deltaY > 0);
      if (atEnd || openTarget.get() < 0.5) return;
      event.preventDefault();
      target.set(clamp(now + event.deltaY / (height.get() * 1.4), -0.2, last + 0.2));
      window.clearTimeout(idle);
      idle = window.setTimeout(() => settleRef.current(target.get()), 140);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(idle);
    };
  }, [target, openTarget, height, last]);

  const panStart = useRef(0);
  const pannedAt = useRef(0);

  return (
    <section
      className={`relative isolate flex w-full max-w-[400px] flex-col items-center ${size === 'fill' ? 'h-full' : ''}`}
      aria-label="Accordion letter"
      aria-roledescription="folding ribbon"
    >
      <Aura open={open} />

      <motion.div
        ref={stage}
        tabIndex={0}
        className={`accordion-stage relative w-full select-none outline-none ${
          coarse ? 'touch-pan-y' : 'touch-none'
        } ${RIBBON_HEIGHT[size]}`}
        onPanStart={
          coarse
            ? undefined
            : () => {
                panStart.current = target.get();
              }
        }
        onPan={
          coarse
            ? undefined
            : (_, info) => {
                if (openTarget.get() < 0.5) return;
                const raw = panStart.current - info.offset.y / (panelH * 0.8);
                const give = raw < 0 ? raw * 0.35 : raw > last ? last + (raw - last) * 0.35 : raw;
                target.set(give);
              }
        }
        onPanEnd={
          coarse
            ? undefined
            : (_, info) => {
                pannedAt.current = performance.now();
                if (openTarget.get() < 0.5) {
                  if (info.offset.y > 40) setOpen(true);
                  return;
                }
                settle(target.get() - (info.velocity.y / (panelH * 0.8)) * 0.18);
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
          settle(keys[event.key]);
        }}
        aria-label={`Accordion letter, panel ${active + 1} of ${count}. ${
          coarse ? 'Tap a fold to unfold it.' : 'Drag or use arrow keys to unfold.'
        }`}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: panelW,
            marginLeft: -panelW / 2,
            transformStyle: 'preserve-3d',
          }}
        >
          {artifacts.map((artifact, index) => (
            <RibbonPanel
              key={artifact.id}
              index={index}
              fold={fold}
              height={panelH}
              onSelect={() => {
                if (performance.now() - pannedAt.current < 250) return;
                if (!opened) setOpen(true);
                else if (index !== active) settle(index);
                else if (coarse) settle(active === last ? 0 : active + 1);
              }}
            >
              <PanelFace data={data} index={index} />
            </RibbonPanel>
          ))}
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
          openTarget={openTarget}
          onSet={setOpen}
        />
        <div className="flex w-24 justify-end gap-1.5">
          <button
            type="button"
            className="accordion-step"
            onClick={() => (opened ? settle(active - 1) : setOpen(true))}
            disabled={opened && active === 0}
            aria-label="Previous fold"
          >
            ↑
          </button>
          <button
            type="button"
            className="accordion-step"
            onClick={() => (opened ? settle(active + 1) : setOpen(true))}
            disabled={opened && active === last}
            aria-label="Next fold"
          >
            ↓
          </button>
        </div>
      </div>
      {coarse ? (
        <p className="mt-2 font-receipt text-[10px] uppercase tracking-[0.18em] text-[#c99aae]">
          {opened ? 'Tap a fold to unfold it' : 'Tap to unfold'}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {opened
          ? `Panel ${active + 1} of ${count}: ${artifacts[active].label}`
          : 'Ribbon folded shut'}
      </p>
    </section>
  );
}

function Aura({ open }: { open: MotionValue<number> }) {
  const opacity = useTransform(open, [0, 1], [0.45, 1]);
  const scale = useTransform(open, [0, 1], [0.82, 1]);
  return (
    <motion.div
      aria-hidden
      className="accordion-aura gpu-layer pointer-events-none absolute -inset-x-10 -top-6 bottom-4 -z-10"
      style={{ opacity, scale }}
    />
  );
}

function RibbonPanel({
  index,
  fold,
  height,
  onSelect,
  children,
}: {
  index: number;
  fold: MotionValue<Fold>;
  height: number;
  onSelect: () => void;
  children: ReactNode;
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

  return (
    <motion.div
      className="accordion-panel gpu-layer absolute inset-x-0 top-0"
      style={{ height, y, z, rotateX, transformOrigin: '50% 0%' }}
      onClick={onSelect}
    >
      <div className="accordion-panel__face">{children}</div>
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
    </motion.div>
  );
}

/** Stitched ribbon handle: pull down to let the letter unfurl, push up to fold it away. */
function PullTab({
  opened,
  reduce,
  openTarget,
  onSet,
}: {
  opened: boolean;
  reduce: boolean;
  openTarget: MotionValue<number>;
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
        start.current = openTarget.get();
      }}
      onDrag={(_, info) => {
        openTarget.set(clamp(start.current + info.offset.y / TAB_PULL, 0, 1));
      }}
      onDragEnd={(_, info) => {
        draggedAt.current = performance.now();
        const projected = openTarget.get() + (info.velocity.y / TAB_PULL) * 0.15;
        onSet(projected > 0.5);
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
}

const PanelFace = memo(function PanelFace({ data, index }: { data: XsoData; index: number }) {
  if (index === 0) {
    return (
      <div className="flex h-full flex-col font-receipt text-[11px] leading-snug">
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
                  <LazyMedia
                    src={photos[slot]}
                    alt={`Memory ${slot + 1}`}
                    fill
                    sizes="110px"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <p className="absolute inset-0 grid place-items-center font-hand text-sm text-[#faf6f0]/70">
                    photo
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1 text-center font-hand text-lg leading-none text-[#3a2530]">
          us, in every era
        </p>
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
