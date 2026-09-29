'use client';

import { Check } from 'lucide-react';

/**
 * Two-step flow indicator. The count tracks the card on top; the Preview
 * segment fills as distinct memories are seen, leading into Customize.
 */
export function PreviewSteps({
  current,
  explored,
  total,
  label,
}: {
  current: number;
  explored: number;
  total: number;
  label?: string;
}) {
  const done = explored >= total;
  const fill = Math.max(0.08, Math.min(1, explored / total));

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between gap-3 whitespace-nowrap font-receipt text-[11px] uppercase tracking-[0.12em]">
        <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[#b3a794]">
          <span className="font-bold text-[#a3b48f]">Step 1</span>
          <span className="text-[#7d7264]">of 2</span>
          <span className="text-[#7d7264]">·</span>
          <span>Preview</span>
        </p>
        <p
          className="flex shrink-0 items-center gap-1 tabular-nums text-[#b3a794]"
          aria-live="polite"
        >
          {done ? (
            <Check className="h-3 w-3 text-[#a3b48f]" strokeWidth={3} aria-hidden />
          ) : null}
          <span className="font-bold text-[#f1e8d8]">
            {current}/{total}
          </span>
          memories
        </p>
      </div>
      <div
        className="grid grid-cols-[3fr_2fr] gap-1.5"
        role="progressbar"
        aria-label="Preview progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(explored, total)}
        aria-valuetext={`${explored} of ${total} memories seen`}
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-[#f1e8d8]/10">
          <div
            className="h-full origin-left rounded-full bg-[#a3b48f] transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${fill})` }}
          />
        </div>
        <div
          className={`h-1.5 rounded-full border border-dashed transition-colors duration-300 ${
            done ? 'border-[#c9805e] bg-[#c9805e]/25' : 'border-[#5a534b]'
          }`}
          title="Step 2 · Customize"
        />
      </div>
      <div className="mt-1 hidden grid-cols-[3fr_2fr] gap-1.5 font-receipt text-[10px] uppercase tracking-[0.14em] text-[#7d7264] sm:grid">
        <span className="truncate">Preview{label ? ` · ${label}` : ''}</span>
        <span className={done ? 'font-bold text-[#c9805e]' : ''}>Customize →</span>
      </div>
    </div>
  );
}
