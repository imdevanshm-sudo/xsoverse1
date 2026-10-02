'use client';

import {
  useCallback,
  useEffect,
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
  motion,
  useDragControls,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import type { XsoData } from '@/types/xso';
import { playFoley } from '@/lib/foley';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { overallStars } from '@/components/xso/Side2Audit';
import { seededOffset } from '@/components/xso/viewers/shared';

const PICK_UP = { type: 'spring' as const, stiffness: 300, damping: 25 };
const FLIP = { type: 'spring' as const, stiffness: 170, damping: 22 };
const INSTANT = { duration: 0 };
/** Presses on these stay with the control instead of picking the item up. */
const INTERACTIVE = 'button, a, input, audio, [data-no-drag]';

const MEMORY_LABELS = ['Receipt', 'Audit', 'Photos', 'Letter'];

type ItemKind = 'receipt' | 'polaroid' | 'sticky' | 'ticket' | 'letter';

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
};

const DESK_HEIGHT = {
  hero: 'scrap-desk--hero',
  studio: 'scrap-desk--studio',
  fill: 'min-h-0 flex-1',
};

function buildItems(data: XsoData): DeskItemSpec[] {
  const photos = data.photos.filter(Boolean).slice(0, 3);
  const jitter = (id: string, base: number) =>
    Math.max(-6, Math.min(8, base + seededOffset(data.id || 'xso', id.length * 7 + base, 1.5)));
  const at = (id: string, kind: ItemKind, memory: number, extra?: Partial<DeskItemSpec>) => {
    const spot = LAYOUT[id];
    return { id, kind, memory, ...spot, tilt: jitter(id, spot.tilt), ...extra };
  };
  return [
    at('receipt', 'receipt', 0),
    ...(photos.length ? photos : ['']).map((src, index) =>
      at(`polaroid-${index}`, 'polaroid', 2, { photo: { src, index } }),
    ),
    at('sticky', 'sticky', 1),
    at('ticket', 'ticket', 3),
    at('letter', 'letter', 3),
  ];
}

