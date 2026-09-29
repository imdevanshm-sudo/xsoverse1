'use client';

import { Check } from 'lucide-react';

/**
 * Two-step flow indicator. The Preview segment fills as memories are looped,
 * so the bar shows real progress toward customizing.
 */
export function PreviewSteps({
  explored,
  total,
}: {
  explored: number;
  total: number;
}) {
  const done = explored >= total;
  const fill = Math.max(0.12, Math.min(1, explored / total));

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between gap-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.14em]">
        <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-white/70">
          <span className="tabular-nums text-[#00ff66]">Step 1</span>
          <span className="text-white/35">of 2</span>
          <span className="text-white/35">·</span>
          <span>Preview</span>
        </p>
        <p
          className={`flex shrink-0 items-center gap-1 tabular-nums transition-colors duration-300 ${
            done ? 'text-[#00ff66]' : 'text-white/45'
          }`}
          aria-live="polite"
        >
          {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
          {done ? 'All looped' : `${explored}/${total} memories`}
        </p>
      </div>
      <div
        className="grid grid-cols-[3fr_2fr] gap-1.5"
        role="progressbar"
        aria-label="Preview progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(explored, total)}
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full origin-left rounded-full bg-[#00ff66] shadow-[0_0_8px_rgba(0,255,102,0.6)] transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${fill})` }}
          />
        </div>
        <div
          className={`h-1.5 rounded-full border border-dashed transition-colors duration-300 ${
            done ? 'border-[#00ff66]/60' : 'border-white/15'
          }`}
          title="Step 2 · Customize"
        />
      </div>
      <div className="mt-1 grid grid-cols-[3fr_2fr] gap-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
        <span>Preview</span>
        <span className={done ? 'text-[#00ff66]/80' : ''}>Customize →</span>
      </div>
    </div>
  );
}
