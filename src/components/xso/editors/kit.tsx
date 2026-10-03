'use client';

import { memo, useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, ImagePlus, Mic, Plus, Star, Trash2, X } from 'lucide-react';
import { newId } from '@/lib/constants';
import { compressImage, readAudio } from '@/lib/media';
import { CINEMATIC } from '@/lib/motion';
import type { AuditMetrics, LineItem } from '@/types/xso';

export const TONES = {
  dark: {
    row: 'border-white/10 bg-[#21131b]',
    rowOn: 'border-[#ec4899]/55 bg-[#2a1520]',
    box: 'border-white/25 bg-transparent',
    boxOn: 'border-[#ec4899] bg-[#ec4899] text-white',
    label: 'text-[#fdf2f8]',
    detail: 'text-[#c99aae]',
    divider: 'border-white/10',
    field: 'font-receipt text-[11px] uppercase tracking-[0.14em] text-[#c99aae]',
    input:
      'w-full rounded-xl border border-white/15 bg-[#180e15] px-3 py-2.5 text-[16px] text-[#fdf2f8] placeholder:text-[#7f5466] focus:border-[#ec4899] focus:outline-none',
    button:
      'border-white/15 text-[#e0b4c6] hover:border-[#ec4899] hover:text-[#fdf2f8] focus-visible:outline-[#f9a8d4]',
    track: 'accent-[#ec4899]',
    error: 'text-[#fda4af]',
    ok: 'text-[#86efac]',
  },
  paper: {
    row: 'border-[#f0cfdc] bg-white/40',
    rowOn: 'border-[#ec4899]/45 bg-white/75',
    box: 'border-[#d9b3c2] bg-white/60',
    boxOn: 'border-[#ec4899] bg-[#ec4899] text-white',
    label: 'text-[#2d1b22]',
    detail: 'text-[#8a5f6e]',
    divider: 'border-[#f0cfdc]',
    field: 'font-receipt text-[11px] uppercase tracking-[0.14em] text-[#8a5f6e]',
    input: 'paper-field',
    button:
      'border-[#ebc3d3] bg-white/60 text-[#2d1b22] hover:border-[#ec4899] hover:text-[#ec4899] focus-visible:outline-[#ec4899]',
    track: 'accent-[#ec4899]',
    error: 'text-[#db2777]',
    ok: 'text-[#15803d]',
  },
} as const;

export type ToneName = keyof typeof TONES;
export type Tone = (typeof TONES)[ToneName];

