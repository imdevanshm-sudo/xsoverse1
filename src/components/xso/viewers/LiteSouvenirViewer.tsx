'use client';

import {
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { liteReasonLabel, type LiteReason } from '@/lib/deviceQuality';
import {
  SPRING,
  getArtifacts,
  playMechanicalCue,
  rotateFrom,
} from '@/components/xso/viewers/shared';
import { AccordionPanel, MovieMemoryFrame, getScrapbookArtifacts } from '@/components/xso/viewers/StyleTemplates';

/** Mobile-safe DOM engines — fill the phone frame without fixed 500/620px stages. */
export function LiteSouvenirViewer({
  data,
  initialSide = 0,
  reason = null,
  onAdvance,
}: {
  data: XsoData;
  initialSide?: number;
  reason?: LiteReason | null;
  onAdvance?: () => void;
}) {
  return (
    <div className="lite-souvenir relative h-full w-full overflow-hidden bg-[#0b0c0e]">
      <div className="absolute inset-0 flex flex-col">
        <LiteEngine data={data} initialSide={initialSide} onAdvance={onAdvance} />
      </div>
      <p className="pointer-events-none absolute left-2 top-2 z-40 rounded bg-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.16em] text-white/55">
        {liteReasonLabel(reason)}
      </p>
    </div>
  );
}

function LiteEngine({
  data,
  initialSide,
  onAdvance,
}: {
  data: XsoData;
  initialSide: number;
  onAdvance?: () => void;
}) {
  const props = { data, initialSide, onAdvance };
  switch (data.giftStyle) {
    case 'rewind':
      return <LiteStack {...props} mode="rewind" />;
    case 'scrapbook':
      return <LiteScrapbook {...props} />;
    case 'accordion':
      return <LiteAccordion {...props} />;
    case 'moviebox':
      return <LiteMovieBox {...props} />;
    case 'loop':
    default:
      return <LiteStack {...props} mode="loop" />;
  }
}

const TILT_MAX = 7;

/**
 * Tilts toward the pointer on hover (fine pointers) and leans gently toward
 * the finger while pressed on touch. Springs back on leave/release.
 */
function TiltCard({
  children,
  disabled = false,
  className = '',
  style,
  onTap,
}: {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onTap?: () => void;
}) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 220, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 220, damping: 20 });
  const glareX = useTransform(rotateY, [-TILT_MAX, TILT_MAX], ['20%', '80%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} 30%, rgba(255,255,255,0.22), transparent 55%)`;
  const active = !disabled && !reduce;

  const lean = (e: PointerEvent<HTMLDivElement>, strength = 1) => {
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * TILT_MAX * 2 * strength);
    rx.set(-py * TILT_MAX * 2 * strength);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      className={className}
      style={{ ...style, rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse') lean(e);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') lean(e, 0.6);
      }}
      onPointerUp={reset}
      onPointerLeave={reset}
      onPointerCancel={reset}
      onClick={onTap}
    >
      {children}
      {active ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          style={{ background: glare }}
          aria-hidden
        />
      ) : null}
    </motion.div>
  );
}

