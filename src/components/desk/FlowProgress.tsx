'use client';

import { memo } from 'react';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export const FLOW_STEPS = ['Preview', 'Studio'] as const;

/**
 * "Step N of 2" meter for the sticky footer. The active segment fills with
 * `fill` (0–1); finished segments are solid, upcoming ones dashed.
 */
export const FlowProgress = memo(function FlowProgress({
  step,
  fill,
  meta,
  done = false,
  caption,
}: {
  /** 1-based step in FLOW_STEPS. */
  step: 1 | 2;
  fill: number;
  meta?: ReactNode;
  done?: boolean;
  caption?: string;
}) {
  const clamped = Math.max(0.06, Math.min(1, fill));

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between gap-3 whitespace-nowrap font-receipt text-[11px] uppercase tracking-[0.12em]">
        <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[#e0b4c6]">
          <span className="font-bold text-[#fdba74]">Step {step}</span>
          <span className="text-[#9a6a7e]">of {FLOW_STEPS.length}</span>
          <span className="text-[#9a6a7e]">·</span>
          <span className="truncate">{FLOW_STEPS[step - 1]}</span>
        </p>
        {meta ? (
          <p
            className="flex shrink-0 items-center gap-1 tabular-nums text-[#e0b4c6]"
            aria-live="polite"
          >
            {done ? <Check className="h-3 w-3 text-[#fdba74]" strokeWidth={3} aria-hidden /> : null}
            {meta}
          </p>
        ) : null}
      </div>
      <div
        className="grid grid-cols-2 gap-1.5"
        role="progressbar"
        aria-label={`Step ${step} of ${FLOW_STEPS.length}: ${FLOW_STEPS[step - 1]}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(((step - 1 + clamped) / FLOW_STEPS.length) * 100)}
      >
        {FLOW_STEPS.map((label, index) => {
          const n = index + 1;
          if (n < step) {
            return <div key={label} className="h-1.5 rounded-full bg-[#fdba74]/70" />;
          }
          if (n === step) {
            return (
              <div key={label} className="h-1.5 overflow-hidden rounded-full bg-[#fce7f3]/10">
                <div
                  className="h-full origin-left rounded-full bg-[#fdba74] transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${clamped})` }}
                />
              </div>
            );
          }
          return (
            <div
              key={label}
              className={`h-1.5 rounded-full border border-dashed transition-colors duration-300 ${
                done ? 'border-[#ec4899] bg-[#ec4899]/25' : 'border-[#6b3f4f]'
              }`}
            />
          );
        })}
      </div>
      {caption ? (
        <p className="mt-1 hidden truncate font-receipt text-[10px] uppercase tracking-[0.14em] text-[#9a6a7e] sm:block">
          {caption}
        </p>
      ) : null}
    </div>
  );
});
