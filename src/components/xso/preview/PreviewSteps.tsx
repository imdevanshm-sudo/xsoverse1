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
        <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[#5c5043]">
          <span className="font-bold text-[#2f5443]">Step 1</span>
          <span className="text-[#9a8a73]">of 2</span>
          <span className="text-[#9a8a73]">·</span>
          <span>Preview</span>
        </p>
        <p
          className="flex shrink-0 items-center gap-1 tabular-nums text-[#5c5043]"
          aria-live="polite"
        >
          {done ? (
            <Check className="h-3 w-3 text-[#2f5443]" strokeWidth={3} aria-hidden />
          ) : null}
          <span className="font-bold text-[#2b2621]">
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
        <div className="h-1.5 overflow-hidden rounded-full bg-[#2b2621]/10">
          <div
            className="h-full origin-left rounded-full bg-[#7d8f6e] transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${fill})` }}
          />
        </div>
        <div
          className={`h-1.5 rounded-full border border-dashed transition-colors duration-300 ${
            done ? 'border-[#2f5443] bg-[#2f5443]/20' : 'border-[#b9ab94]'
          }`}
          title="Step 2 · Customize"
        />
      </div>
      <div className="mt-1 grid grid-cols-[3fr_2fr] gap-1.5 font-receipt text-[10px] uppercase tracking-[0.14em] text-[#9a8a73]">
        <span className="truncate">Preview{label ? ` · ${label}` : ''}</span>
        <span className={done ? 'font-bold text-[#2f5443]' : ''}>Customize →</span>
      </div>
    </div>
  );
}