function LiteStack({
  data,
  initialSide,
  mode,
  onAdvance,
}: {
  data: XsoData;
  initialSide: number;
  mode: 'loop' | 'rewind';
  onAdvance?: () => void;
}) {
  const artifacts = useMemo(() => getArtifacts(data), [data]);
  const [order, setOrder] = useState(() =>
    rotateFrom(
      artifacts.map((a) => a.id),
      mode === 'loop' && initialSide === 0 ? 3 : initialSide,
    ),
  );
  const [discarded, setDiscarded] = useState(
    mode === 'rewind'
      ? Math.max(0, Math.min(artifacts.length - 1, initialSide))
      : 0,
  );

  const ordered =
    mode === 'loop'
      ? order.map((id) => artifacts.find((a) => a.id === id)!)
      : artifacts.filter((_, i) => i >= discarded);

  const [tossing, setTossing] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const commitAdvance = () => {
    if (mode === 'loop') {
      setOrder((current) => [...current.slice(1), current[0]]);
    } else if (discarded < artifacts.length) {
      setDiscarded((v) => v + 1);
    } else {
      setDiscarded(0);
    }
    onAdvance?.();
  };

  const advance = () => {
    if (tossing) return;
    playMechanicalCue('click');
    const topId = ordered[0]?.id;
    if (!topId || reduce) {
      commitAdvance();
      return;
    }
    setTossing(topId);
  };

  const top = ordered[0];
  const visible = ordered.slice(0, 3);

  return (
    <section
      className="relative flex h-full min-h-0 flex-col bg-[#111316]"
      aria-label={mode === 'loop' ? 'Lite memory loop' : 'Lite rewind stack'}
    >
      <div
        className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-9"
        style={{ perspective: 1100 }}
      >
        {ordered.length === 0 ? (
          <button
            type="button"
            onClick={advance}
            className="absolute inset-0 m-auto h-fit w-fit rounded-full border border-cyber/50 bg-cyber/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-cyber"
          >
            ↺ Recall papers
          </button>
        ) : (
          visible.map((artifact, depth) => {
            const isTossing = tossing === artifact.id;
            return (
              <motion.div
                key={artifact.id}
                className="absolute inset-x-3 bottom-3 top-9"
                style={{ zIndex: isTossing ? 20 : 10 - depth }}
                initial={false}
                animate={
                  isTossing
                    ? mode === 'loop'
                      ? { y: -46, x: 28, rotate: 9, rotateX: 18, scale: 0.94, opacity: 0 }
                      : { x: '-115%', rotate: -14, opacity: 0 }
                    : {
                        y: depth * 10,
                        x: 0,
                        rotate: depth === 0 ? 0 : depth % 2 ? 1.6 : -1.4,
                        rotateX: 0,
                        scale: 1 - depth * 0.035,
                        opacity: depth === 0 ? 1 : 0.9,
                      }
                }
                transition={
                  isTossing
                    ? { duration: 0.28, ease: [0.4, 0, 0.9, 0.6] }
                    : SPRING
                }
                onAnimationComplete={() => {
                  if (isTossing) {
                    setTossing(null);
                    commitAdvance();
                  }
                }}
              >
                <TiltCard
                  disabled={depth !== 0 || isTossing}
                  className="relative h-full overflow-hidden rounded-md border border-black/10 bg-[#fff7fb] shadow-[0_14px_30px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.35)]"
                >
                  <div className="h-full overflow-y-auto overscroll-contain p-2">
                    {artifact.content}
                  </div>
                </TiltCard>
              </motion.div>
            );
          })
        )}
      </div>
      <div className="shrink-0 border-t border-white/10 bg-black/40 px-3 py-2.5">
        <motion.button
          type="button"
          onClick={advance}
          disabled={!top && mode === 'loop'}
          whileTap={{ scale: 0.96, y: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-md border border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.06] py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_3px_0_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f472b6]"
        >
          <span aria-hidden>↻</span>
          {mode === 'loop'
            ? `Loop · ${top?.label ?? 'memory'}`
            : discarded >= artifacts.length
              ? 'Recall stack'
              : `Discard · ${top?.label ?? ''}`}
        </motion.button>
      </div>
    </section>
  );
}

