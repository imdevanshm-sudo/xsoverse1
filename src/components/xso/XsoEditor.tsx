'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Mic, Plus, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import type { AuditMetrics, LineItem } from '@/types/xso';
import { STUDIO_STEPS, type StudioStepId } from '@/lib/studioSteps';
import { compressImage, readAudio } from '@/lib/media';
import { joinReward, splitReward } from '@/lib/reward';
import { FRAMES_PER_STRIP, MAX_STRIPS, blankFrame, stripCount } from '@/lib/photoStrips';

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
  | 'birthdayMessage';

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
      setPhotoAt: s.setPhotoAt,
      addPhotoStrip: s.addPhotoStrip,
      removePhotoStrip: s.removePhotoStrip,
    })),
  );
}

/**
 * Stable React keys for plain string lists (flags). Items are only appended
 * at the end or removed by index, so a parallel id list is enough.
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

/** Tabbed editor for the four cards, styled as a paper worksheet. */
export function XsoEditor({
  tab,
  onTabChange,
}: {
  tab: StudioStepId;
  onTabChange: (tab: StudioStepId) => void;
}) {
  return (
    <div>
      <div
        role="tablist"
        aria-label="Souvenir cards"
        className="sticky top-[var(--xso-header-h,0px)] z-20 -mx-4 -mt-4 mb-5 grid grid-cols-4 gap-1 rounded-t-[20px] border-b border-dashed border-[#f0cfdc] bg-[#fdf2f8]/95 p-2 sm:-mx-6 sm:-mt-6 sm:px-4"
      >
        {STUDIO_STEPS.map((item, index) => {
          const selected = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`studio-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`studio-panel-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`flex min-h-11 min-w-0 touch-manipulation flex-col items-center justify-center rounded-xl px-1 transition-colors duration-150 ${
                selected
                  ? 'bg-[linear-gradient(120deg,#fbbf24_0%,#ec4899_52%,#9333ea_100%)] text-[#fff7fb] shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                  : 'text-[#7a5563] hover:bg-[#2d1b22]/[0.06]'
              }`}
            >
              <span
                className={`font-receipt text-[9px] tabular-nums tracking-[0.2em] ${
                  selected ? 'text-[#fff7fb]/80' : 'text-[#b48799]'
                }`}
              >
                0{index + 1}
              </span>
              <span className="max-w-full truncate font-receipt text-[10px] font-bold uppercase tracking-[0.08em] sm:text-[11px]">
                {item.id === 'letter' ? (
                  <>
                    <span className="sm:hidden">Letter</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`studio-panel-${tab}`} aria-labelledby={`studio-tab-${tab}`}>
        {tab === 'receipt' && <ReceiptSection />}
        {tab === 'audit' && <AuditSection />}
        {tab === 'photos' && <PhotosSection />}
        {tab === 'letter' && <LetterSection />}
      </div>
    </div>
  );
}

const StoreField = memo(function StoreField({
  field,
  label,
  className,
  multiline = false,
  maxLength,
}: {
  field: TextFieldKey;
  label: string;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  const value = useXsoStore((s) => s[field]);
  const setField = useXsoStore((s) => s.setField);

  return (
    <Field
      label={label}
      className={className}
      hint={multiline && maxLength ? `${value.length}/${maxLength}` : undefined}
    >
      {multiline ? (
        <textarea
          className="paper-field min-h-[150px] resize-y font-serif text-[16px] leading-relaxed"
          value={value}
          maxLength={maxLength}
          onChange={(e) => setField(field, e.target.value)}
        />
      ) : (
        <input
          className="paper-field"
          value={value}
          maxLength={maxLength}
          onChange={(e) => setField(field, e.target.value)}
        />
      )}
    </Field>
  );
});

function ReceiptSection() {
  const lineItems = useXsoStore((s) => s.lineItems);
  const { addLineItem } = useXsoActions();
  const last = lineItems.length - 1;

  return (
    <div className="space-y-6">
      <Section title="Header" note="Who it’s for, who it’s from, and why today.">
        <div className="grid gap-3 sm:grid-cols-2">
          <StoreField field="merchantName" label="Store name" className="sm:col-span-2" />
          <StoreField field="cashier" label="Cashier" />
          <StoreField field="customerName" label="Customer" />
          <StoreField field="billerName" label="From" />
          <StoreField field="occasion" label="Occasion" />
          <StoreField field="timestamp" label="Timestamp" className="sm:col-span-2" />
        </div>
      </Section>

      <Section
        title="Line items"
        note="Every line is proof of something you shared. Bill them for it."
        action={<AddButton onClick={addLineItem}>Add a memory</AddButton>}
      >
        <ul className="m-0 list-none space-y-2.5 p-0">
          {lineItems.map((item, index) => (
            <LineItemRow
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === last}
            />
          ))}
        </ul>
      </Section>

      <Section title="Totals" note="What it all added up to.">
        <div className="grid grid-cols-3 gap-2.5">
          <StoreField field="subtotal" label="Subtotal" />
          <StoreField field="emotionalTax" label="Tax" />
          <StoreField field="total" label="Total" />
        </div>
      </Section>
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
    <li className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 rounded-xl border border-dashed border-[#f0cfdc] bg-white/40 p-2.5 sm:grid-cols-[4.25rem_minmax(0,1fr)_6rem_auto]">
      <input
        className="paper-field font-receipt tabular-nums"
        value={item.qty}
        aria-label="Quantity"
        onChange={(e) => updateLineItem(id, { qty: e.target.value })}
      />
      <input
        className="paper-field font-receipt uppercase"
        value={item.description}
        aria-label="Description"
        onChange={(e) => updateLineItem(id, { description: e.target.value })}
      />
      <input
        className="paper-field font-receipt tabular-nums max-sm:col-start-1 max-sm:col-end-2"
        value={item.price}
        aria-label="Amount"
        onChange={(e) => updateLineItem(id, { price: e.target.value })}
      />
      <div className="flex items-center justify-end gap-1">
        <IconBtn label="Move up" disabled={isFirst} onClick={() => moveLineItem(id, 'up')}>
          <ArrowUp className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn label="Move down" disabled={isLast} onClick={() => moveLineItem(id, 'down')}>
          <ArrowDown className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn label="Delete item" onClick={() => removeLineItem(id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconBtn>
      </div>
    </li>
  );
});

function AuditSection() {
  return (
    <div className="space-y-6">
      <Section title="Score meters" note="Drag to score them out of 100. Be honest. Be kind.">
        <ul className="m-0 list-none space-y-4 p-0">
          {METRIC_KEYS.map((key) => (
            <AuditSlider key={key} metric={key} label={METRIC_LABELS[key]} />
          ))}
        </ul>
      </Section>
      <StoreField field="certifiedStampText" label="Certified stamp" />
      <FlagEditor title="Green flags" kind="greenFlags" tone="#a8557e" />
      <FlagEditor title="Red flags" kind="redFlags" tone="#ec4899" />
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
      <div className="mb-1.5 flex items-baseline justify-between font-receipt text-[12px] uppercase tracking-[0.1em] text-[#4a4038]">
        <span>{label}</span>
        <span className="font-bold tabular-nums text-[#ec4899]">{value}</span>
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
        className="paper-range w-full touch-pan-y"
        aria-label={label}
      />
    </li>
  );
});

function FlagEditor({
  title,
  kind,
  tone,
}: {
  title: string;
  kind: FlagKind;
  tone: string;
}) {
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
    <Section
      title={title}
      dot={tone}
      action={<AddButton onClick={() => addFlag(kind)}>Add</AddButton>}
    >
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
    </Section>
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
        className="paper-field"
        value={value}
        aria-label={`${label} ${index + 1}`}
        onChange={(e) => onUpdate(index, e.target.value)}
      />
      <IconBtn label={`Remove ${label} ${index + 1}`} onClick={() => onRemove(index)}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconBtn>
    </li>
  );
});

function PhotosSection() {
  const photos = useXsoStore((s) => s.photos);
  const { setPhotoAt, addPhotoStrip, removePhotoStrip } = useXsoActions();
  const strips = stripCount(photos);
  const frames = strips * FRAMES_PER_STRIP;

  /** Multiple files dropped on one frame fill it and the frames after it. */
  const placeFiles = useCallback(
    async (start: number, files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) throw new Error('Please choose an image file');
      for (let i = 0; i < images.length && start + i < frames; i += 1) {
        setPhotoAt(start + i, await compressImage(images[i]));
      }
    },
    [frames, setPhotoAt],
  );

  return (
    <Section
      title={strips > 1 ? `Purikura strips (${strips})` : 'Purikura strip'}
      note={`The faces you’d keep in your wallet. Drop photos onto a frame or tap to choose; portrait shots look best. Up to ${MAX_STRIPS} strips of ${FRAMES_PER_STRIP}.`}
    >
      <div className="space-y-5">
        {Array.from({ length: strips }, (_, strip) => (
          <div key={strip}>
            {strips > 1 ? (
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-receipt text-[11px] font-bold uppercase tracking-[0.16em] text-[#9a6b7b]">
                  Strip {strip + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removePhotoStrip(strip)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] text-[#db2777] hover:bg-[#db2777]/10"
                  aria-label={`Remove strip ${strip + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove
                </button>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: FRAMES_PER_STRIP }, (_, frame) => {
                const index = strip * FRAMES_PER_STRIP + frame;
                return (
                  <PhotoFrame
                    key={index}
                    index={index}
                    url={photos[index] ?? ''}
                    onFiles={placeFiles}
                    onClear={() => setPhotoAt(index, blankFrame(index))}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {strips < MAX_STRIPS ? (
          <button
            type="button"
            onClick={addPhotoStrip}
            className="flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#ebc3d3] font-receipt text-[12px] font-bold uppercase tracking-[0.14em] text-[#9a6b7b] transition-colors hover:border-[#ec4899] hover:text-[#ec4899] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add another strip
          </button>
        ) : (
          <p className="text-center font-receipt text-[11px] uppercase tracking-[0.14em] text-[#9a6b7b]">
            Max {MAX_STRIPS} strips
          </p>
        )}
      </div>
    </Section>
  );
}

function PhotoFrame({
  index,
  url,
  onFiles,
  onClear,
}: {
  index: number;
  url: string;
  onFiles: (start: number, files: File[]) => Promise<void>;
  onClear: () => void;
}) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await onFiles(index, files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    void handle(Array.from(e.dataTransfer.files));
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-dashed transition-colors duration-150 ${
          over ? 'border-[#ec4899] bg-[#ec4899]/10' : 'border-[#ebc3d3] bg-white/40'
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Frame ${index + 1}`} className="h-full w-full object-cover" />
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`absolute inset-0 flex touch-manipulation flex-col items-center justify-center gap-1.5 text-center font-receipt text-[10px] font-bold uppercase tracking-[0.14em] transition-opacity ${
            url
              ? 'bg-[#2d1b22]/55 text-[#fdf2f8] opacity-0 hover:opacity-100 focus-visible:opacity-100'
              : 'text-[#9a6b7b]'
          }`}
          aria-label={url ? `Replace photo ${index + 1}` : `Add photo ${index + 1}`}
        >
          {busy ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          ) : (
            <ImagePlus className="h-5 w-5" aria-hidden />
          )}
          {busy ? 'Developing…' : url ? 'Replace' : `Frame ${index + 1}`}
        </button>
        {url && !busy ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove photo ${index + 1}`}
            className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#2d1b22]/80 text-[#fdf2f8]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void handle(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-[#db2777]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LetterSection() {
  return (
    <div className="space-y-6">
      <StoreField field="birthdayMessage" label="The part you never said out loud" multiline maxLength={600} />
      <VoiceNoteField />
      <PromoFields />
    </div>
  );
}

function VoiceNoteField() {
  const voiceNoteUrl = useXsoStore((s) => s.voiceNoteUrl);
  const { setField } = useXsoActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setField('voiceNoteUrl', await readAudio(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Voice note" note="Optional · let them hear it in your voice. MP3, M4A or WEBM up to 1.5 MB">
      {voiceNoteUrl ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#f0cfdc] bg-white/40 p-2.5">
          <audio controls src={voiceNoteUrl} className="h-10 min-w-0 flex-1" />
          <IconBtn label="Remove voice note" onClick={() => setField('voiceNoteUrl', undefined)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#ebc3d3] bg-white/40 px-4 py-4 font-receipt text-[12px] font-bold uppercase tracking-[0.12em] text-[#7a5563] transition-colors hover:border-[#ec4899] hover:text-[#ec4899] disabled:opacity-60"
        >
          <Mic className="h-4 w-4" aria-hidden />
          {busy ? 'Pressing to tape…' : 'Add a voice note'}
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
        <p role="alert" className="mt-1.5 text-[12px] text-[#db2777]">
          {error}
        </p>
      ) : null}
    </Section>
  );
}

function PromoFields() {
  const reward = useXsoStore((s) => s.scratchOffReward);
  const { setField } = useXsoActions();
  const { code, perk } = splitReward(reward);

  return (
    <Section title="Secret promise" note="A small promise under the foil, for them to scratch, keep and cash in with you.">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Field label="Secret code">
          <input
            className="paper-field font-receipt font-bold uppercase tracking-[0.1em]"
            value={code}
            maxLength={24}
            onChange={(e) =>
              setField(
                'scratchOffReward',
                joinReward(e.target.value.toUpperCase().replace(/\s+/g, '-'), perk),
              )
            }
          />
        </Field>
        <Field label="What you promise">
          <input
            className="paper-field"
            value={perk}
            maxLength={80}
            onChange={(e) => setField('scratchOffReward', joinReward(code, e.target.value))}
          />
        </Field>
      </div>
    </Section>
  );
}

function Section({
  title,
  note,
  action,
  dot,
  children,
}: {
  title: string;
  note?: string;
  action?: ReactNode;
  dot?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-serif text-[20px] font-semibold leading-tight text-[#2d1b22]">
            {dot ? (
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: dot }} />
            ) : null}
            {title}
          </h3>
          {note ? <p className="mt-0.5 text-[13px] text-[#8a5f6e]">{note}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 touch-manipulation items-center gap-1 rounded-full border border-[#ebc3d3] bg-white/60 px-3 py-1.5 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d1b22] transition-colors hover:border-[#ec4899] hover:text-[#ec4899] active:scale-[0.97]"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden />
      {children}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="flex items-baseline justify-between gap-2 font-receipt text-[11px] uppercase tracking-[0.14em] text-[#8a5f6e]">
        {label}
        {hint ? <span className="tabular-nums text-[#b48799]">{hint}</span> : null}
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
      className="grid h-10 w-10 shrink-0 touch-manipulation place-items-center rounded-lg border border-[#f0cfdc] bg-white/50 text-[#4a4038] transition-colors hover:text-[#ec4899] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