export function ScrapbookDesk({
  data,
  size = 'hero',
  focusIndex,
  onChange,
}: {
  data: XsoData;
  /** `fill` stretches to its container, e.g. inside the gift phone frame. */
  size?: keyof typeof DESK_HEIGHT;
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
}) {
  const desk = useRef<HTMLDivElement>(null);
  const letterItem = useRef<HTMLDivElement>(null);
  const items = useMemo(() => buildItems(data), [data]);
  const reduce = Boolean(useReducedMotion());
  const [stack, setStack] = useState<string[]>(() => items.map((item) => item.id));
  const [tidy, setTidy] = useState(0);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [peel, setPeel] = useState<0 | 1 | 2>(0);
  const [torn, setTorn] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);

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
    setTidy((n) => n + 1);
    setStack(items.map((item) => item.id));
    setFlipped({});
    setPeel(0);
  };

  const closeLetter = useCallback(() => {
    setLetterOpen(false);
    letterItem.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      className={`relative flex w-full max-w-[420px] flex-col ${size === 'fill' ? 'h-full' : ''}`}
      aria-label="Scrapbook desk"
    >
      <div ref={desk} className={`scrap-desk relative isolate w-full ${DESK_HEIGHT[size]}`}>
        <CoffeeRing className="pointer-events-none absolute bottom-[6%] right-[4%] w-[30%] opacity-[0.16]" />

        {items.map((item) => {
          const z = stack.indexOf(item.id) + 1;
          const common = {
            spec: item,
            z,
            desk,
            reduce,
            onPickUp: () => pickUp(item),
          };
          switch (item.kind) {
            case 'receipt':
              return (
                <DeskItem
                  key={`${item.id}:${tidy}`}
                  {...common}
                  label="Receipt"
                  hint="Drag me around"
                >
                  <MiniReceipt data={data} />
                </DeskItem>
              );
            case 'polaroid': {
              const isFlipped = Boolean(flipped[item.id]);
              return (
                <DeskItem
                  key={`${item.id}:${tidy}`}
                  {...common}
                  label={`Polaroid ${item.photo!.index + 1} — ${isFlipped ? 'turn back to the photo' : 'flip to read the back'}`}
                  hint={isFlipped ? 'Turn it back' : 'Flip me over'}
                  onActivate={() => {
                    playFoley('flip', 0.6);
                    setFlipped((f) => ({ ...f, [item.id]: !f[item.id] }));
                  }}
                >
                  <Polaroid data={data} photo={item.photo!} flipped={isFlipped} reduce={reduce} />
                </DeskItem>
              );
            }
            case 'sticky':
              return (
                <DeskItem
                  key={`${item.id}:${tidy}`}
                  {...common}
                  label={
                    peel === 2
                      ? 'Sticky note — press it back down'
                      : 'Sticky note — peel the corner'
                  }
                  hint={peel === 2 ? 'Press it back' : 'Peel the corner'}
                  onHover={(on) => setPeel((p) => (p === 2 ? 2 : on ? 1 : 0))}
                  onActivate={() => {
                    playFoley('tap', 0.7);
                    setPeel((p) => (p === 2 ? 0 : 2));
                  }}
                >
                  <StickyNote data={data} peel={peel} reduce={reduce} />
                </DeskItem>
              );
            case 'ticket':
              return (
                <DeskItem
                  key={`${item.id}:${tidy}`}
                  {...common}
                  label={
                    torn
                      ? 'Ticket stub — secret promise revealed'
                      : 'Ticket stub — tear along the dots'
                  }
                  hint={torn ? undefined : 'Tear along the dots'}
                  onActivate={
                    torn
                      ? undefined
                      : () => {
                          playFoley('scratch', 0.8);
                          setTorn(true);
                        }
                  }
                >
                  <TicketStub data={data} torn={torn} reduce={reduce} />
                </DeskItem>
              );
            case 'letter':
              return (
                <DeskItem
                  key={`${item.id}:${tidy}`}
                  {...common}
                  itemRef={letterItem}
                  label={`Folded letter for ${data.customerName} — unfold it`}
                  hint="Unfold letter"
                  onActivate={() => {
                    playFoley('flip', 0.8);
                    setLetterOpen(true);
                  }}
                >
                  <FoldedLetter data={data} />
                </DeskItem>
              );
          }
        })}

        <AnimatePresence>
          {letterOpen ? (
            <OpenLetter key="letter" data={data} reduce={reduce} onClose={closeLetter} />
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 font-receipt text-[10px] uppercase leading-relaxed tracking-[0.16em] text-[#c99aae]">
          Pick anything up · flip, peel, unfold
        </p>
        <button
          type="button"
          onClick={tidyUp}
          className="paper-button shrink-0 touch-manipulation"
          aria-label="Tidy the desk back into place"
        >
          Tidy up
        </button>
      </div>
    </section>
  );
}

/** Picking a print up off the desk: it rises, straightens a touch and its shadow spreads. */
const HANDLED: Variants = {
  rest: (tilt: number) => ({ scale: 1, rotate: tilt }),
  hover: (tilt: number) => ({ scale: 1.015, rotate: tilt }),
  lift: (tilt: number) => ({ scale: 1.05, rotate: tilt * 0.6 }),
};
const LIFT_SHADOW: Variants = {
  rest: { opacity: 0 },
  hover: { opacity: 0.4 },
  lift: { opacity: 1 },
};
/** Tape catches more lamp light the closer it's held to it. */
const TAPE_LIGHT: Variants = {
  rest: { opacity: 0.55 },
  hover: { opacity: 0.65 },
  lift: { opacity: 0.85 },
};

function DeskItem({
  spec,
  z,
  desk,
  reduce,
  label,
  hint,
  itemRef,
  onPickUp,
  onActivate,
  onHover,
  children,
}: {
  spec: DeskItemSpec;
  z: number;
  desk: RefObject<HTMLDivElement>;
  reduce: boolean;
  label: string;
  hint?: string;
  itemRef?: RefObject<HTMLDivElement>;
  onPickUp: () => void;
  onActivate?: () => void;
  onHover?: (on: boolean) => void;
  children: ReactNode;
}) {
  const dragControls = useDragControls();
  /** The click that trails a drag must not also flip, peel or unfold. */
  const droppedAt = useRef(0);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onActivate || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onPickUp();
    onActivate();
  };

  return (
    <motion.div
      ref={itemRef}
      className="desk-item group absolute touch-none select-none outline-none"
      style={{ left: spec.left, top: spec.top, width: spec.width, zIndex: z }}
      custom={spec.tilt}
      variants={HANDLED}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="lift"
      whileDrag="lift"
      transition={reduce ? INSTANT : PICK_UP}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={desk}
      dragElastic={0.1}
      dragTransition={{ power: 0.18, timeConstant: 200 }}
      onPointerDown={(event) => {
        if ((event.target as Element).closest(INTERACTIVE)) return;
        onPickUp();
        playFoley('tap', 0.35);
        dragControls.start(event);
      }}
      onDragEnd={() => {
        droppedAt.current = performance.now();
        playFoley('land', 0.45);
      }}
      onClick={(event) => {
        if (!onActivate || performance.now() - droppedAt.current < 220) return;
        if ((event.target as Element).closest(INTERACTIVE)) return;
        onActivate();
      }}
      onHoverStart={() => onHover?.(true)}
      onHoverEnd={() => onHover?.(false)}
      onKeyDown={onKeyDown}
      tabIndex={onActivate ? 0 : -1}
      role={onActivate ? 'button' : 'group'}
      aria-label={label}
    >
      <motion.span aria-hidden className="desk-item__lift" variants={LIFT_SHADOW} />
      {children}
      {hint ? (
        <span aria-hidden className="desk-hint">
          {hint}
        </span>
      ) : null}
    </motion.div>
  );
}

function Tape({ style, className = '' }: { style?: CSSProperties; className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`desk-tape ${className}`}
      style={style}
      variants={TAPE_LIGHT}
    />
  );
}

function MiniReceipt({ data }: { data: XsoData }) {
  return (
    <article className="desk-paper desk-paper--receipt relative px-3 pb-4 pt-4 font-receipt text-[#2d1b22]">
      <Tape style={{ left: '30%', top: -9, transform: 'rotate(-4deg)' }} />
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.12em]">
        {data.merchantName}
      </p>
      <p className="mt-0.5 text-center text-[8px] uppercase tracking-[0.18em] opacity-60">
        {data.timestamp}
      </p>
      <div className="my-2 border-t border-dashed border-[#2d1b22]/30" />
      <ul className="space-y-1 text-[9px] uppercase leading-tight">
        {data.lineItems.slice(0, 4).map((line) => (
          <li key={line.id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">
              {line.qty} {line.description}
            </span>
            <span className="shrink-0">{line.price}</span>
          </li>
        ))}
      </ul>
      <div className="my-2 border-t border-dashed border-[#2d1b22]/30" />
      <p className="flex justify-between text-[10px] font-bold uppercase">
        <span>Total</span>
        <span>{data.total}</span>
      </p>
      <p className="mt-2 font-hand text-[15px] leading-none text-[#b4234a]">worth every cent ♡</p>
      <CoffeeRing className="pointer-events-none absolute -bottom-4 -right-5 w-[62%] opacity-[0.22] mix-blend-multiply" />
    </article>
  );
}

const GLOSS: Variants = {
  rest: { opacity: 0.22, x: '-12%' },
  hover: { opacity: 0.32, x: '0%' },
  lift: { opacity: 0.5, x: '14%' },
};

function Polaroid({
  data,
  photo,
  flipped,
  reduce,
}: {
  data: XsoData;
  photo: { src: string; index: number };
  flipped: boolean;
  reduce: boolean;
}) {
  const line = data.lineItems[photo.index];
  const date = data.timestamp.split(' ')[0];
  return (
    <div style={{ perspective: 900 }}>
      <motion.div
        className="relative"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? INSTANT : FLIP}
      >
        <div
          className="desk-paper desk-paper--polaroid relative p-[7%] pb-0"
          style={{ backfaceVisibility: 'hidden' }}
          aria-hidden={flipped}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-[#2d1b22]">
            {photo.src ? (
              <LazyMedia
                src={photo.src}
                alt={`Memory ${photo.index + 1}`}
                fill
                sizes="160px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <p className="absolute inset-0 grid place-items-center font-hand text-lg text-[#f7f3ed]/70">
                your photo here
              </p>
            )}
            <motion.span aria-hidden className="polaroid-gloss" variants={GLOSS} />
          </div>
          <p className="truncate py-[9%] text-center font-hand text-[17px] leading-none text-[#3a2530]">
            {photo.index === 0
              ? `${data.customerName} & ${data.billerName}`
              : `'${date.slice(-2)} ♡`}
          </p>
          {photo.index === 0 ? (
            <Tape style={{ right: '-10%', top: 6, transform: 'rotate(38deg)', width: '42%' }} />
          ) : null}
        </div>

        <div
          className="desk-paper desk-paper--back absolute inset-0 flex flex-col p-[9%]"
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          aria-hidden={!flipped}
        >
          <p className="font-receipt text-[8px] uppercase tracking-[0.2em] text-[#9a6a7e]">
            Frame {String(photo.index + 1).padStart(2, '0')} · {date}
          </p>
          <p className="mt-2 flex-1 font-hand text-[18px] leading-[1.05] text-[#3a2530]">
            {line ? `the ${line.description.toLowerCase()} era.` : 'one I keep coming back to.'}
          </p>
          <p className="font-receipt text-[8px] uppercase tracking-[0.18em] text-[#9a6a7e]">
            {data.occasion}
          </p>
          <p className="text-right font-hand text-[16px] leading-none text-[#b4234a]">
            — {data.billerName.charAt(0)}.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/** Peel stages: flat, a hover-lifted corner, and peeled back far enough to read underneath. */
const PEEL_AT = [100, 80, 32];

function StickyNote({ data, peel, reduce }: { data: XsoData; peel: 0 | 1 | 2; reduce: boolean }) {
  const p = PEEL_AT[peel];
  const transition = reduce ? INSTANT : { type: 'spring' as const, stiffness: 220, damping: 24 };
  const score = overallStars(data.auditMetrics).toFixed(1);
  return (
    <div className="relative aspect-square">
      <div
        className="desk-paper desk-paper--under absolute inset-0 flex flex-col items-end justify-end gap-1.5 p-2 text-right"
        aria-hidden={peel !== 2}
      >
        <p className="max-w-[62%] font-hand text-[14px] leading-[1.05] text-[#3a2530]">
          psst… {data.redFlags[0]?.toLowerCase() ?? 'you know what you did'}
        </p>
        <VoiceSnippet data={data} live={peel === 2} />
      </div>

      <motion.div
        className="desk-paper desk-paper--sticky absolute inset-0 p-2.5"
        initial={false}
        animate={{
          clipPath: `polygon(0% 0%, 100% 0%, 100% ${p}%, ${p}% 100%, 0% 100%)`,
        }}
        transition={transition}
      >
        <p className="font-receipt text-[8px] uppercase tracking-[0.2em] text-[#8a6a52]">
          Audit · {score}/5
        </p>
        <ul className="mt-1 space-y-0.5 font-hand text-[15px] leading-[1.05] text-[#3a2530]">
          {data.greenFlags.slice(0, 3).map((flag) => (
            <li key={flag}>✓ {flag.toLowerCase()}</li>
          ))}
        </ul>
      </motion.div>
      <motion.div
        aria-hidden
        className="sticky-curl absolute inset-0"
        initial={false}
        animate={{ clipPath: `polygon(100% ${p}%, ${p}% 100%, ${p}% ${p}%)` }}
        transition={transition}
      />
    </div>
  );
}

const WAVE = [6, 11, 17, 9, 20, 13, 7, 16, 10, 18, 8, 14];

function VoiceSnippet({ data, live }: { data: XsoData; live: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!data.voiceNoteUrl) return;
    const clip = new Audio(data.voiceNoteUrl);
    audio.current = clip;
    const ended = () => setPlaying(false);
    clip.addEventListener('ended', ended);
    return () => {
      clip.pause();
      clip.removeEventListener('ended', ended);
      audio.current = null;
    };
  }, [data.voiceNoteUrl]);

  useEffect(() => {
    if (!live && playing) {
      audio.current?.pause();
      setPlaying(false);
    }
  }, [live, playing]);

  const toggle = async () => {
    const clip = audio.current;
    if (clip && !playing) await clip.play().catch(() => undefined);
    if (clip && playing) clip.pause();
    setPlaying((on) => !on);
  };

  return (
    <div className="flex items-center gap-1.5">
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
        tabIndex={live ? 0 : -1}
        aria-hidden={!live}
        aria-label={
          playing ? `Pause ${data.billerName}'s voice note` : `Play ${data.billerName}'s voice note`
        }
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
}

function TicketStub({ data, torn, reduce }: { data: XsoData; torn: boolean; reduce: boolean }) {
  return (
    <article className="desk-paper desk-paper--ticket relative px-3 py-2.5 text-[#2d1b22]">
      <div className="flex items-baseline justify-between gap-2 font-receipt text-[8px] uppercase tracking-[0.2em] text-[#9a6a7e]">
        <span>Admit two</span>
        <span>No. 0417</span>
      </div>
      <p className="mt-0.5 font-serif text-[15px] font-semibold leading-tight">Secret promise</p>
      <div className="relative mt-1.5 min-h-[30px] border-t border-dashed border-[#2d1b22]/30 pt-1.5">
        <p className="font-hand text-[16px] leading-[1.05] text-[#b4234a]" aria-hidden={!torn}>
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
              <span className="font-receipt text-[8px] uppercase tracking-[0.22em] text-[#8a6a52]">
                ✂ · · · tear here · · ·
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

function FoldedLetter({ data }: { data: XsoData }) {
  return (
    <article className="desk-paper desk-paper--letter relative aspect-[5/4] px-3 pt-2.5">
      <Tape style={{ left: '-8%', top: 8, transform: 'rotate(-32deg)', width: '38%' }} />
      <p className="font-receipt text-[8px] uppercase tracking-[0.2em] text-[#9a6a7e]">
        Do not open till {data.occasion.toLowerCase()}
      </p>
      <p className="mt-1 font-hand text-[19px] leading-none text-[#3a2530]">
        for {data.customerName}
      </p>
      <span aria-hidden className="wax-seal absolute bottom-[14%] left-1/2 -translate-x-1/2">
        {data.billerName.charAt(0)}
      </span>
    </article>
  );
}

const UNFOLD = { type: 'spring' as const, stiffness: 120, damping: 18 };

function OpenLetter({
  data,
  reduce,
  onClose,
}: {
  data: XsoData;
  reduce: boolean;
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
        className="absolute inset-0 rounded-[inherit] bg-[#180e15]/70 backdrop-blur-[3px]"
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
        <div
          className="desk-paper desk-paper--sheet letter-panel letter-panel--mid max-h-[38vh] overflow-y-auto px-5 py-2"
          data-no-drag
        >
          <p className="whitespace-pre-line font-hand text-[21px] leading-[1.15] text-[#3a2530]">
            {data.birthdayMessage}
          </p>
        </div>
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

function CoffeeRing({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <filter id="coffee-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
      </defs>
      <g filter="url(#coffee-rough)" fill="none" stroke="#7a4a2a">
        <circle cx="50" cy="50" r="38" strokeWidth="3.2" opacity="0.9" />
        <circle cx="50" cy="50" r="35.5" strokeWidth="1" opacity="0.45" />
        <path d="M18 62a34 34 0 0 1 4-30" strokeWidth="5" opacity="0.35" strokeLinecap="round" />
      </g>
    </svg>
  );
}