function LiteAccordion({
  data,
  initialSide,
  onAdvance,
}: {
  data: XsoData;
  initialSide: number;
  onAdvance?: () => void;
}) {
  const [panel, setPanel] = useState(
    Math.max(0, Math.min(3, Math.round(initialSide))),
  );

  const step = (dir: 1 | -1) => {
    playMechanicalCue('click');
    setPanel((value) => (value + dir + 4) % 4);
    if (dir === 1) onAdvance?.();
  };

  return (
    <section
      className="relative flex h-full min-h-0 flex-col bg-[#1a1510]"
      aria-label="Lite accordion souvenir"
    >
      <div className="min-h-0 flex-1 overflow-hidden p-3 pt-9">
        <motion.div
          key={panel}
          className="h-full overflow-hidden rounded-sm border border-[#4a3828]/50 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
          initial={{ opacity: 0.4, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <div className="h-full overflow-y-auto overscroll-contain bg-[#eee0c5]">
            <AccordionPanel data={data} index={panel} />
          </div>
        </motion.div>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-black/40 bg-[#120e0b] px-3 py-2.5">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex-1 touch-manipulation rounded-md border border-[#6d5946]/40 bg-[#2a221c] py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e8dcc7]"
        >
          ← Fold back
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          className="flex-[1.2] touch-manipulation rounded-md border border-[#c4a882]/35 bg-[#3a3028] py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#fff0e4]"
        >
          Pull next · {panel + 1}/4
        </button>
      </div>
    </section>
  );
}

function LiteScrapbook({
  data,
  initialSide,
  onAdvance,
}: {
  data: XsoData;
  initialSide: number;
  onAdvance?: () => void;
}) {
  const artifacts = useMemo(() => getScrapbookArtifacts(data), [data]);
  const [index, setIndex] = useState(
    Math.max(0, Math.min(artifacts.length - 1, initialSide)),
  );
  const current = artifacts[index];

  return (
    <section
      className="relative flex h-full min-h-0 flex-col bg-[#8b6340]"
      aria-label="Lite scrapbook"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-9">
        <motion.div
          key={current.id}
          className="mx-auto max-w-[280px]"
          initial={{ opacity: 0, scale: 0.96, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: current.rotation }}
          transition={SPRING}
        >
          {current.content}
        </motion.div>
      </div>
      <div className="shrink-0 border-t border-black/25 bg-[#6e4c30] px-3 py-2.5">
        <button
          type="button"
          onClick={() => {
            playMechanicalCue('tack');
            setIndex((value) => (value + 1) % artifacts.length);
            onAdvance?.();
          }}
          className="w-full touch-manipulation rounded-md border border-[#f0dcc0]/25 bg-[#3a2818] py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f5e6d0]"
        >
          Reshuffle · {current.label}
        </button>
      </div>
    </section>
  );
}

function LiteMovieBox({
  data,
  initialSide,
  onAdvance,
}: {
  data: XsoData;
  initialSide: number;
  onAdvance?: () => void;
}) {
  const [turn, setTurn] = useState(Math.max(0, Math.round(initialSide)));
  const frame = ((turn % 4) + 4) % 4;

  return (
    <section
      className="relative flex h-full min-h-0 flex-col bg-[#12070c]"
      aria-label="Lite film projector"
    >
      <p className="shrink-0 px-3 pt-9 font-mono text-[9px] uppercase tracking-[0.2em] text-[#ffb86a]/80">
        35mm archive · frame {String(frame + 1).padStart(2, '0')}
      </p>
      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
        <div className="h-full overflow-hidden rounded-sm border border-[#5c3d28]/50 bg-black shadow-[inset_0_0_40px_#000]">
          <div className="h-full overflow-y-auto">
            <MovieMemoryFrame data={data} index={frame} />
          </div>
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3 pt-1">
        <motion.button
          type="button"
          onClick={() => {
            playMechanicalCue('clack');
            setTurn((value) => value + 1);
            onAdvance?.();
          }}
          whileTap={{ scale: 0.96 }}
          transition={SPRING}
          className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-md border border-[#5c3d28]/60 bg-[#2a1810] px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#ffe8c8]"
          aria-label="Crank / advance"
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-full border border-[#a67c52]/50"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, #e8b878 0%, #b8864a 42%, #6b4423 100%)',
            }}
            aria-hidden
          />
          Crank / advance
        </motion.button>
      </div>
    </section>
  );
}
