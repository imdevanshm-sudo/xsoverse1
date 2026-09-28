'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import type { AuditMetrics, LineItem } from '@/types/xso';
import { StudioStylePicker } from '@/components/xso/StudioStylePicker';
import { STUDIO_STEPS } from '@/lib/studioSteps';

const METRIC_LABELS: Record<keyof AuditMetrics, string> = {
  chaos: 'Chaos',
  loyalty: 'Loyalty',
  snacking: 'Snacking',
  advice: 'Bad Advice',
  support: 'Emotional Support',
};

const METRIC_KEYS = Object.keys(METRIC_LABELS) as (keyof AuditMetrics)[];

type TextFieldKey =
  | 'billerName'
  | 'customerName'
  | 'occasion'
  | 'timestamp'
  | 'merchantName'
  | 'cashier'
  | 'certifiedStampText'
  | 'subtotal'
  | 'emotionalTax'
  | 'total'
  | 'birthdayMessage'
  | 'scratchOffReward';

type FlagKind = 'greenFlags' | 'redFlags';

/** Store actions are stable references, so one shallow selector is enough. */
function useXsoActions() {
  return useXsoStore(
    useShallow((s) => ({
      setField: s.setField,
      setAuditMetric: s.setAuditMetric,
      addLineItem: s.addLineItem,
      updateLineItem: s.updateLineItem,
      removeLineItem: s.removeLineItem,
      moveLineItem: s.moveLineItem,
      addFlag: s.addFlag,
      updateFlag: s.updateFlag,
      removeFlag: s.removeFlag,
      addPhoto: s.addPhoto,
      updatePhoto: s.updatePhoto,
      removePhoto: s.removePhoto,
    })),
  );
}

/**
 * Stable React keys for plain string lists (flags, photos). Items are only
 * appended at the end or removed by index, so a parallel id list is enough.
 */
function useStableKeys(length: number, prefix: string) {
  const keys = useRef<string[]>([]);
  const counter = useRef(0);
  while (keys.current.length < length) {
    keys.current.push(`${prefix}-${counter.current++}`);
  }
  if (keys.current.length > length) keys.current.length = length;
  const removeKey = useCallback((index: number) => {
    keys.current.splice(index, 1);
  }, []);
  return [keys.current, removeKey] as const;
}

interface XsoEditorProps {
  showStylePicker?: boolean;
  step: number;
  onStepChange: (step: number) => void;
}

export function XsoEditor({
  showStylePicker = false,
  step,
  onStepChange,
}: XsoEditorProps) {
  const active = STUDIO_STEPS[step]?.id ?? 'lore';

  return (
    <div className="space-y-xso-4">
      {showStylePicker ? <StudioStylePicker /> : null}

      <StudioStepper step={step} onStepChange={onStepChange} />

      <div
        className="xso-panel"
        role="tabpanel"
        id={`studio-step-${active}`}
        aria-labelledby={`studio-tab-${active}`}
      >
        {active === 'lore' && <LoreStep />}
        {active === 'lines' && <LinesStep />}
        {active === 'audit' && <AuditStep />}
        {active === 'letter' && <LetterStep />}
      </div>
    </div>
  );
}

