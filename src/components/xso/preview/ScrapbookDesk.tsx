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
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import type { ScrapbookLayers, XsoData } from '@/types/xso';
import { playFoley } from '@/lib/foley';
import { playSfx } from '@/lib/sfx';
import { STICKY_COLORS, resolveScrapbook } from '@/lib/scrapbook';
import { useCoarsePointer, useTouchSpring } from '@/hooks/useTouchSpring';
import { SOFT_SPRING } from '@/lib/motion';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { overallStars } from '@/components/xso/Side2Audit';
import { seededOffset } from '@/components/xso/viewers/shared';
import { usePolaroidStore, type PolaroidBack } from '@/store/usePolaroidStore';
import { preloadLightbox } from '@/components/xso/PolaroidLightboxHost';
import { usePauseOffscreen } from '@/hooks/usePauseOffscreen';

const PICK_UP = { type: 'spring' as const, stiffness: 300, damping: 25 };
/** Slow and a little floaty, like sliding paper across felt. */
const TIDY_SPRING = { type: 'spring' as const, stiffness: 90, damping: 15, mass: 1.1 };
/** Lifted off the desk: quick, with a little overshoot, like a hand picking up paper. */
const FOCUS_SPRING = { type: 'spring' as const, stiffness: 240, damping: 21, mass: 0.9 };
/** Set back down: slower and settled, so it lands in its spot instead of snapping there. */
const PUT_BACK_SPRING = { type: 'spring' as const, stiffness: 160, damping: 24, mass: 1 };
const INSTANT = { duration: 0 };
/** Presses on these stay with the control instead of picking the item up. */
const INTERACTIVE = 'button, a, input, audio, [data-no-drag]';

const MEMORY_LABELS = ['Receipt', 'Audit', 'Photos', 'Letter'];

type ItemKind = 'receipt' | 'polaroid' | 'card' | 'sticky' | 'ticket' | 'letter' | 'voice';

interface DeskItemSpec {
  id: string;
  kind: ItemKind;
  /** Which of the four memories this artifact belongs to (receipt, audit, photos, letter). */
  memory: number;
  left: string;
  top: string;
  width: string;
  tilt: number;
  photo?: { src: string; index: number };
}

/** A loose flat-lay: everything overlaps a little, nothing sits square. */
const LAYOUT: Record<string, Omit<DeskItemSpec, 'id' | 'kind' | 'memory' | 'photo'>> = {
  receipt: { left: '3%', top: '4%', width: '46%', tilt: -6 },
  'polaroid-0': { left: '53%', top: '3%', width: '40%', tilt: 7 },
  'polaroid-1': { left: '57%', top: '37%', width: '36%', tilt: -3 },
  'polaroid-2': { left: '31%', top: '29%', width: '32%', tilt: 5 },
  sticky: { left: '5%', top: '49%', width: '40%', tilt: 4 },
  letter: { left: '47%', top: '67%', width: '40%', tilt: -5 },
  ticket: { left: '5%', top: '81%', width: '47%', tilt: 8 },
  voice: { left: '26%', top: '63%', width: '38%', tilt: -7 },
};

const DESK_HEIGHT = {
  hero: 'scrap-desk--hero',
  studio: 'scrap-desk--studio',
  fill: 'min-h-0 flex-1',
};

type Orientation = 'portrait' | 'landscape';
/** The studio's fixed-height desk keeps its hand-placed spots; the recipient's desk is laid out. */
type Composition = Orientation | 'studio';

/** The recipient's desk is composed at one of these sizes, then scaled to fill the screen. */
const DESIGN: Record<Orientation, { width: number; height: number }> = {
  portrait: { width: 380, height: 680 },
  landscape: { width: 900, height: 560 },
};
/** Kept clear above (the viewer's sound and Make one back) and below (the desk toolbar). */
const FILL_BANDS = { top: 56, bottom: 64 };

/** Landscape widths, as a share of the desk, so each piece reads at a glance. */
const WIDE_WIDTH: Record<ItemKind, number> = {
  receipt: 22,
  polaroid: 19,
  card: 19,
  sticky: 18,
  voice: 21,
  ticket: 23,
  letter: 22,
};
const TOP_ROW: ItemKind[] = ['receipt', 'polaroid', 'card'];
/** The letter comes last in reading order: bottom right. */
const BOTTOM_ROW: ItemKind[] = ['sticky', 'voice', 'ticket', 'letter'];
const ROW_TILT = [
  [-5, 6, -3, 5],
  [4, -6, 7, -4],
];
const ROW_DROP = [
  [0, 3, -1, 4],
  [2, -2, 3, 0],
];

/** Portrait widths, as a share of the desk. */
const TALL_WIDTH: Record<ItemKind, number> = {
  receipt: 47,
  polaroid: 41,
  card: 41,
  sticky: 41,
  voice: 45,
  ticket: 47,
  letter: 44,
};
const READING_ORDER: ItemKind[] = [
  'receipt',
  'polaroid',
  'card',
  'sticky',
  'voice',
  'ticket',
  'letter',
];

/** Rough height over width for each piece, to pack the phone layout without measuring. */
const ASPECT: Record<ItemKind, number> = {
  receipt: 1.3,
  polaroid: 1.45,
  card: 1.25,
  sticky: 1,
  voice: 0.45,
  ticket: 0.6,
  letter: 0.8,
};

/**
 * Two staggered columns down a phone, in reading order with the letter last. Each piece drops
 * into the shorter column; if everything can't fit, the gaps close up evenly rather than piling
 * the last pieces on top of each other.
 */
function spreadTall(items: DeskItemSpec[], jitter: (id: string, base: number) => number) {
  const { width: W, height: H } = DESIGN.portrait;
  const gap = 16;
  const ordered = READING_ORDER.flatMap((kind) => items.filter((item) => item.kind === kind));
  const columns = [10, 46];
  const raw = ordered.map((item) => {
    const width = TALL_WIDTH[item.kind];
    const col = columns[0] <= columns[1] ? 0 : 1;
    const top = columns[col];
    columns[col] += (width / 100) * W * ASPECT[item.kind] + gap;
    return { item, width, col, top };
  });
  const squeeze = Math.min(1, (H - 10) / (Math.max(...columns) - gap));
  const placed = new Map<string, DeskItemSpec>();
  raw.forEach(({ item, width, col, top }, i) =>
    placed.set(item.id, {
      ...item,
      left: `${col === 0 ? 4 : 96 - width}%`,
      top: `${((top * squeeze) / H) * 100}%`,
      width: `${width}%`,
      tilt: jitter(item.id, (col ? 5 : -4) * (i % 4 < 2 ? 1 : -1)),
    }),
  );
  return items.map((item) => placed.get(item.id) ?? item);
}

