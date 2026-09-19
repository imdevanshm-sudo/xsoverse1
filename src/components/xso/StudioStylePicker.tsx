'use client';

import { memo, useCallback } from 'react';
import { useXsoStore } from '@/store/useXsoStore';
import { STYLE_OPTIONS } from '@/lib/styleOptions';
import type { GiftStyle } from '@/types/xso';

/** Isolated style picker — only re-renders when giftStyle changes. */
export const StudioStylePicker = memo(function StudioStylePicker() {
  const giftStyle = useXsoStore((s) => s.giftStyle);
  const setField = useXsoStore((s) => s.setField);

  const onSelect = useCallback(
    (id: GiftStyle) => {
      setField('giftStyle', id);
    },
    [setField],
  );

  return (
    <section className="xso-panel">
      <div className="mb-xso-3">
        <p className="font-display text-lg font-bold uppercase tracking-tight text-white">
          Choose Souvenir Style
        </p>
        <p className="mt-1 text-xs text-white/45">
          Pick the physical interaction your recipient will unwrap.
        </p>
      </div>
      <div
        className="grid gap-xso-2 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Souvenir style"
      >
        {STYLE_OPTIONS.map((style) => {
          const selected = giftStyle === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(style.id)}
              className={`relative flex gap-3 overflow-hidden rounded-xso-panel border p-3 text-left transition-colors ${
                selected
                  ? 'border-acid bg-acid/10'
                  : 'border-white/10 bg-black/15 hover:border-white/25'
              }`}
            >
              {selected && (
                <span className="pointer-events-none absolute inset-0 rounded-xso-panel ring-1 ring-acid/40" />
              )}
              <span className="relative text-xl leading-none" aria-hidden>
                {style.icon}
              </span>
              <span className="relative min-w-0">
                <span
                  className={`block font-display text-xs font-bold ${
                    selected ? 'text-acid' : 'text-white'
                  }`}
                >
                  {style.title}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-white/45">
                  {style.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});