export function Labeled({
  t,
  label,
  hint,
  children,
  className = '',
}: {
  t: Tone;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className={`flex items-baseline justify-between gap-2 ${t.field}`}>
        {label}
        {hint ? <span className="tabular-nums opacity-80">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function SmallButton({
  t,
  onClick,
  children,
  label,
  disabled,
}: {
  t: Tone;
  onClick: () => void;
  children: ReactNode;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 ${t.button}`}
    >
      {children}
    </button>
  );
}

/**
 * One collapsible section. With `checked` it's an on/off piece whose editor
 * only exists while it's on; without, it's a plain always-on section.
 */
export function EditorRow({
  t,
  label,
  detail,
  checked,
  lockedOn = false,
  open,
  onToggle,
  onExpand,
  children,
}: {
  t: Tone;
  label: string;
  detail: string;
  checked?: boolean;
  /** Can't be switched off right now (e.g. the minimum number of cards). */
  lockedOn?: boolean;
  open: boolean;
  onToggle?: () => void;
  onExpand: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelId = useId();
  const toggleable = checked !== undefined;
  const on = checked ?? true;
  const text = (
    <span className="min-w-0">
      <span className={`block text-[15px] font-semibold leading-tight ${t.label}`}>{label}</span>
      <span className={`block text-[12.5px] leading-snug ${t.detail}`}>{detail}</span>
    </span>
  );
  return (
    <li className={`rounded-2xl border transition-colors ${on ? t.rowOn : t.row}`}>
      <div className="flex min-h-[60px] items-center gap-2 px-3 py-2">
        {toggleable ? (
          <label
            className={`flex min-w-0 flex-1 items-center gap-3 py-1 ${lockedOn ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              className="peer sr-only"
              checked={on}
              disabled={lockedOn}
              onChange={() => onToggle?.()}
            />
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#f9a8d4] ${
                on ? t.boxOn : t.box
              } ${lockedOn ? 'opacity-60' : ''}`}
            >
              {on ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
            </span>
            {text}
          </label>
        ) : (
          <button
            type="button"
            onClick={onExpand}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex min-w-0 flex-1 items-center py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
          >
            {text}
          </button>
        )}
        {on ? (
          <button
            type="button"
            onClick={onExpand}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? 'Close' : 'Edit'} ${label}`}
            className={`flex h-10 shrink-0 items-center gap-1 rounded-full border px-3 font-receipt text-[10px] font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 ${t.button}`}
          >
            {open ? 'Done' : 'Edit'}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
      {on && open ? (
        <motion.div
          id={panelId}
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={CINEMATIC}
          className={`border-t px-3 pb-3.5 pt-3 ${t.divider}`}
        >
          {children}
        </motion.div>
      ) : null}
    </li>
  );
}

/** Tracks which sections are expanded; checking a piece opens it, unchecking closes it. */
export function useOpenSet<T extends string>(initial: T[] = []) {
  const [open, setOpen] = useState<Set<T>>(() => new Set(initial));
  const toggle = useCallback(
    (id: T, force?: boolean) =>
      setOpen((current) => {
        const next = new Set(current);
        const want = force ?? !next.has(id);
        if (want) next.add(id);
        else next.delete(id);
        return next;
      }),
    [],
  );
  return [open, toggle] as const;
}

const MAX_LINES = 8;

export const LineItemsEditor = memo(function LineItemsEditor({
  t,
  lineItems,
  onChange,
}: {
  t: Tone;
  lineItems: LineItem[];
  onChange: (lineItems: LineItem[]) => void;
}) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)));

  return (
    <div>
      <p className={t.field}>Line items</p>
      <ul className="m-0 mt-1.5 grid list-none gap-2 p-0">
        {lineItems.map((item, i) => (
          <li key={item.id} className="flex gap-2">
            <span className="min-w-0 flex-1">
              <input
                className={`${t.input} font-receipt uppercase`}
                value={item.description}
                placeholder="3 AM boba run"
                maxLength={32}
                aria-label={`Line ${i + 1} label`}
                onChange={(e) => update(item.id, { description: e.target.value })}
              />
            </span>
            <span className="w-[6.5rem] shrink-0">
              <input
                className={`${t.input} font-receipt tabular-nums`}
                value={item.price}
                placeholder="$40.00"
                maxLength={12}
                aria-label={`Line ${i + 1} price`}
                onChange={(e) => update(item.id, { price: e.target.value })}
              />
            </span>
            <button
              type="button"
              onClick={() => onChange(lineItems.filter((li) => li.id !== item.id))}
              disabled={lineItems.length <= 1}
              aria-label={`Remove line ${i + 1}`}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border disabled:opacity-30 focus-visible:outline focus-visible:outline-2 ${t.button}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {lineItems.length < MAX_LINES ? (
        <div className="mt-2">
          <SmallButton
            t={t}
            onClick={() =>
              onChange([...lineItems, { id: newId(), qty: '1x', description: '', price: '' }])
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add line
          </SmallButton>
        </div>
      ) : null}
    </div>
  );
});

export function AudioField({
  t,
  value,
  onChange,
  label = 'Upload a voice note · up to 1.5 MB',
}: {
  t: Tone;
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await readAudio(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      {value ? (
        <div className="flex items-center gap-2">
          <audio controls preload="none" src={value} className="h-10 min-w-0 flex-1" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Remove voice note"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border focus-visible:outline focus-visible:outline-2 ${t.button}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 ${t.button}`}
        >
          <Mic className="h-4 w-4" aria-hidden />
          {busy ? 'Pressing to tape…' : label}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error ? (
        <p role="alert" className={`text-[12.5px] ${t.error}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** One optional still: drop or tap to add, compressed to a small WebP in the browser. */
export function ImageField({
  t,
  value,
  onChange,
  label,
}: {
  t: Tone;
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className={t.field}>{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/')));
        }}
        className={`relative mt-1.5 flex h-24 items-center gap-3 overflow-hidden rounded-xl border-2 border-dashed px-3 ${t.button} ${
          over ? '!border-[#ec4899]' : ''
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-[4.5rem] w-24 shrink-0 rounded-lg object-cover"
          />
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2"
        >
          {busy ? (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
            />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden />
          )}
          {busy ? 'Developing…' : value ? 'Replace' : 'Drop or tap to add'}
        </button>
        {value && !busy ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error ? (
        <p role="alert" className={`mt-1 text-[12.5px] ${t.error}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Half-star score picker; each star's left half is the .5 step. */
export function StarPicker({
  t,
  value,
  onChange,
  label,
}: {
  t: Tone;
  value: number;
  onChange: (stars: number) => void;
  label: string;
}) {
  const steps = Array.from({ length: 10 }, (_, i) => (i + 1) / 2);
  return (
    <div>
      <p className={`flex items-baseline justify-between ${t.field}`}>
        {label}
        <span className="tabular-nums">{value.toFixed(1)} / 5</span>
      </p>
      <div role="radiogroup" aria-label={label} className="mt-1.5 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
          return (
            <span key={star} className="relative h-10 w-10">
              <Star className="absolute inset-0 m-auto h-8 w-8 text-[#fdba74]/35" aria-hidden />
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="m-1 h-8 w-8 fill-[#fdba74] text-[#fdba74]" />
              </span>
              {steps
                .filter((s) => s === star - 0.5 || s === star)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={value === s}
                    aria-label={`${s} stars`}
                    onClick={() => onChange(s)}
                    className={`absolute inset-y-0 w-1/2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4] ${
                      s === star ? 'right-0' : 'left-0'
                    }`}
                  />
                ))}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export const METRIC_LABELS: Record<keyof AuditMetrics, string> = {
  chaos: 'Chaos',
  loyalty: 'Loyalty',
  snacking: 'Snack sharing',
  advice: 'Bad advice',
  support: 'Brain cells shared',
};

export const MetricSliders = memo(function MetricSliders({
  t,
  metrics,
  onChange,
}: {
  t: Tone;
  metrics: AuditMetrics;
  onChange: (metrics: AuditMetrics) => void;
}) {
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {(Object.keys(METRIC_LABELS) as (keyof AuditMetrics)[]).map((key) => {
        const stars = Math.round((metrics[key] / 20) * 2) / 2;
        return (
          <li key={key}>
            <p className={`flex items-baseline justify-between ${t.field}`}>
              <span>{METRIC_LABELS[key]}</span>
              <span className="tabular-nums" aria-hidden>
                {'★'.repeat(Math.floor(stars))}
                {stars % 1 ? '½' : ''} {metrics[key]}
              </span>
            </p>
            <input
              type="range"
              min={0}
              max={100}
              value={metrics[key]}
              aria-label={METRIC_LABELS[key]}
              aria-valuetext={`${metrics[key]} out of 100, ${stars} stars`}
              onChange={(e) => onChange({ ...metrics, [key]: Number(e.target.value) })}
              className={`mt-1 w-full touch-pan-y ${t.track}`}
            />
          </li>
        );
      })}
    </ul>
  );
});