/** Two loose rows across a wide desk: photos along the top, notes and the letter below. */
function spreadWide(items: DeskItemSpec[], jitter: (id: string, base: number) => number) {
  const rows = [
    items.filter((item) => TOP_ROW.includes(item.kind)),
    BOTTOM_ROW.flatMap((kind) => items.filter((item) => item.kind === kind)),
  ];
  const placed = new Map<string, DeskItemSpec>();
  rows.forEach((row, r) =>
    row.forEach((item, i) => {
      const width = WIDE_WIDTH[item.kind];
      const slot = 94 / row.length;
      const centre = 3 + slot * (i + 0.5);
      placed.set(item.id, {
        ...item,
        left: `${centre - width / 2}%`,
        top: `${(r === 0 ? 4 : 60) + ROW_DROP[r][i % 4]}%`,
        width: `${width}%`,
        tilt: jitter(item.id, ROW_TILT[r][i % 4]),
      });
    }),
  );
  return items.map((item) => placed.get(item.id) ?? item);
}

function buildItems(
  data: XsoData,
  layers: ScrapbookLayers,
  quiet: boolean,
  composition: Composition,
): DeskItemSpec[] {
  const on = new Set(layers.elements);
  const photos = data.photos.filter(Boolean).slice(0, 3);
  const jitter = (id: string, base: number) =>
    Math.max(-6, Math.min(8, base + seededOffset(data.id || 'xso', id.length * 7 + base, 1.5)));
  const at = (
    id: string,
    kind: ItemKind,
    memory: number,
    extra?: Partial<DeskItemSpec>,
    spotId = id,
  ) => {
    const spot = LAYOUT[spotId];
    return { id, kind, memory, ...spot, tilt: jitter(id, spot.tilt), ...extra };
  };
  const items: DeskItemSpec[] = [];
  if (on.has('receipt')) items.push(at('receipt', 'receipt', 0));
  if (on.has('polaroids')) {
    if (photos.length || !quiet) {
      (photos.length ? photos : ['']).forEach((src, index) =>
        items.push(at(`polaroid-${index}`, 'polaroid', 2, { photo: { src, index } })),
      );
    } else {
      /** No uploads: two handwritten memory cards take the photos' place on the desk. */
      [0, 1].forEach((index) =>
        items.push(
          at(`card-${index}`, 'card', 2, { photo: { src: '', index } }, `polaroid-${index}`),
        ),
      );
    }
  }
  if (on.has('sticky')) items.push(at('sticky', 'sticky', 1));
  if (on.has('ticket')) items.push(at('ticket', 'ticket', 3));
  if (on.has('voice')) {
    items.push(at('voice', 'voice', 3, undefined, on.has('ticket') ? 'voice' : 'ticket'));
  }
  if (on.has('letter')) items.push(at('letter', 'letter', 3));
  if (composition === 'landscape') return spreadWide(items, jitter);
  if (composition === 'portrait') return spreadTall(items, jitter);
  return items;
}

interface Place {
  left: string;
  top: string;
  rotate: number;
  order: number;
}

/** Two loose, overlapping columns; an odd one out sits centred on the last row. */
function tidyPlaces(items: DeskItemSpec[]): Record<string, Place> {
  const rows = Math.ceil(items.length / 2);
  const rowStep = rows > 1 ? 58 / (rows - 1) : 0;
  return Object.fromEntries(
    items.map((item, order) => {
      const row = Math.floor(order / 2);
      const col = order % 2;
      const width = parseFloat(item.width);
      const alone = col === 0 && order === items.length - 1;
      const left = alone ? 50 - width / 2 : col === 0 ? 4 : 96 - width;
      const top = 3 + row * rowStep + col * 3;
      return [item.id, { left: `${left}%`, top: `${top}%`, rotate: order % 2 ? 2.5 : -2.5, order }];
    }),
  );
}

interface Focus {
  id: string;
  x: number;
  y: number;
  rotate: number;
  width: number;
  scale: number;
}