const StudioStepper = memo(function StudioStepper({
  step,
  onStepChange,
}: {
  step: number;
  onStepChange: (step: number) => void;
}) {
  const progress = ((step + 1) / STUDIO_STEPS.length) * 100;

  return (
    <div className="studio-stepper sticky top-[var(--xso-header-h,0px)] z-20 -mx-3.5 border-b border-white/10 bg-[#0b0f12] px-3.5 pb-2 pt-2 sm:-mx-5 sm:px-5">
      <ol
        className="m-0 grid list-none grid-cols-4 gap-1 p-0"
        role="tablist"
        aria-label="Customize steps"
      >
        {STUDIO_STEPS.map((item, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                role="tab"
                id={`studio-tab-${item.id}`}
                aria-selected={current}
                aria-controls={`studio-step-${item.id}`}
                aria-label={`Step ${index + 1}: ${item.label}`}
                onClick={() => onStepChange(index)}
                className={`studio-step flex w-full min-w-0 touch-manipulation items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors duration-150 ${
                  current ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[10px] font-bold tabular-nums ${
                    current
                      ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-[#0b0f12]'
                      : done
                        ? 'border-[color:var(--accent)] text-[color:var(--accent)]'
                        : 'border-white/20 text-white/45'
                  }`}
                  aria-hidden
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={`truncate font-mono text-[10px] uppercase tracking-[0.08em] sm:text-[11px] ${
                    current ? 'text-white' : done ? 'text-white/70' : 'text-white/45'
                  }`}
                >
                  <span className="sm:hidden lg:inline xl:hidden">{item.short}</span>
                  <span className="hidden sm:inline lg:hidden xl:inline">
                    {item.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div
        className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STUDIO_STEPS.length}
        aria-valuenow={step + 1}
        aria-label="Customize progress"
      >
        <div
          className="h-full origin-left rounded-full bg-[color:var(--accent)] transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
    </div>
  );
});

const StoreField = memo(function StoreField({
  field,
  label,
  className,
  multiline = false,
}: {
  field: TextFieldKey;
  label: string;
  className?: string;
  multiline?: boolean;
}) {
  const value = useXsoStore((s) => s[field]);
  const setField = useXsoStore((s) => s.setField);

  return (
    <Field label={label} className={className}>
      {multiline ? (
        <textarea
          className="field min-h-[120px] resize-y"
          value={value}
          onChange={(e) => setField(field, e.target.value)}
        />
      ) : (
        <input
          className="field"
          value={value}
          onChange={(e) => setField(field, e.target.value)}
        />
      )}
    </Field>
  );
});

function LoreStep() {
  return (
    <div className="space-y-3">
      <SectionTitle>Lore & Names</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <StoreField field="billerName" label="Biller Name" />
        <StoreField field="customerName" label="Customer" />
        <StoreField field="occasion" label="Occasion" />
        <StoreField field="timestamp" label="Timestamp" />
        <StoreField field="merchantName" label="Merchant Name" />
        <StoreField field="cashier" label="Cashier" />
        <StoreField
          field="certifiedStampText"
          label="Certified Stamp Text"
          className="sm:col-span-2"
        />
      </div>
    </div>
  );
}

function LinesStep() {
  const lineItems = useXsoStore((s) => s.lineItems);
  const { addLineItem } = useXsoActions();
  const last = lineItems.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Line Items</SectionTitle>
        <AddButton onClick={addLineItem}>Add</AddButton>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {lineItems.map((item, index) => (
          <LineItemRow
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === last}
          />
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-3">
        <StoreField field="subtotal" label="Subtotal" />
        <StoreField field="emotionalTax" label="Emotional Tax" />
        <StoreField field="total" label="Total" />
      </div>
    </div>
  );
}

const LineItemRow = memo(function LineItemRow({
  item,
  isFirst,
  isLast,
}: {
  item: LineItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { updateLineItem, moveLineItem, removeLineItem } = useXsoActions();
  const { id } = item;

  return (
    <li className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-[4rem_1fr_5rem_auto]">
      <Field label="Qty">
        <input
          className="field tabular-nums"
          value={item.qty}
          onChange={(e) => updateLineItem(id, { qty: e.target.value })}
        />
      </Field>
      <Field label="Description">
        <input
          className="field"
          value={item.description}
          onChange={(e) => updateLineItem(id, { description: e.target.value })}
        />
      </Field>
      <Field label="Price">
        <input
          className="field tabular-nums"
          value={item.price}
          onChange={(e) => updateLineItem(id, { price: e.target.value })}
        />
      </Field>
      <div className="flex items-end gap-1">
        <IconBtn
          label="Move up"
          disabled={isFirst}
          onClick={() => moveLineItem(id, 'up')}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn
          label="Move down"
          disabled={isLast}
          onClick={() => moveLineItem(id, 'down')}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn label="Delete" onClick={() => removeLineItem(id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconBtn>
      </div>
    </li>
  );
});

function AuditStep() {
  return (
    <div className="space-y-5">
      <SectionTitle>Audit Stats</SectionTitle>
      <ul className="m-0 list-none space-y-3 p-0">
        {METRIC_KEYS.map((key) => (
          <AuditSlider key={key} metric={key} label={METRIC_LABELS[key]} />
        ))}
      </ul>

      <FlagEditor title="Green Flags" kind="greenFlags" />
      <FlagEditor title="Red Flags" kind="redFlags" />
    </div>
  );
}

/** Local value while dragging; commits to the store at most once per frame. */
const AuditSlider = memo(function AuditSlider({
  metric,
  label,
}: {
  metric: keyof AuditMetrics;
  label: string;
}) {
  const storeValue = useXsoStore((s) => s.auditMetrics[metric]);
  const setAuditMetric = useXsoStore((s) => s.setAuditMetric);
  const [value, setValue] = useState(storeValue);
  const dragging = useRef(false);
  const pending = useRef(storeValue);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!dragging.current) setValue(storeValue);
  }, [storeValue]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const commitNow = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setAuditMetric(metric, pending.current);
  }, [metric, setAuditMetric]);

  const onChange = (next: number) => {
    setValue(next);
    pending.current = next;
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setAuditMetric(metric, pending.current);
      });
    }
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    commitNow();
  };

  return (
    <li>
      <div className="mb-1 flex justify-between font-mono text-[11px] uppercase tracking-wide text-white/70">
        <span>{label}</span>
        <span className="tabular-nums text-[color:var(--accent)]">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onPointerDown={() => {
          dragging.current = true;
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onBlur={endDrag}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-range w-full touch-pan-y"
        aria-label={label}
      />
    </li>
  );
});

function FlagEditor({ title, kind }: { title: string; kind: FlagKind }) {
  const items = useXsoStore((s) => s[kind]);
  const { addFlag, updateFlag, removeFlag } = useXsoActions();
  const [keys, removeKey] = useStableKeys(items.length, kind);

  const onUpdate = useCallback(
    (index: number, value: string) => updateFlag(kind, index, value),
    [kind, updateFlag],
  );
  const onRemove = useCallback(
    (index: number) => {
      removeKey(index);
      removeFlag(kind, index);
    },
    [kind, removeFlag, removeKey],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>{title}</SectionTitle>
        <button
          type="button"
          onClick={() => addFlag(kind)}
          className="inline-flex items-center gap-1 text-xs text-[color:var(--accent)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((item, index) => (
          <FlagRow
            key={keys[index]}
            index={index}
            value={item}
            label={title}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </div>
  );
}

const FlagRow = memo(function FlagRow({
  index,
  value,
  label,
  onUpdate,
  onRemove,
}: {
  index: number;
  value: string;
  label: string;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <li className="flex gap-2">
      <input
        className="field"
        value={value}
        aria-label={`${label} ${index + 1}`}
        onChange={(e) => onUpdate(index, e.target.value)}
      />
      <IconBtn label={`Remove ${label}`} onClick={() => onRemove(index)}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconBtn>
    </li>
  );
});

function LetterStep() {
  const photos = useXsoStore((s) => s.photos);
  const voiceNoteUrl = useXsoStore((s) => s.voiceNoteUrl);
  const { addPhoto, updatePhoto, removePhoto, setField } = useXsoActions();
  const [keys, removeKey] = useStableKeys(photos.length, 'photo');

  const onRemovePhoto = useCallback(
    (index: number) => {
      removeKey(index);
      removePhoto(index);
    },
    [removeKey, removePhoto],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Photos</SectionTitle>
        <AddButton onClick={() => addPhoto()}>Add photo</AddButton>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        {photos.map((url, index) => (
          <PhotoRow
            key={keys[index]}
            index={index}
            url={url}
            onUpdate={updatePhoto}
            onRemove={onRemovePhoto}
          />
        ))}
      </ul>

      <StoreField field="birthdayMessage" label="Birthday Message" multiline />
      <Field label="Voice Note URL (optional)">
        <input
          className="field"
          value={voiceNoteUrl ?? ''}
          onChange={(e) => setField('voiceNoteUrl', e.target.value || undefined)}
          placeholder="https://..."
        />
      </Field>
      <StoreField field="scratchOffReward" label="Scratch-off Reward" />
    </div>
  );
}

const PhotoRow = memo(function PhotoRow({
  index,
  url,
  onUpdate,
  onRemove,
}: {
  index: number;
  url: string;
  onUpdate: (index: number, url: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <li className="flex gap-2">
      <input
        className="field"
        value={url}
        aria-label={`Photo ${index + 1} URL`}
        onChange={(e) => onUpdate(index, e.target.value)}
        placeholder="Image URL or data URI"
      />
      <IconBtn label="Remove photo" onClick={() => onRemove(index)}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconBtn>
    </li>
  );
});

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] transition-colors hover:bg-white/[0.04]"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-lg font-bold uppercase tracking-tight text-white">
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">
        {label}
      </span>
      {children}
    </label>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 text-white/70 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
