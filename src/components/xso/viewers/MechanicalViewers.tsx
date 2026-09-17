'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { XsoData } from '@/types/xso';
import {
  HEAVY_SPRING,
  SPRING,
  TossCard,
  playMechanicalCue,
  seededOffset,
} from './shared';
import { ViewerStage, type ViewerEngineProps } from './StackViewers';
import {
  AccordionPanel,
  getCorkboardArtifacts,
} from './StyleTemplates';

export function AccordionViewer({ data, initialSide = 0 }: ViewerEngineProps) {
  const panelCount = 4;
  const panelHeight = 500;
  const initialY =
    -Math.max(0, Math.min(panelCount - 1, initialSide)) * panelHeight;

  return (
    <ViewerStage
      label="Connected accordion souvenir"
      className="border-[#46382e] bg-[radial-gradient(ellipse_at_center,#40352e_0%,#171311_78%)]"
    >
      <motion.div
        className="absolute inset-x-5 top-12 cursor-grab active:cursor-grabbing"
        initial={{ y: initialY }}
        drag="y"
        dragConstraints={{
          top: -(panelCount * panelHeight - 540),
          bottom: 0,
        }}
        dragElastic={0.18}
        dragTransition={{ bounceStiffness: 140, bounceDamping: 34 }}
        transition={HEAVY_SPRING}
      >
        {Array.from({ length: panelCount }).map((_, index) => (
          <div key={index} className="relative h-[500px]">
            {index > 0 && (
              <div
                className="absolute inset-x-0 -top-3 z-20 h-6 border-y border-dashed border-[#6d5946]/45 bg-[#dcc8a8]"
                aria-hidden
              />
            )}
            <motion.div
              className="h-full overflow-hidden rounded-sm shadow-[0_18px_42px_rgba(0,0,0,.5),inset_0_0_18px_rgba(74,52,31,.08)]"
              animate={{ rotateX: index % 2 === 0 ? 0.8 : -0.8 }}
              transition={HEAVY_SPRING}
              style={{ transformOrigin: index % 2 === 0 ? 'bottom' : 'top' }}
            >
              <AccordionPanel data={data} index={index} />
            </motion.div>
          </div>
        ))}
      </motion.div>
      <p className="absolute inset-x-0 bottom-2 z-30 text-center font-mono text-[9px] uppercase tracking-wider text-white/40">
        Pull the connected ribbon up and down
      </p>
    </ViewerStage>
  );
}

interface Pin {
  index: number;
  x: number;
  y: number;
  rotate: number;
}

export function CorkboardViewer({ data, initialSide = 0 }: ViewerEngineProps) {
  const artifacts = getCorkboardArtifacts(data);
  const start = Math.max(0, Math.min(artifacts.length - 1, initialSide));
  const [active, setActive] = useState(start);
  const [pins, setPins] = useState<Pin[]>([]);

  const pinCurrent = (direction: -1 | 1) => {
    const pinIndex = pins.length;
    const edge = pinIndex % 4;
    const x =
      edge === 0
        ? -94
        : edge === 1
          ? 94
          : seededOffset(data.id, pinIndex * 4, 70);
    const y =
      edge === 2
        ? -178
        : edge === 3
          ? 178
          : seededOffset(data.id, pinIndex * 4 + 1, 135);

    setPins((value) => [
      ...value,
      {
        index: active,
        x: x + direction * 5,
        y,
        rotate: seededOffset(data.id, pinIndex * 4 + 2, 10),
      },
    ]);
    playMechanicalCue('tack');
    setActive((value) => value + 1);
  };

  return (
    <ViewerStage
      label="Corkboard souvenir"
      className="border-[10px] border-[#5a301b] bg-[#a8683c] shadow-[inset_0_0_0_3px_#2d170d,inset_0_0_30px_rgba(62,28,11,.42)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 40%, rgba(64,31,12,.6) 0 1px, transparent 1.7px), radial-gradient(ellipse at 70% 60%, rgba(246,180,111,.45) 0 1px, transparent 1.8px), repeating-linear-gradient(28deg, transparent 0 7px, rgba(75,38,17,.08) 8px 9px)',
          backgroundPosition: '0 0, 4px 5px, 0 0',
          backgroundSize: '9px 8px, 11px 10px, auto',
        }}
        aria-hidden
      />

      {pins.map((pin) => {
        const artifact = artifacts[pin.index];
        return (
          <motion.div
            key={`${artifact.id}-${pin.index}`}
            className="absolute inset-0 m-auto h-[540px] w-[340px] origin-center"
            initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
            animate={{
              x: pin.x,
              y: pin.y,
              scale: 0.7,
              rotate: pin.rotate,
            }}
            transition={SPRING}
            style={{ zIndex: 4 + pin.index }}
          >
            <div className="flex h-full items-start justify-center px-3 pt-14">
              {artifact.content}
            </div>
            <motion.span
              className="absolute right-7 top-12 z-30 h-5 w-5 rounded-full border border-[#5c0710] shadow-[1px_6px_8px_rgba(48,20,8,.6)]"
              style={{
                background:
                  'radial-gradient(circle at 32% 24%, #ffd5d9 0 7%, #e13b4a 22%, #930f20 70%, #53040d 100%)',
              }}
              initial={{ scale: 2.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...SPRING, delay: 0.25 }}
              aria-hidden
            />
          </motion.div>
        );
      })}

      {artifacts.map((artifact, index) => {
        if (index < active) return null;
        const depth = index - active;
        return (
          <TossCard
            key={artifact.id}
            artifact={artifact}
            active={depth === 0}
            depth={depth}
            zIndex={30 - depth}
            onToss={pinCurrent}
          />
        );
      })}

      {active >= artifacts.length && (
        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRING}
          onClick={() => {
            setPins([]);
            setActive(0);
          }}
          className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink/85 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white"
        >
          Clear Board
        </motion.button>
      )}
    </ViewerStage>
  );
}