export const ScrapbookDesk = memo(function ScrapbookDesk({
  data,
  size = 'hero',
  focusIndex,
  onChange,
  chrome = true,
  onFinish,
}: {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: keyof typeof DESK_HEIGHT;
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
  /** Hides the tidy-up row, for thumbnails. */
  chrome?: boolean;
  /** Fires the first time the letter is folded back up: the end of the desk. */
  onFinish?: () => void;
}) {
  const desk = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});
  const layers = useMemo(() => resolveScrapbook(data), [data]);
  /** The recipient's desk carries no gesture hints or instructions, only the pieces. */
  const quiet = size === 'fill';
  const fill = size === 'fill';
  const [fit, setFit] = useState<{ orientation: Orientation; scale: number } | null>(null);
  const orientation = fit?.orientation ?? 'portrait';
  const design = DESIGN[orientation];
  const items = useMemo(
    () => buildItems(data, layers, quiet, fill ? orientation : 'studio'),
    [data, layers, quiet, fill, orientation],
  );

  /** Picks the composition that suits the space, then scales it to fill without cropping. */
  useLayoutEffect(() => {
    const node = area.current;
    if (!fill || !node) return;
    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      if (!width || !height) return;
      const next: Orientation = width / height >= 1.05 ? 'landscape' : 'portrait';
      const box = DESIGN[next];
      const scale = Math.min(width / box.width, height / box.height, 1.9);
      setFit((current) =>
        current?.orientation === next && Math.abs(current.scale - scale) < 0.005
          ? current
          : { orientation: next, scale },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fill]);
  const reduce = Boolean(useReducedMotion());
  const coarse = useCoarsePointer();
  /** Touch dragging would trap page scrolls on the storefront, so only the full-screen desk gets it. */
  const tactile = !coarse || size === 'fill';
  const [stack, setStack] = useState<string[]>(() => items.map((item) => item.id));
  const [tidied, setTidied] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [peel, setPeel] = useState<0 | 1 | 2>(0);
  const [torn, setTorn] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [seal, setSeal] = useState<SealState>('whole');
  const [focus, setFocus] = useState<Focus | null>(null);
  /** The desk copy stays hidden until the focused copy has landed back on it. */
  const [lifted, setLifted] = useState<string | null>(null);
  const tidy = useMemo(() => tidyPlaces(items), [items]);

  /** Pieces present on first paint settle in place; ones checked later drop onto the desk. */
  const seen = useRef<Set<string> | null>(null);
  if (!seen.current) seen.current = new Set(items.map((item) => item.id));
  useEffect(() => {
    items.forEach((item) => seen.current!.add(item.id));
    setStack((current) => {
      const ids = items.map((item) => item.id);
      const kept = current.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !current.includes(id));
      return added.length || kept.length !== current.length ? [...kept, ...added] : current;
    });
  }, [items]);

  const bringForward = (ids: string[]) =>
    setStack((current) => [...current.filter((id) => !ids.includes(id)), ...ids]);

  useEffect(() => {
    if (focusIndex === undefined) return;
    bringForward(items.filter((item) => item.memory === focusIndex).map((item) => item.id));
  }, [focusIndex, items]);

  const pickUp = (item: DeskItemSpec) => {
    if (stack[stack.length - 1] !== item.id) bringForward([item.id]);
    onChange?.(item.memory, MEMORY_LABELS[item.memory]);
  };

  const tidyUp = () => {
    playFoley('shuffle', 0.6);
    setTidied((on) => !on);
    setResetKey((n) => n + 1);
    setStack(items.map((item) => item.id));
    setPeel(0);
  };

  const placeOf = (item: DeskItemSpec, order: number): Place =>
    tidied ? tidy[item.id] : { left: item.left, top: item.top, rotate: item.tilt, order };

  const openFocus = (item: DeskItemSpec, order: number) => {
    const node = nodes.current[item.id];
    const box = desk.current;
    if (!node || !box) return;
    const d = box.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    /** Rects are in screen pixels; the desk may itself be scaled down inside a preview. */
    const k = d.width / box.offsetWidth || 1;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    playSfx('paper-rustle', 0.6);
    setLifted(item.id);
    setFocus({
      id: item.id,
      x: (r.left + r.width / 2 - (d.left + d.width / 2)) / k,
      y: (r.top + r.height / 2 - (d.top + d.height / 2)) / k,
      rotate: placeOf(item, order).rotate,
      width,
      scale: Math.max(
        1,
        Math.min(
          (box.offsetWidth * 0.8) / width,
          (box.offsetHeight * (fill ? 0.76 : 0.6)) / height,
          2.6,
        ),
      ),
    });
  };

  const closeFocus = useCallback(() => {
    playFoley('land', 0.4);
    setFocus(null);
  }, []);

  const finish = useRef(onFinish);
  finish.current = onFinish;
  const closeLetter = useCallback(() => {
    playSfx('paper-rustle', 0.4);
    setLetterOpen(false);
    nodes.current.letter?.focus({ preventScroll: true });
    finish.current?.();
  }, []);

  const scope = useId();
  const openPolaroid = usePolaroidStore((state) => state.open);
  /** The desk print stays hidden while its enlarged copy is out in the lightbox. */
  const lightboxId = usePolaroidStore((state) => state.activePolaroidData?.id);
  const showPolaroid = (item: DeskItemSpec, order: number) => {
    const node = nodes.current[item.id];
    const box = desk.current;
    if (!node || !box || !item.photo?.src) return;
    const r = node.getBoundingClientRect();
    const k = box.getBoundingClientRect().width / box.offsetWidth || 1;
    const { index, src } = item.photo;
    playSfx('polaroid-slide', 0.7);
    openPolaroid({
      id: `${scope}${item.id}`,
      src,
      alt: `Memory ${index + 1}`,
      caption: polaroidCaption(data, layers.polaroidCaption, index),
      back: polaroidBack(data, index),
      origin: {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        width: node.offsetWidth * k,
        rotate: placeOf(item, order).rotate,
      },
    });
  };
  const togglePeel = () => {
    playFoley('tap', 0.7);
    setPeel((p) => (p === 2 ? 0 : 2));
  };
  const tear = () => {
    playFoley('scratch', 0.8);
    setTorn(true);
  };

  const content = (item: DeskItemSpec): ReactNode => {
    switch (item.kind) {
      case 'receipt':
        return <MiniReceipt data={data} />;
      case 'polaroid':
        return (
          <Polaroid
            photo={item.photo!}
            caption={polaroidCaption(data, layers.polaroidCaption, item.photo!.index)}
          />
        );
      case 'card':
        return <MemoryCard data={data} index={item.photo!.index} />;
      case 'sticky':
        return (
          <StickyNote
            data={data}
            secret={layers.secretNote}
            paper={STICKY_COLORS[layers.stickyColor].paper}
            peel={peel}
            reduce={reduce}
          />
        );
      case 'ticket':
        return <TicketStub data={data} layers={layers} torn={torn} reduce={reduce} />;
      case 'voice':
        return <SongCard data={data} songUrl={layers.songUrl} />;
      case 'letter':
        return <FoldedLetter data={data} seal={seal} reduce={reduce} />;
    }
  };

  /** What tapping the enlarged piece does, and the line that invites it. */
  const focusAction = (item: DeskItemSpec): { run: () => void; hint: string } | null => {
    switch (item.kind) {
      case 'sticky':
        return {
          run: togglePeel,
          hint: peel === 2 ? 'Tap to press it back down' : 'Tap to peel the corner',
        };
      case 'ticket':
        return torn ? null : { run: tear, hint: 'Tap to tear along the dots' };
      default:
        return null;
    }
  };

  const LABELS: Record<ItemKind, (item: DeskItemSpec) => string> = {
    receipt: () => 'Receipt — look closer',
    polaroid: (item) => `Polaroid ${item.photo!.index + 1} — look closer`,
    card: (item) => `Memory card ${item.photo!.index + 1} — look closer`,
    sticky: () => 'Sticky note — look closer',
    ticket: () => 'Ticket stub — look closer',
    voice: () => 'Voice note and song — look closer',
    letter: () => `Folded letter for ${data.customerName} — unfold it`,
  };
  const focusedItem = focus ? items.find((item) => item.id === focus.id) : undefined;

  /** Per-piece props keep their identity across unrelated desk state, so memoised items skip renders. */
  const places = useMemo(
    () =>
      Object.fromEntries(
        items.map((item, order) => [
          item.id,
          tidied ? tidy[item.id] : { left: item.left, top: item.top, rotate: item.tilt, order },
        ]),
      ) as Record<string, Place>,
    [items, tidied, tidy],
  );
  const contents = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, content(item)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, data, layers, peel, torn, reduce, seal],
  );

  const latest = useRef({ items, pickUp, openFocus, showPolaroid, seal, reduce });
  latest.current = { items, pickUp, openFocus, showPolaroid, seal, reduce };
  const crack = useRef<number>();
  useEffect(() => () => window.clearTimeout(crack.current), []);
  const handlePickUp = useCallback((id: string) => {
    const item = latest.current.items.find((it) => it.id === id);
    if (!item) return;
    if (item.kind === 'polaroid') preloadLightbox();
    latest.current.pickUp(item);
  }, []);
  const handleActivate = useCallback((id: string) => {
    const { items: all, openFocus: open, showPolaroid: show } = latest.current;
    const order = all.findIndex((it) => it.id === id);
    if (order < 0) return;
    if (all[order].kind === 'polaroid') return show(all[order], order);
    if (all[order].kind !== 'letter') return open(all[order], order);
    const unfold = () => {
      playSfx('paper-rustle', 0.8);
      setLetterOpen(true);
    };
    if (latest.current.seal === 'cracking') return;
    if (latest.current.seal === 'broken' || latest.current.reduce) {
      setSeal('broken');
      return unfold();
    }
    playSfx('seal-crack', 0.9);
    setSeal('cracking');
    crack.current = window.setTimeout(() => {
      setSeal('broken');
      unfold();
    }, SEAL_CRACK_MS);
  }, []);
  const handleStickyHover = useCallback(
    (on: boolean) => setPeel((p) => (p === 2 ? 2 : on ? 1 : 0)),
    [],
  );
  const registerNode = useCallback((id: string, node: HTMLDivElement | null) => {
    nodes.current[id] = node;
  }, []);

  const deskNode = (
    <div
      ref={desk}
      className={
        fill
          ? 'relative isolate h-full w-full touch-pan-y'
          : `scrap-desk scrap-wood relative isolate w-full touch-pan-y ${DESK_HEIGHT[size]}`
      }
    >
      <CoffeeRing className="pointer-events-none absolute bottom-[6%] right-[4%] w-[30%] opacity-[0.16]" />

      {items.map((item) => (
        <DeskItem
          key={item.id}
          spec={item}
          place={places[item.id]}
          tidied={tidied}
          resetKey={resetKey}
          z={stack.indexOf(item.id) + 1}
          desk={desk}
          reduce={reduce}
          tactile={tactile}
          hidden={lifted === item.id || lightboxId === `${scope}${item.id}`}
          entering={!seen.current!.has(item.id)}
          onNode={registerNode}
          label={LABELS[item.kind](item)}
          hint={
            quiet
              ? undefined
              : item.kind === 'letter'
                ? coarse
                  ? 'Tap to unfold'
                  : 'Unfold letter'
                : coarse
                  ? 'Tap to look closer'
                  : 'Drag me · click to look'
          }
          onPickUp={handlePickUp}
          onHover={item.kind === 'sticky' ? handleStickyHover : undefined}
          onActivate={handleActivate}
        >
          {contents[item.id]}
        </DeskItem>
      ))}

      <AnimatePresence
        onExitComplete={() => {
          const id = lifted;
          setLifted(null);
          if (id) nodes.current[id]?.focus({ preventScroll: true });
        }}
      >
        {focus && focusedItem ? (
          <FocusView
            key={focus.id}
            focus={focus}
            label={LABELS[focusedItem.kind](focusedItem).replace(' — look closer', '')}
            action={focusAction(focusedItem)}
            quiet={quiet}
            reduce={reduce}
            onClose={closeFocus}
          >
            {contents[focusedItem.id]}
          </FocusView>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {letterOpen && layers.elements.includes('letter') ? (
          <OpenLetter
            key="letter"
            data={data}
            reduce={reduce}
            bodyMax={fill ? design.height * 0.42 : undefined}
            onClose={closeLetter}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
  const toolbar = chrome ? (
    <div
      className={`flex items-center gap-3 px-1 ${fill ? '' : 'mt-3'} ${quiet ? 'justify-end' : 'justify-between'}`}
    >
      {quiet ? null : (
        <p className="min-w-0 font-receipt text-[10px] uppercase leading-relaxed tracking-[0.16em] text-[#c99aae]">
          {tactile ? 'Drag anything · tap to look closer' : 'Tap anything to look closer'}
        </p>
      )}
      <button
        type="button"
        onClick={tidyUp}
        className="paper-button shrink-0 touch-manipulation"
        aria-label={tidied ? 'Scatter the desk again' : 'Tidy the desk into neat rows'}
      >
        {tidied ? 'Scatter' : 'Tidy up'}
      </button>
    </div>
  ) : null;

  if (!fill) {
    return (
      <section className="relative flex w-full max-w-[420px] flex-col" aria-label="Scrapbook desk">
        {deskNode}
        {toolbar}
      </section>
    );
  }

  return (
    <section className="relative h-full w-full" aria-label="Scrapbook desk">
      <div
        className="absolute inset-x-0 bottom-0 flex items-center px-4"
        style={{ height: FILL_BANDS.bottom }}
      >
        <div className="mx-auto w-full max-w-[900px]">{toolbar}</div>
      </div>
      <div
        ref={area}
        className="absolute inset-x-0 flex items-center justify-center"
        style={{ top: FILL_BANDS.top, bottom: FILL_BANDS.bottom }}
      >
        {fit ? (
          <MotionConfig transformPagePoint={(p) => ({ x: p.x / fit.scale, y: p.y / fit.scale })}>
            <div
              className="shrink-0"
              style={{
                width: design.width,
                height: design.height,
                transform: `scale(${fit.scale})`,
              }}
            >
              {deskNode}
            </div>
          </MotionConfig>
        ) : null}
      </div>
    </section>
  );
});

/** Picking a print up off the desk: it rises, straightens a touch and its shadow spreads. */
const settle = (p: Place & { reduce?: boolean }) => ({
  rotate: p.rotate,
  transition: p.reduce ? INSTANT : { default: PICK_UP, rotate: TIDY_SPRING },
});
/**
 * `scattered` and `tidy` resolve identically from the current place; switching
 * label is what makes Framer re-read it and glide the piece across the desk.
 */
const HANDLED: Variants = {
  scattered: (p: Place) => ({ scale: 1, ...settle(p) }),
  tidy: (p: Place) => ({ scale: 1, ...settle(p) }),
  hover: (p: Place) => ({ scale: 1.02, rotate: p.rotate }),
  lift: (p: Place) => ({ scale: 1.08, rotate: p.rotate * 0.5 }),
};
const LIFT_SHADOW: Variants = {
  scattered: { opacity: 0 },
  tidy: { opacity: 0 },
  hover: { opacity: 0.45 },
  lift: { opacity: 1 },
};
/** Tape catches more lamp light the closer it's held to it. */
const TAPE_LIGHT: Variants = {
  scattered: { opacity: 0.55 },
  tidy: { opacity: 0.55 },
  hover: { opacity: 0.65 },
  lift: { opacity: 0.85 },
};

const DeskItem = memo(function DeskItem({
  spec,
  place,
  tidied,
  resetKey,
  z,
  desk,
  reduce,
  tactile,
  hidden,
  entering,
  label,
  hint,
  onNode,
  onPickUp,
  onActivate,
  onHover,
  children,
}: {
  spec: DeskItemSpec;
  place: Place;
  tidied: boolean;
  /** Bumped by tidy/scatter: any hand-dragged offset glides back to zero. */
  resetKey: number;
  z: number;
  desk: RefObject<HTMLDivElement>;
  reduce: boolean;
  /** Free 2D dragging; off on the storefront for touch so the page can scroll. */
  tactile: boolean;
  hidden: boolean;
  entering: boolean;
  label: string;
  hint?: string;
  onNode: (id: string, node: HTMLDivElement | null) => void;
  onPickUp: (id: string) => void;
  onActivate: (id: string) => void;
  onHover?: (on: boolean) => void;
  children: ReactNode;
}) {
  const { id } = spec;
  const nodeRef = useCallback((node: HTMLDivElement | null) => onNode(id, node), [onNode, id]);
  const dragControls = useDragControls();
  const pickUp = useTouchSpring(PICK_UP);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  /** The click that trails a drag must not also open the piece. */
  const droppedAt = useRef(0);
  const [enter] = useState(entering);
  const firstReset = useRef(resetKey);

  useEffect(() => {
    if (resetKey === firstReset.current) return;
    const spring = reduce ? INSTANT : { ...TIDY_SPRING, delay: place.order * 0.045 };
    const moves = [animate(x, 0, spring), animate(y, 0, spring)];
    return () => moves.forEach((move) => move.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onPickUp(id);
    onActivate(id);
  };

  /**
   * Placement rides on a desk-sized layer, so its percent translate equals the old
   * left/top and tidy/scatter glides stay on the compositor.
   */
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 will-change-transform"
      style={{ zIndex: z }}
      initial={false}
      animate={{ x: place.left, y: place.top }}
      transition={reduce ? INSTANT : { ...TIDY_SPRING, delay: place.order * 0.045 }}
    >
      <motion.div
        ref={nodeRef}
        className={`desk-item gpu-layer group pointer-events-auto absolute left-0 top-0 select-none outline-none ${
          tactile ? 'touch-none' : 'touch-pan-y'
        }`}
        style={{
          x,
          y,
          width: spec.width,
          opacity: hidden ? 0 : 1,
          pointerEvents: hidden ? 'none' : undefined,
          willChange: 'transform, opacity',
        }}
        custom={{ ...place, reduce }}
        variants={HANDLED}
        initial={false}
        animate={tidied ? 'tidy' : 'scattered'}
        whileHover="hover"
        whileTap="lift"
        whileDrag="lift"
        transition={reduce ? INSTANT : pickUp}
        drag={tactile}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={desk}
        dragElastic={0.1}
        dragTransition={{ power: 0.18, timeConstant: 200 }}
        onPointerDown={(event) => {
          if (!tactile || (event.target as Element).closest(INTERACTIVE)) return;
          onPickUp(id);
          playFoley('tap', 0.35);
          dragControls.start(event);
        }}
        onDragEnd={() => {
          droppedAt.current = performance.now();
          playFoley('land', 0.45);
        }}
        onClick={(event) => {
          if ((event.target as Element).closest(INTERACTIVE)) return;
          if (!tactile) onPickUp(id);
          else if (performance.now() - droppedAt.current < 220) return;
          onActivate(id);
        }}
        onHoverStart={() => onHover?.(true)}
        onHoverEnd={() => onHover?.(false)}
        onKeyDown={onKeyDown}
        tabIndex={hidden ? -1 : 0}
        role="button"
        aria-label={label}
      >
        <motion.span aria-hidden className="desk-item__lift" variants={LIFT_SHADOW} />
        <div className={enter ? 'desk-enter' : undefined}>{children}</div>
        {hint ? (
          <span aria-hidden className="desk-hint">
            {hint}
          </span>
        ) : null}
      </motion.div>
    </motion.div>
  );
});

const Tape = memo(function Tape({
  style,
  className = '',
}: {
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <motion.span
      aria-hidden
      className={`desk-tape ${className}`}
      style={style}
      variants={TAPE_LIGHT}
    />
  );
});

const RECEIPT_LINES = 4;

const MiniReceipt = memo(function MiniReceipt({ data }: { data: XsoData }) {
  return (
    <article className="desk-paper desk-paper--receipt relative px-3 pb-4 pt-4 font-receipt text-[#2d1b22]">
      <Tape style={{ left: '30%', top: -9, transform: 'rotate(-4deg)' }} />
      <p className="text-center text-[12px] font-bold uppercase tracking-[0.12em]">
        {data.merchantName}
      </p>
      <p className="mt-0.5 text-center text-[9px] uppercase tracking-[0.18em] opacity-60">
        {data.timestamp}
      </p>
      <div className="my-2 border-t border-dashed border-[#2d1b22]/30" />
      <ul className="space-y-1 text-[10.5px] uppercase leading-tight">
        {data.lineItems.slice(0, RECEIPT_LINES).map((line) => (
          <li key={line.id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">
              {line.qty} {line.description}
            </span>
            <span className="shrink-0">{line.price}</span>
          </li>
        ))}
        {data.lineItems.length > RECEIPT_LINES ? (
          <li className="opacity-60">+ {data.lineItems.length - RECEIPT_LINES} more</li>
        ) : null}
      </ul>
      <div className="my-2 border-t border-dashed border-[#2d1b22]/30" />
      <p className="flex justify-between text-[12px] font-bold uppercase">
        <span>Total</span>
        <span>{data.total}</span>
      </p>
      <p className="mt-2 font-hand text-[17px] leading-none text-[#b4234a]">worth every cent ♡</p>
      <CoffeeRing className="pointer-events-none absolute -bottom-4 -right-5 w-[62%] opacity-[0.18]" />
    </article>
  );
});

const GLOSS: Variants = {
  scattered: { opacity: 0.22, x: '-12%' },
  tidy: { opacity: 0.22, x: '-12%' },
  hover: { opacity: 0.32, x: '0%' },
  lift: { opacity: 0.5, x: '14%' },
};

const BACK_NOTES = ['always remember this ♡', 'my favourite version of us', 'proof we were here'];

/** Handwriting under each print: the sender's own caption first, then names and the year. */
function polaroidCaption(data: XsoData, caption: string, index: number) {
  const lines = [
    caption.trim(),
    `${data.customerName} & ${data.billerName}`,
    `'${data.timestamp.split(' ')[0].slice(-2)} ♡`,
  ].filter(Boolean);
  return lines[index % lines.length];
}

/** What's written on the back, shown when the print is flipped in the lightbox. */
function polaroidBack(data: XsoData, index: number): PolaroidBack {
  const line = data.lineItems[index];
  const date = data.timestamp.split(' ')[0];
  return {
    meta: `Frame ${String(index + 1).padStart(2, '0')} · ${date}`,
    text: line ? `the ${line.description.toLowerCase()} era.` : 'one I keep coming back to.',
    note: BACK_NOTES[index % BACK_NOTES.length],
    footer: data.occasion,
    signoff: `— ${data.billerName.charAt(0)}.`,
  };
}

/** A push pin through the top edge; amber or rose so neighbours don't match. */
const Pin = memo(function Pin({
  tone = 'rose',
  left = '50%',
}: {
  tone?: 'rose' | 'amber';
  left?: string;
}) {
  return <span aria-hidden className={`desk-pin desk-pin--${tone}`} style={{ left }} />;
});

/** Every print is held down by something: tape on the corner, a pin, or tape on the left. */
function PolaroidFastener({ index }: { index: number }) {
  if (index % 3 === 1) return <Pin left="50%" />;
  if (index % 3 === 2) {
    return <Tape style={{ left: '-9%', top: 8, transform: 'rotate(-36deg)', width: '40%' }} />;
  }
  return <Tape style={{ right: '-10%', top: 6, transform: 'rotate(38deg)', width: '42%' }} />;
}

const Polaroid = memo(function Polaroid({
  photo,
  caption,
}: {
  photo: { src: string; index: number };
  caption: string;
}) {
  return (
    <div className="desk-paper desk-paper--polaroid relative p-[7%] pb-0 will-change-transform">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#2d1b22]">
        {photo.src ? (
          <LazyMedia
            src={photo.src}
            alt={`Memory ${photo.index + 1}`}
            fill
            sizes="(max-width: 768px) 45vw, 320px"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <p className="absolute inset-0 grid place-items-center font-hand text-lg text-[#f7f3ed]/70">
            your photo here
          </p>
        )}
        <motion.span aria-hidden className="polaroid-gloss" variants={GLOSS} />
      </div>
      <p className="line-clamp-2 break-words px-[2%] py-[8%] text-center font-hand text-[18px] leading-[1.05] text-[#3a2530]">
        {caption}
      </p>
      <PolaroidFastener index={photo.index} />
    </div>
  );
});

const CARD_PAPERS = ['#f8d5e1', '#f6cd85'];

/** Stands in for a polaroid when no photos were uploaded: a coloured card, written by hand. */
const MemoryCard = memo(function MemoryCard({ data, index }: { data: XsoData; index: number }) {
  const flag = data.greenFlags[0]?.toLowerCase();
  const line = data.lineItems[0];
  const text =
    index === 0
      ? (flag ?? 'the way you show up')
      : line
        ? `${line.qty} ${line.description.toLowerCase()}`
        : 'every late night';
  return (
    <article
      className="desk-paper relative flex aspect-[4/5] flex-col justify-between p-[9%]"
      style={{ backgroundColor: CARD_PAPERS[index % CARD_PAPERS.length] }}
    >
      <p className="font-receipt text-[9px] uppercase tracking-[0.2em] text-[#8a6a52]">
        Memory {String(index + 1).padStart(2, '0')}
      </p>
      <p className="font-hand text-[22px] leading-[1.05] text-[#3a2530]">{text}</p>
      <p className="self-end font-hand text-[17px] leading-none text-[#b4234a]">
        {index === 0 ? 'always ♡' : 'worth it ♡'}
      </p>
      <Pin tone={index % 2 ? 'amber' : 'rose'} />
    </article>
  );
});

/**
 * Peel stages: flat, a hover-lifted corner, and swung aside on its top-right
 * pin far enough to read underneath. Transform-only so it stays on the GPU.
 */
const PEEL = [
  { rotate: 0, y: 0, scale: 1 },
  { rotate: 5, y: -1, scale: 1.01 },
  { rotate: 30, y: -3, scale: 1.02 },
];
const PEEL_SHADOW = [0, 0.5, 1];

const StickyNote = memo(function StickyNote({
  data,
  secret,
  paper,
  peel,
  reduce,
}: {
  data: XsoData;
  secret: string;
  paper: string;
  peel: 0 | 1 | 2;
  reduce: boolean;
}) {
  const transition = reduce ? INSTANT : SOFT_SPRING;
  const score = overallStars(data.auditMetrics).toFixed(1);
  return (
    <div className="relative aspect-square">
      <div
        className="desk-paper desk-paper--under absolute inset-0 flex flex-col items-end justify-end p-2 text-right"
        aria-hidden={peel !== 2}
      >
        <p className="line-clamp-5 max-w-[56%] break-words font-hand text-[15px] leading-[1.05] text-[#3a2530]">
          {secret || '…'}
        </p>
      </div>

      <motion.div
        className="desk-paper desk-paper--sticky gpu-layer absolute inset-0 p-2.5"
        style={{ transformOrigin: '100% 0%', backgroundColor: paper }}
        initial={false}
        animate={PEEL[peel]}
        transition={transition}
      >
        <motion.span
          aria-hidden
          className="sticky-lift"
          initial={false}
          animate={{ opacity: PEEL_SHADOW[peel] }}
          transition={transition}
        />
        <Pin tone="amber" left="52%" />
        <p className="font-receipt text-[9px] uppercase tracking-[0.2em] text-[#8a6a52]">
          Audit · {score}/5
        </p>
        <ul className="mt-1 space-y-0.5 font-hand text-[16.5px] leading-[1.05] text-[#3a2530]">
          {data.greenFlags.slice(0, 3).map((flag) => (
            <li key={flag}>✓ {flag.toLowerCase()}</li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
});

const WAVE = [6, 11, 17, 9, 20, 13, 7, 16, 10, 18, 8, 14];

const VoiceSnippet = memo(function VoiceSnippet({ src, from }: { src: string; from: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  usePauseOffscreen(root, audio, () => setPlaying(false));

  useEffect(() => {
    const clip = new Audio();
    clip.preload = 'none';
    clip.src = src;
    audio.current = clip;
    const ended = () => setPlaying(false);
    clip.addEventListener('ended', ended);
    return () => {
      clip.pause();
      clip.removeEventListener('ended', ended);
      audio.current = null;
      setPlaying(false);
    };
  }, [src]);

  const toggle = async () => {
    const clip = audio.current;
    if (clip && !playing) await clip.play().catch(() => undefined);
    if (clip && playing) clip.pause();
    setPlaying((on) => !on);
  };

  return (
    <div ref={root} className="flex items-center gap-1.5">
      <div
        className={`vn-bars flex h-5 items-end gap-[2px] ${playing ? 'is-playing' : ''}`}
        aria-hidden
      >
        {WAVE.map((h, i) => (
          <span
            key={i}
            className="vn-bar w-[2px] rounded-full bg-[#ec4899]/75"
            style={
              {
                height: h,
                '--vn-dur': `${700 + (i % 4) * 80}ms`,
                '--vn-delay': `${i * 40}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${from}'s voice note` : `Play ${from}'s voice note`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2d1b22] text-[#fdf2f8] shadow-[0_2px_6px_rgba(45,27,34,0.35)]"
      >
        {playing ? (
          <Pause className="h-3 w-3 fill-current" />
        ) : (
          <Play className="h-3 w-3 fill-current" />
        )}
      </button>
    </div>
  );
});

/** A cassette label: the voice note plays in place, a song opens in Spotify. */
const SongCard = memo(function SongCard({ data, songUrl }: { data: XsoData; songUrl: string }) {
  return (
    <article className="desk-paper desk-paper--ticket relative px-3 py-2.5 text-[#2d1b22]">
      <Pin left="88%" />
      <p className="font-receipt text-[9px] uppercase tracking-[0.2em] text-[#9a6a7e]">
        Side A · {data.voiceNoteUrl ? 'press play' : 'our song'}
      </p>
      {data.voiceNoteUrl ? (
        <div className="mt-1">
          <VoiceSnippet src={data.voiceNoteUrl} from={data.billerName} />
        </div>
      ) : null}
      {songUrl ? (
        <a
          href={songUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-8 items-center gap-1.5 font-hand text-[17px] leading-none text-[#b4234a] underline decoration-[#b4234a]/30 underline-offset-2"
        >
          <Play className="h-3 w-3 fill-current" aria-hidden /> play our song
        </a>
      ) : null}
      {!data.voiceNoteUrl && !songUrl ? (
        <p className="mt-1 font-hand text-[16px] leading-none text-[#3a2530]/60">your song here</p>
      ) : null}
    </article>
  );
});

const TicketStub = memo(function TicketStub({
  data,
  layers,
  torn,
  reduce,
}: {
  data: XsoData;
  layers: ScrapbookLayers;
  torn: boolean;
  reduce: boolean;
}) {
  const where = [layers.ticketPlace, layers.ticketWhen].filter(Boolean).join(' · ');
  return (
    <article className="desk-paper desk-paper--ticket relative px-3 py-2.5 text-[#2d1b22]">
      <Tape style={{ left: '-6%', top: '30%', transform: 'rotate(-80deg)', width: '22%' }} />
      <div className="flex items-baseline justify-between gap-2 font-receipt text-[9px] uppercase tracking-[0.2em] text-[#9a6a7e]">
        <span>Admit two</span>
        <span>No. 0417</span>
      </div>
      <p className="mt-0.5 truncate font-serif text-[16px] font-semibold leading-tight">
        {layers.ticketTitle || 'Secret promise'}
      </p>
      {where ? (
        <p className="truncate font-receipt text-[9px] uppercase tracking-[0.14em] text-[#7a5563]">
          {where}
        </p>
      ) : null}
      <div className="relative mt-1.5 min-h-[30px] border-t border-dashed border-[#2d1b22]/30 pt-1.5">
        <p className="font-hand text-[17px] leading-[1.05] text-[#b4234a]" aria-hidden={!torn}>
          {data.scratchOffReward}
        </p>
        <AnimatePresence initial={false}>
          {torn ? null : (
            <motion.div
              key="strip"
              className="ticket-strip absolute inset-x-[-4px] bottom-[-3px] top-1 grid place-items-center"
              exit={
                reduce
                  ? { opacity: 0, transition: INSTANT }
                  : { y: 34, x: 12, rotate: 9, opacity: 0 }
              }
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <span className="font-receipt text-[9px] uppercase tracking-[0.22em] text-[#8a6a52]">
                ✂ · · · tear here · · ·
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
});

type SealState = 'whole' | 'cracking' | 'broken';
/** How long the seal takes to split before the letter starts unfolding. */
const SEAL_CRACK_MS = 650;
const SEAL_LEFT = 'polygon(0 0, 54% 0, 45% 28%, 57% 52%, 46% 76%, 53% 100%, 0 100%)';
const SEAL_RIGHT = 'polygon(54% 0, 100% 0, 100% 100%, 53% 100%, 46% 76%, 57% 52%, 45% 28%)';
const SEAL_CRUMBS = [
  { x: -14, y: -10, size: 4 },
  { x: 13, y: -12, size: 3 },
  { x: -10, y: 12, size: 3 },
  { x: 15, y: 9, size: 4 },
  { x: 2, y: -16, size: 2.5 },
];

/** The sender's wax seal. Opening the letter cracks it in two, and it stays broken after. */
function WaxSeal({
  initial,
  state,
  reduce,
}: {
  initial: string;
  state: SealState;
  reduce: boolean;
}) {
  const place = 'absolute bottom-[14%] left-1/2 -translate-x-1/2';
  if (state === 'whole') {
    return (
      <span aria-hidden className={`wax-seal ${place}`}>
        {initial}
      </span>
    );
  }
  const split = (side: -1 | 1) => ({
    initial: reduce || state === 'broken' ? false : ({ x: 0, y: 0, rotate: 0 } as const),
    animate: { x: 4 * side, y: side === 1 ? 2 : 1, rotate: side === 1 ? 13 : -16 },
    transition: reduce
      ? INSTANT
      : { type: 'spring' as const, stiffness: 420, damping: 16, delay: 0.08 },
  });
  return (
    <span aria-hidden className={`${place} h-[30px] w-[30px]`}>
      <motion.span
        className="wax-seal absolute inset-0"
        style={{ clipPath: SEAL_LEFT }}
        {...split(-1)}
      >
        {initial}
      </motion.span>
      <motion.span
        className="wax-seal absolute inset-0"
        style={{ clipPath: SEAL_RIGHT }}
        {...split(1)}
      >
        {initial}
      </motion.span>
      {state === 'cracking' && !reduce
        ? SEAL_CRUMBS.map((crumb, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full bg-[#a01d42]"
              style={{ width: crumb.size, height: crumb.size }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: crumb.x, y: crumb.y + 10, opacity: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
            />
          ))
        : null}
    </span>
  );
}

const FoldedLetter = memo(function FoldedLetter({
  data,
  seal,
  reduce,
}: {
  data: XsoData;
  seal: SealState;
  reduce: boolean;
}) {
  return (
    <article className="desk-paper desk-paper--letter relative aspect-[5/4] px-3 pt-2.5">
      <Tape style={{ left: '-8%', top: 8, transform: 'rotate(-32deg)', width: '38%' }} />
      <p className="font-receipt text-[9px] uppercase tracking-[0.2em] text-[#9a6a7e]">
        Do not open till {data.occasion.toLowerCase()}
      </p>
      <p className="mt-1 font-hand text-[21px] leading-none text-[#3a2530]">
        for {data.customerName}
      </p>
      <WaxSeal initial={data.billerName.charAt(0)} state={seal} reduce={reduce} />
    </article>
  );
});

/**
 * A piece lifted off the desk into the lamp light. It springs out of the exact
 * spot (and tilt) it was resting in, and the exit retraces the same path.
 */
function FocusView({
  focus,
  label,
  action,
  quiet,
  reduce,
  onClose,
  children,
}: {
  focus: Focus;
  label: string;
  action: { run: () => void; hint: string } | null;
  /** Keeps the hint for screen readers only. */
  quiet: boolean;
  reduce: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const putBack = useRef<HTMLButtonElement>(null);
  const resting = { x: focus.x, y: focus.y, rotate: focus.rotate, scale: 1 };
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  useEffect(() => {
    putBack.current?.focus({ preventScroll: true });
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[60] grid place-items-center rounded-[inherit]"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <motion.button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className="desk-dim absolute bg-[#120a0e]/60 backdrop-blur-[6px]"
        {...fade}
        transition={{ duration: 0.35 }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {action ? (
          <motion.p
            key={action.hint}
            aria-live="polite"
            className={
              quiet
                ? 'sr-only'
                : 'pointer-events-none absolute inset-x-0 top-4 text-center font-hand text-[22px] leading-none text-[#fde7d4]'
            }
            {...fade}
            transition={{ duration: 0.2 }}
          >
            {action.hint}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <motion.div
        className="relative"
        style={{ width: focus.width }}
        initial={reduce ? { ...resting, opacity: 0 } : resting}
        animate={{ x: 0, y: -12, rotate: 0, scale: focus.scale, opacity: 1 }}
        exit={
          reduce
            ? { opacity: 0, transition: { duration: 0.15 } }
            : { ...resting, transition: PUT_BACK_SPRING }
        }
        transition={reduce ? { duration: 0.15 } : FOCUS_SPRING}
      >
        <span aria-hidden className="desk-focus-glow" />
        <motion.div
          initial="hover"
          animate="hover"
          className="cursor-pointer"
          onClick={(event) => {
            if ((event.target as Element).closest(INTERACTIVE)) return;
            if (action) action.run();
            else onClose();
          }}
        >
          {children}
        </motion.div>
      </motion.div>

      <motion.button
        ref={putBack}
        type="button"
        onClick={onClose}
        className="absolute bottom-4 left-1/2 min-h-11 -translate-x-1/2 touch-manipulation whitespace-nowrap rounded-full border border-[#fde7d4]/25 bg-[#2d1b22]/70 px-5 font-receipt text-[10px] uppercase tracking-[0.2em] text-[#fde7d4] shadow-[0_6px_20px_-6px_rgba(253,186,116,0.35)] backdrop-blur-sm"
        {...fade}
        transition={{ duration: 0.25, delay: reduce ? 0 : 0.15 }}
      >
        Put back
      </motion.button>
    </div>
  );
}

const UNFOLD = { ...SOFT_SPRING, damping: 18 };
/** The pen starts once the flaps have opened, and long letters are written faster. */
const WRITE_DELAY_MS = 650;
const writeDuration = (length: number) => Math.min(Math.max(length * 32, 1800), 6500);

/**
 * The letter body, written out at a pen's pace. The unwritten rest is laid out
 * invisibly so lines never reflow, screen readers get the whole text at once,
 * and a tap finishes it.
 */
function HandwrittenBody({
  text,
  reduce,
  bodyMax,
}: {
  text: string;
  reduce: boolean;
  bodyMax?: number;
}) {
  const [shown, setShown] = useState(reduce ? text.length : 0);
  const box = useRef<HTMLDivElement>(null);
  const pen = useRef<HTMLSpanElement>(null);
  const done = shown >= text.length;

  useEffect(() => {
    if (reduce) return setShown(text.length);
    const total = writeDuration(text.length);
    let frame = 0;
    const start = performance.now() + WRITE_DELAY_MS;
    const tick = (now: number) => {
      const next = Math.round(text.length * Math.min(Math.max((now - start) / total, 0), 1));
      setShown((current) => Math.max(current, next));
      if (next < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, reduce]);

  useEffect(() => {
    const container = box.current;
    const tip = pen.current;
    if (!container || !tip || done) return;
    const below = tip.offsetTop + tip.offsetHeight - container.clientHeight + 8;
    if (below > container.scrollTop) container.scrollTop = below;
  }, [shown, done]);

  return (
    <div
      ref={box}
      className={`desk-paper desk-paper--sheet letter-panel letter-panel--mid relative overflow-y-auto px-5 py-2 ${bodyMax ? '' : 'max-h-[38vh]'}`}
      style={bodyMax ? { maxHeight: bodyMax } : undefined}
      onClick={() => setShown(text.length)}
      data-no-drag
    >
      <p className="sr-only">{text}</p>
      <p
        aria-hidden
        className="whitespace-pre-line font-hand text-[21px] leading-[1.15] text-[#3a2530]"
      >
        {text.slice(0, shown)}
        <span ref={pen} />
        <span className="opacity-0">{text.slice(shown)}</span>
      </p>
    </div>
  );
}

function OpenLetter({
  data,
  reduce,
  bodyMax,
  onClose,
}: {
  data: XsoData;
  reduce: boolean;
  /** Body height cap in desk pixels when the desk is scaled; otherwise a share of the screen. */
  bodyMax?: number;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const flap = (from: number, delay: number) =>
    reduce
      ? { initial: false as const, transition: INSTANT }
      : {
          initial: { rotateX: from },
          animate: { rotateX: 0 },
          exit: { rotateX: from, transition: { ...UNFOLD, delay: 0 } },
          transition: { ...UNFOLD, delay },
        };

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="absolute inset-0 z-50 grid place-items-center rounded-[inherit] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Letter from ${data.billerName}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, delay: reduce ? 0 : 0.25 } }}
      transition={{ duration: 0.3 }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className="desk-dim absolute bg-[#120a0e]/85 backdrop-blur-[6px]"
      />
      <motion.div
        className="relative w-full max-w-[340px]"
        style={{ perspective: 1200 }}
        initial={reduce ? false : { scale: 0.55, y: 60, rotate: -6 }}
        animate={{ scale: 1, y: 0, rotate: -1 }}
        exit={
          reduce
            ? { opacity: 0 }
            : { scale: 0.55, y: 70, rotate: 5, transition: { ...UNFOLD, delay: 0.2 } }
        }
        transition={reduce ? INSTANT : { type: 'spring', stiffness: 200, damping: 24 }}
      >
        <motion.div
          className="desk-paper desk-paper--sheet letter-panel rounded-t-[4px] px-5 pb-2 pt-5"
          style={{ transformOrigin: '50% 100%', backfaceVisibility: 'hidden' }}
          {...flap(-170, 0.12)}
        >
          <p className="font-receipt text-[9px] uppercase tracking-[0.22em] text-[#9a6a7e]">
            {data.timestamp} · {data.occasion}
          </p>
          <p className="mt-2 font-hand text-[26px] leading-none text-[#3a2530]">
            Dear {data.customerName},
          </p>
        </motion.div>
        <HandwrittenBody text={data.birthdayMessage} reduce={reduce} bodyMax={bodyMax} />
        <motion.div
          className="desk-paper desk-paper--sheet letter-panel flex items-end justify-between gap-3 rounded-b-[4px] px-5 pb-4 pt-2"
          style={{ transformOrigin: '50% 0%', backfaceVisibility: 'hidden' }}
          {...flap(170, 0.34)}
        >
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="min-h-11 touch-manipulation rounded-full border border-[#2d1b22]/15 px-4 font-receipt text-[10px] uppercase tracking-[0.18em] text-[#7a5563] hover:bg-[#2d1b22]/[0.05]"
          >
            Fold it back
          </button>
          <p className="font-hand text-[24px] leading-none text-[#b4234a]">— {data.billerName}</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const CoffeeRing = memo(function CoffeeRing({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g fill="none" stroke="#7a4a2a">
        <circle
          cx="50"
          cy="50"
          r="38"
          strokeWidth="3.2"
          opacity="0.9"
          strokeDasharray="70 3 40 2 90 4"
        />
        <circle
          cx="50.6"
          cy="49.4"
          r="35.5"
          strokeWidth="1"
          opacity="0.45"
          strokeDasharray="30 6 55 4"
        />
        <path d="M18 62a34 34 0 0 1 4-30" strokeWidth="5" opacity="0.35" strokeLinecap="round" />
      </g>
    </svg>
  );
});
