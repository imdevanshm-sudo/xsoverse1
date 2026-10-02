'use client';

import { memo, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CUSTOM_MODULE_META, MIN_CUSTOM_MODULES } from '@/lib/formats';
import { CINEMA_EASE } from '@/lib/motion';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import { EditorRow, TONES, useOpenSet, type ToneName } from '@/components/xso/editors/kit';
import { CUSTOM_MODULES, type CustomModule } from '@/types/xso';

/** Fanned miniature of the stack: one card per layer, in the order they'll open. */
const StackCanvas = memo(function StackCanvas({ modules }: { modules: CustomModule[] }) {
  const reduce = useReducedMotion();
  const mid = (modules.length - 1) / 2;
  return (
    <div
      aria-hidden
      className="relative flex h-[132px] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_35%,#3b1828,#170c12_75%)]"
    >
      <AnimatePresence initial={false}>
        {modules.map((m, i) => {
          const meta = CUSTOM_MODULE_META[m];
          return (
            <motion.div
              key={m}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 28, scale: 0.8 }}
              animate={{ opacity: 1, y: Math.abs(i - mid) * 4, scale: 1, rotate: (i - mid) * 7 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.8 }}
              transition={{ duration: 0.45, ease: CINEMA_EASE }}
              className="relative -mx-2.5 h-[96px] w-[76px] shrink-0 overflow-hidden rounded-lg border border-white/25 bg-[#1a0f14] shadow-[0_10px_22px_rgba(0,0,0,.5)]"
              style={{ zIndex: i + 1 }}
            >
              <StyleThumb style={meta.style} sizes="76px" />
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 text-[9.5px] font-semibold text-white">
                <span>{i + 1}</span>
                <span>{meta.emoji}</span>
                <span className="truncate">{meta.short}</span>
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <span className="absolute right-2.5 top-2 rounded-full bg-black/55 px-2 py-0.5 font-receipt text-[9.5px] uppercase tracking-[0.14em] text-white/80">
        {modules.length} layers
      </span>
    </div>
  );
});

function nextModules(modules: CustomModule[], id: CustomModule, on: boolean) {
  return CUSTOM_MODULES.filter((m) => (m === id ? on : modules.includes(m)));
}

/**
 * "Make your own style": toggle keepsake layers on and off to build the stack.
 * With `renderEditor`, each checked layer expands into that format's editor.
 */
export const CustomBuilderCanvas = memo(function CustomBuilderCanvas({
  modules,
  onModules,
  tone = 'dark',
  renderEditor,
  onFocusLayer,
}: {
  modules: CustomModule[];
  onModules: (modules: CustomModule[]) => void;
  tone?: ToneName;
  renderEditor?: (module: CustomModule) => ReactNode;
  /** Index into `CUSTOM_MODULES` of the layer being edited, for the live preview. */
  onFocusLayer?: (index: number) => void;
}) {
  const t = TONES[tone];
  const [open, setOpen] = useOpenSet<CustomModule>();
  const focus = (m: CustomModule) => onFocusLayer?.(CUSTOM_MODULES.indexOf(m));

  return (
    <div className="grid gap-3">
      <StackCanvas modules={modules} />
      <ul className="m-0 grid list-none gap-2 p-0" aria-label="Keepsake layers">
        {CUSTOM_MODULES.map((m) => {
          const meta = CUSTOM_MODULE_META[m];
          const checked = modules.includes(m);
          const lockedOn = checked && modules.length <= MIN_CUSTOM_MODULES;
          const toggle = () => {
            onModules(nextModules(modules, m, !checked));
            if (!checked) focus(m);
            if (renderEditor) setOpen(m, false);
          };
          if (renderEditor) {
            return (
              <EditorRow
                key={m}
                t={t}
                label={`${meta.emoji} ${meta.label}`}
                detail={meta.detail}
                checked={checked}
                lockedOn={lockedOn}
                open={open.has(m)}
                onToggle={toggle}
                onExpand={() => {
                  if (!open.has(m)) focus(m);
                  setOpen(m);
                }}
              >
                {checked && open.has(m) ? renderEditor(m) : null}
              </EditorRow>
            );
          }
          return (
            <li key={m}>
              <label
                className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-3 py-2 transition-colors ${checked ? t.rowOn : t.row} ${lockedOn ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  disabled={lockedOn}
                  onChange={toggle}
                />
                <span
                  aria-hidden
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#f9a8d4] ${checked ? t.boxOn : t.box} ${lockedOn ? 'opacity-60' : ''}`}
                >
                  {checked ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                </span>
                <span className="text-[20px]" aria-hidden>
                  {meta.emoji}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[14.5px] font-semibold leading-tight ${t.label}`}>
                    {meta.label}
                  </span>
                  <span className={`block text-[12px] leading-snug ${t.detail}`}>
                    {meta.detail}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className={`px-1 text-[12px] ${t.detail} opacity-80`}>
        Pick at least {MIN_CUSTOM_MODULES}. They open one after another, top to bottom.
      </p>
    </div>
  );
});
