'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export const FLOW_STEPS = ['Preview', 'Studio'] as const;

/**
 * "Step N of 2" meter for the sticky footer. The active segment fills with
 * `fill` (0–1); finished segments are solid, upcoming ones dashed.
 */
export function FlowProgress({
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
        <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[#b3a794]">
          <span className="font-bold text-[#9daf88]">Step {step}</span>
          <span className="text-[#7d7264]">of {FLOW_STEPS.length}</span>
          <span className="text-[#7d7264]">·</span>
          <span className="truncate">{FLOW_STEPS[step - 1]}</span>
        </p>
        {meta ? (
          <p
            className="flex shrink-0 items-center gap-1 tabular-nums text-[#b3a794]"
            aria-live="polite"
          >
            {done ? (
              <Check className="h-3 w-3 text-[#9daf88]" strokeWidth={3} aria-hidden />
            ) : null}
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
            return <div key={label} className="h-1.5 rounded-full bg-[#9daf88]/70" />;
          }
          if (n === step) {
            return (
              <div key={label} className="h-1.5 overflow-hidden rounded-full bg-[#efe7d7]/10">
                <div
                  className="h-full origin-left rounded-full bg-[#9daf88] transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${clamped})` }}
                />
              </div>
            );
          }
          return (
            <div
              key={label}
              className={`h-1.5 rounded-full border border-dashed transition-colors duration-300 ${
                done ? 'border-[#c85a32] bg-[#c85a32]/25' : 'border-[#5a534b]'
              }`}
            />
          );
        })}
      </div>
      {caption ? (
        <p className="mt-1 hidden truncate font-receipt text-[10px] uppercase tracking-[0.14em] text-[#7d7264] sm:block">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
