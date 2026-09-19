'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { XsoData } from '@/types/xso';
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
}: {
  data: XsoData;
  initialSide?: number;
}) {
  return (
    <div className="lite-souvenir relative h-full w-full overflow-hidden bg-[#0b0c0e]">
      <div className="absolute inset-0 flex flex-col">
        <LiteEngine data={data} initialSide={initialSide} />
      </div>
      <p className="pointer-events-none absolute left-2 top-2 z-40 rounded bg-black/75 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.16em] text-white/55">
        Lite mode · no 3D
      </p>
    </div>
  );
}

function LiteEngine({
  data,
  initialSide,
}: {
  data: XsoData;
  initialSide: number;
}) {
  switch (data.giftStyle) {
    case 'loop':
      return <LiteStack data={data} initialSide={initialSide} mode="loop" />;
    case 'rewind':
      return <LiteStack data={data} initialSide={initialSide} mode="rewind" />;
    case 'scrapbook':
      return <LiteScrapbook data={data} initialSide={initialSide} />;
    case 'accordion':
      return <LiteAccordion data={data} initialSide={initialSide} />;
    case 'moviebox':
      return <LiteMovieBox data={data} initialSide={initialSide} />;
    default:
      return <LiteStack data={data} initialSide={initialSide} mode="loop" />;
  }
}

function LiteStack({
  data,
  initialSide,
  mode,
}: {
  data: XsoData;
  initialSide: number;
  mode: 'loop' | 'rewind';
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

  const advance = () => {
    playMechanicalCue('click');
    if (mode === 'loop') {
      setOrder((current) => [...current.slice(1), current[0]]);
      return;
    }
    if (discarded < artifacts.length) {
      setDiscarded((v) => v + 1);
    } else {
      setDiscarded(0);
    }
  };

  const top = ordered[0];

  return (
    <section
      className="relative flex h-full min-h-0 flex-col bg-[#111316]"
      aria-label={mode === 'loop' ? 'Lite memory loop' : 'Lite rewind stack'}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden px-3 pb-2 pt-9">
        {ordered.length === 0 ? (
          <button
            type="button"
            onClick={advance}
            className="absolute inset-0 m-auto h-fit w-fit rounded-full border border-cyber/50 bg-cyber/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-cyber"
          >
            ↺ Recall papers
          </button>
        ) : (
          ordered
            .slice(0, 3)
            .map((artifact, depth) => (
              <div
                key={artifact.id}
                className="absolute inset-x-3 bottom-2 top-9 overflow-hidden rounded-md border border-white/10 bg-[#fcfaf2] shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                style={{
                  zIndex: 10 - depth,
                  transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.03})`,
                  opacity: depth === 0 ? 1 : 0.92,
                }}
              >
                <div className="h-full overflow-y-auto overscroll-contain p-2">
                  {artifact.content}
                </div>
              </div>
            ))
        )}
      </div>
      <div className="shrink-0 border-t border-white/10 bg-black/40 px-3 py-2.5">
        <button
          type="button"
          onClick={advance}
          disabled={!top && mode === 'loop'}
          className="w-full touch-manipulation rounded-md border border-white/15 bg-white/10 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 active:bg-white/20"
        >
          {mode === 'loop'
            ? `Toss · ${top?.label ?? 'memory'}`
            : discarded >= artifacts.length
              ? 'Recall stack'
              : `Discard · ${top?.label ?? ''}`}
        </button>
      </div>
    </section>
  );
}

function LiteAccordion({
  data,
  initialSide,
}: {
  data: XsoData;
  initialSide: number;
}) {
  const [panel, setPanel] = useState(
    Math.max(0, Math.min(3, Math.round(initialSide))),
  );

  const step = (dir: 1 | -1) => {
    playMechanicalCue('click');
    setPanel((value) => (value + dir + 4) % 4);
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
}: {
  data: XsoData;
  initialSide: number;
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
}: {
  data: XsoData;
  initialSide: number;
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
