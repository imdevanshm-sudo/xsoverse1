'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { XsoData } from '@/types/xso';
import {
  SPRING,
  TossCard,
  getArtifacts,
  rotateFrom,
  seededOffset,
} from './shared';
import { getScrapbookArtifacts } from './StyleTemplates';

export interface ViewerEngineProps {
  data: XsoData;
  initialSide?: number;
}

export function LoopViewer({ data, initialSide = 0 }: ViewerEngineProps) {
  const artifacts = getArtifacts(data);
  const initialOrder = useMemo(
    () => rotateFrom(artifacts.map((artifact) => artifact.id), initialSide),
    // The order is intentionally initialized once per mounted style engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [order, setOrder] = useState(initialOrder);
  const ordered = order.map(
    (id) => artifacts.find((artifact) => artifact.id === id)!,
  );

  return (
    <ViewerStage
      label="Infinite memory loop"
      className="border-white/[0.08] bg-[#111316]"
    >
      <DeskBackdrop />
      {ordered.map((artifact, depth) => (
        <TossCard
          key={artifact.id}
          artifact={artifact}
          active={depth === 0}
          depth={depth}
          zIndex={ordered.length - depth}
          onToss={() =>
            setOrder((current) => [...current.slice(1), current[0]])
          }
        />
      ))}
      <Hint>Flick the top memory · it loops forever</Hint>
    </ViewerStage>
  );
}

export function ScrapbookViewer({
  data,
  initialSide = 0,
}: ViewerEngineProps) {
  const artifacts = getScrapbookArtifacts(data);
  const start = Math.max(0, Math.min(artifacts.length - 1, initialSide));
  const [discarded, setDiscarded] = useState(start);

  if (discarded >= artifacts.length) {
    const placements = [
      'left-[12%] top-8',
      'right-[12%] top-20',
      'left-[25%] top-[38%]',
      'bottom-16 right-[20%]',
    ];

    return (
      <ViewerStage
        label="Scrapbook flat-lay"
        className="border-[#785638] bg-[#a77d50]"
      >
        <CraftPaper />
        <ScrapbookDecor />
        {artifacts.map((artifact, index) => (
          <motion.div
            key={artifact.id}
            className={`absolute w-[290px] overflow-visible ${placements[index]}`}
            initial={{ opacity: 0, scale: 0.45, y: 90 }}
            animate={{
              opacity: 1,
              scale: [0.66, 0.7, 0.64, 0.68][index],
              x: seededOffset(data.id, index * 3, 8),
              y: seededOffset(data.id, index * 3 + 1, 8),
              rotate:
                [-4, 5, -2, 4][index] +
                seededOffset(data.id, index * 3 + 2, 1.2),
            }}
            transition={{ ...SPRING, delay: index * 0.08 }}
            style={{
              transformOrigin: index % 2 === 0 ? 'top left' : 'top right',
              zIndex: 5 + index,
            }}
          >
            <div className="flex min-h-[260px] items-center justify-center">
              {artifact.content}
            </div>
          </motion.div>
        ))}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.4 }}
          onClick={() => setDiscarded(0)}
          className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/75 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white shadow-xl"
        >
          ✦ Relive Memories
        </motion.button>
      </ViewerStage>
    );
  }

  return (
    <ViewerStage
      label="Scrapbook memory stack"
      className="border-[#785638] bg-[#a77d50]"
    >
      <CraftPaper />
      <ScrapbookDecor />
      {artifacts.map((artifact, index) => {
        if (index < discarded) return null;
        const depth = index - discarded;
        return (
          <TossCard
            key={artifact.id}
            artifact={artifact}
            active={depth === 0}
            depth={depth}
            zIndex={artifacts.length - depth}
            onToss={() => setDiscarded((value) => value + 1)}
          />
        );
      })}
      <Hint>Discard each paper to build the flat-lay</Hint>
    </ViewerStage>
  );
}

function CraftPaper() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-75"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 24% 18%, rgba(255,225,180,.18), transparent 34%), radial-gradient(rgba(55,31,14,.3) .65px, transparent .9px), repeating-linear-gradient(14deg, transparent 0 6px, rgba(65,37,17,.08) 7px, transparent 9px)',
        backgroundSize: 'auto, 6px 7px, auto',
      }}
      aria-hidden
    />
  );
}

function ScrapbookDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      <div
        className="absolute left-[7%] top-[10%] h-28 w-44 rotate-[-4deg] bg-[#eee4ca] opacity-80 shadow-[0_8px_18px_rgba(50,29,14,.24)]"
        style={{
          clipPath:
            'polygon(0 4%,7% 0,14% 5%,22% 1%,30% 6%,39% 2%,47% 5%,56% 0,65% 5%,74% 1%,83% 6%,92% 2%,100% 5%,100% 96%,91% 100%,82% 95%,73% 99%,64% 94%,54% 100%,44% 95%,34% 99%,24% 94%,13% 100%,0 95%)',
        }}
      />
      <div className="absolute right-[9%] top-[8%] h-20 w-20 rotate-12 rounded-full border-2 border-[#854f48]/45 text-center font-mono text-[7px] uppercase leading-[80px] text-[#854f48]/55">
        air mail
      </div>
      <span className="absolute bottom-[23%] left-[7%] text-xl text-[#b9974d] drop-shadow-md">
        ✦
      </span>
      <span className="absolute right-[10%] top-[46%] text-sm text-[#6f7d70] drop-shadow">
        ★
      </span>
      <span className="absolute bottom-[8%] left-[46%] h-16 w-5 rotate-[18deg] rounded-full border-[3px] border-slate-500/70 shadow-md">
        <span className="absolute inset-[3px] rounded-full border border-slate-400/70" />
      </span>
    </div>
  );
}

function DeskBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(91,99,106,.22) 0%, rgba(27,30,34,.68) 44%, rgba(7,8,10,.96) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 1px, transparent 1px 4px)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-8 left-1/2 h-24 w-[72%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-2xl"
        aria-hidden
      />
    </>
  );
}

export function RewindViewer({ data, initialSide = 0 }: ViewerEngineProps) {
  const artifacts = getArtifacts(data);
  const start = Math.max(0, Math.min(artifacts.length - 1, initialSide));
  const [discarded, setDiscarded] = useState(start);
  const [recalling, setRecalling] = useState(false);

  const recall = () => {
    setRecalling(true);
    setDiscarded(0);
  };

  return (
    <ViewerStage
      label="Time-rewind paper stack"
      className="border-white/[0.08] bg-[#111316]"
    >
      <DeskBackdrop />
      {artifacts.map((artifact, index) => {
        if (index < discarded) return null;
        const depth = index - discarded;
        return (
          <motion.div
            key={artifact.id}
            className="absolute inset-0"
            style={{ zIndex: artifacts.length - depth }}
            initial={
              recalling
                ? {
                    x: index % 2 === 0 ? -600 : 600,
                    y: 260,
                    rotate: index % 2 === 0 ? -35 : 35,
                    opacity: 0,
                  }
                : false
            }
            animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            transition={{ ...SPRING, delay: (artifacts.length - 1 - index) * 0.15 }}
            onAnimationComplete={() => {
              if (index === 0) setRecalling(false);
            }}
          >
            <TossCard
              artifact={artifact}
              active={depth === 0 && !recalling}
              depth={depth}
              zIndex={artifacts.length - depth}
              onToss={() => setDiscarded((value) => value + 1)}
            />
          </motion.div>
        );
      })}

      {discarded >= artifacts.length && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          onClick={recall}
          className="absolute inset-0 m-auto h-fit w-fit rounded-full border border-cyber/50 bg-cyber/10 px-5 py-3 font-mono text-xs uppercase tracking-wider text-cyber"
        >
          ↺ Recall Papers
        </motion.button>
      )}
      {discarded < artifacts.length && !recalling && (
        <Hint>Send them away · call every paper back</Hint>
      )}
    </ViewerStage>
  );
}

export function ViewerStage({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative h-[620px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#120f0c] ${className}`}
      aria-label={label}
    >
      {children}
    </section>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="pointer-events-none absolute inset-x-0 bottom-2 z-40 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
      {children}
    </p>
  );
}
