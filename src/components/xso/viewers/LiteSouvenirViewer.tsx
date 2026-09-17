'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { XsoData } from '@/types/xso';
import { SPRING, playMechanicalCue } from '@/components/xso/viewers/shared';
import {
  LoopViewer,
  RewindViewer,
  ScrapbookViewer,
} from '@/components/xso/viewers/StackViewers';
import { AccordionViewer } from '@/components/xso/viewers/MechanicalViewers';
import { MovieMemoryFrame } from '@/components/xso/viewers/StyleTemplates';

/** CSS / DOM souvenir engines for devices that cannot run WebGL reliably. */
export function LiteSouvenirViewer({
  data,
  initialSide = 0,
}: {
  data: XsoData;
  initialSide?: number;
}) {
  return (
    <div className="lite-souvenir relative h-full min-h-[320px] w-full overflow-hidden bg-[#0b0c0e]">
      <div className="absolute inset-0 overflow-auto [&_section]:!h-full [&_section]:!min-h-full [&_section]:!rounded-none [&_section]:!border-0">
        <LiteEngine data={data} initialSide={initialSide} />
      </div>
      <p className="pointer-events-none absolute left-3 top-3 z-40 rounded bg-black/70 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-white/55">
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
      return <LoopViewer data={data} initialSide={initialSide} />;
    case 'rewind':
      return <RewindViewer data={data} initialSide={initialSide} />;
    case 'scrapbook':
      return <ScrapbookViewer data={data} initialSide={initialSide} />;
    case 'accordion':
      return <AccordionViewer data={data} initialSide={initialSide} />;
    case 'moviebox':
      return <LiteMovieBox data={data} initialSide={initialSide} />;
    default:
      return <LoopViewer data={data} initialSide={initialSide} />;
  }
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
      className="relative h-full w-full overflow-hidden bg-[#12070c]"
      aria-label="Lite film projector"
    >
      <div className="absolute inset-x-4 top-10 bottom-24 overflow-hidden rounded-sm border border-[#5c3d28]/50 bg-black shadow-[inset_0_0_40px_#000]">
        <MovieMemoryFrame data={data} index={frame} />
      </div>
      <p className="pointer-events-none absolute left-4 top-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#ffb86a]/80">
        35mm archive · frame {String(frame + 1).padStart(2, '0')}
      </p>
      <motion.button
        type="button"
        onClick={() => {
          playMechanicalCue('clack');
          setTurn((value) => value + 1);
        }}
        whileTap={{ scale: 0.94, rotate: -18 }}
        transition={SPRING}
        className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-md border border-[#5c3d28]/60 bg-[#2a1810] px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#ffe8c8]"
        aria-label="Crank / advance"
      >
        <span
          className="grid h-9 w-9 place-items-center rounded-full border border-[#a67c52]/50"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, #e8b878 0%, #b8864a 42%, #6b4423 100%)',
          }}
          aria-hidden
        />
        Crank / advance
      </motion.button>
    </section>
  );
}
