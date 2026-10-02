'use client';

import { memo, useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Mic, Plus, Trash2 } from 'lucide-react';
import { newId } from '@/lib/constants';
import { readAudio } from '@/lib/media';
import { CINEMATIC } from '@/lib/motion';
import { ELEMENT_META, LIMITS, STICKY_COLORS, spotifyLink } from '@/lib/scrapbook';
import {
  SCRAPBOOK_ELEMENTS,
  type LineItem,
  type ScrapbookElement,
  type ScrapbookLayers,
  type StickyColor,
  type XsoData,
} from '@/types/xso';

export type ScrapbookFields = Pick<
  XsoData,
  'merchantName' | 'timestamp' | 'lineItems' | 'birthdayMessage' | 'billerName' | 'voiceNoteUrl'
> & { scrapbook: ScrapbookLayers };

type FieldPatch = Partial<Omit<ScrapbookFields, 'scrapbook'>>;
type OnPatch = (patch: FieldPatch) => void;
type OnLayers = (patch: Partial<ScrapbookLayers>) => void;

const MAX_LINES = 8;

const TONES = {
  dark: {
    row: 'border-white/10 bg-[#21131b]',
    rowOn: 'border-[#ec4899]/55 bg-[#2a1520]',
    box: 'border-white/25 bg-transparent',
    boxOn: 'border-[#ec4899] bg-[#ec4899] text-white',
    label: 'text-[#fdf2f8]',
    detail: 'text-[#c99aae]',
    divider: 'border-white/10',
    field: 'font-receipt text-[10px] uppercase tracking-[0.16em] text-[#c99aae]',
    input:
      'w-full rounded-xl border border-white/15 bg-[#180e15] px-3 py-2.5 text-[16px] text-[#fdf2f8] placeholder:text-[#7f5466] focus:border-[#ec4899] focus:outline-none',
    button:
      'border-white/15 text-[#e0b4c6] hover:border-[#ec4899] hover:text-[#fdf2f8] focus-visible:outline-[#f9a8d4]',
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
    error: 'text-[#db2777]',
    ok: 'text-[#15803d]',
  },
} as const;

type Tone = (typeof TONES)[keyof typeof TONES];

/**
 * Checklist of scrapbook artifacts; each checked one unfolds its own editor.
 * Controlled: the host owns the data (a local draft or the studio store).
 */
export const ScrapbookElements = memo(function ScrapbookElements({
  fields,
  onPatch,
  onLayers,
  photoSlot,
  tone = 'dark',
  defaultOpen = [],
}: {
  fields: ScrapbookFields;
  onPatch: OnPatch;
  onLayers: OnLayers;
  /** The host's photo uploader, shown inside the Polaroid editor. */
  photoSlot: ReactNode;
  tone?: keyof typeof TONES;
  defaultOpen?: ScrapbookElement[];
}) {
  const t = TONES[tone];
  const { scrapbook: layers } = fields;
  const [open, setOpen] = useState<Set<ScrapbookElement>>(() => new Set(defaultOpen));
  const elementsRef = useRef(layers.elements);
  elementsRef.current = layers.elements;

  const toggle = useCallback(
    (id: ScrapbookElement) => {
      const on = elementsRef.current.includes(id);
      onLayers({
        elements: SCRAPBOOK_ELEMENTS.filter((el) =>
          el === id ? !on : elementsRef.current.includes(el),
        ),
      });
      setOpen((current) => {
        const next = new Set(current);
        if (on) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [onLayers],
  );

  const expand = useCallback((id: ScrapbookElement) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const editor = (id: ScrapbookElement) => {
    switch (id) {
      case 'receipt':
        return (
          <ReceiptEditor
            t={t}
            merchantName={fields.merchantName}
            timestamp={fields.timestamp}
            lineItems={fields.lineItems}
            onPatch={onPatch}
          />
        );
      case 'polaroids':
        return (
          <PolaroidEditor
            t={t}
            caption={layers.polaroidCaption}
            onLayers={onLayers}
            photoSlot={photoSlot}
          />
        );
      case 'sticky':
        return (
          <StickyEditor
            t={t}
            secret={layers.secretNote}
            color={layers.stickyColor}
            onLayers={onLayers}
          />
        );
      case 'letter':
        return (
          <LetterEditor
            t={t}
            message={fields.birthdayMessage}
            signOff={fields.billerName}
            onPatch={onPatch}
          />
        );
      case 'ticket':
        return (
          <TicketEditor
            t={t}
            title={layers.ticketTitle}
            place={layers.ticketPlace}
            when={layers.ticketWhen}
            onLayers={onLayers}
          />
        );
      case 'voice':
        return (
          <VoiceEditor
            t={t}
            voiceNoteUrl={fields.voiceNoteUrl}
            songUrl={layers.songUrl}
            onPatch={onPatch}
            onLayers={onLayers}
          />
        );
    }
  };

  return (
    <div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {SCRAPBOOK_ELEMENTS.map((id) => {
          const checked = layers.elements.includes(id);
          return (
            <ElementRow
              key={id}
              id={id}
              t={t}
              checked={checked}
              open={checked && open.has(id)}
              onToggle={toggle}
              onExpand={expand}
            >
              {editor(id)}
            </ElementRow>
          );
        })}
      </ul>
      {layers.elements.length === 0 ? (
        <p role="alert" className={`mt-2 text-[13px] ${t.error}`}>
          Pick at least one piece for the desk.
        </p>
      ) : null}
    </div>
  );
});

function ElementRow({
  id,
  t,
  checked,
  open,
  onToggle,
  onExpand,
  children,
}: {
  id: ScrapbookElement;
  t: Tone;
  checked: boolean;
  open: boolean;
  onToggle: (id: ScrapbookElement) => void;
  onExpand: (id: ScrapbookElement) => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelId = useId();
  const meta = ELEMENT_META[id];
  return (
    <li className={`rounded-2xl border transition-colors ${checked ? t.rowOn : t.row}`}>
      <div className="flex min-h-[60px] items-center gap-2 px-3 py-2">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={() => onToggle(id)}
          />
          <span
            aria-hidden
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#f9a8d4] ${
              checked ? t.boxOn : t.box
            }`}
          >
            {checked ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
          </span>
          <span className="min-w-0">
            <span className={`block text-[15px] font-semibold leading-tight ${t.label}`}>
              {meta.label}
            </span>
            <span className={`block text-[12.5px] leading-snug ${t.detail}`}>{meta.detail}</span>
          </span>
        </label>
        {checked ? (
          <button
            type="button"
            onClick={() => onExpand(id)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? 'Close' : 'Edit'} ${meta.label}`}
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
      {open ? (
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

function Labeled({
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

const ReceiptEditor = memo(function ReceiptEditor({
  t,
  merchantName,
  timestamp,
  lineItems,
  onPatch,
}: {
  t: Tone;
  merchantName: string;
  timestamp: string;
  lineItems: LineItem[];
  onPatch: OnPatch;
}) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onPatch({ lineItems: lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)) });

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 min-[420px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Labeled t={t} label="Store / memory name">
          <input
            className={`${t.input} uppercase`}
            value={merchantName}
            maxLength={32}
            onChange={(e) => onPatch({ merchantName: e.target.value })}
          />
        </Labeled>
        <Labeled t={t} label="Date">
          <input
            className={t.input}
            value={timestamp}
            maxLength={30}
            onChange={(e) => onPatch({ timestamp: e.target.value })}
          />
        </Labeled>
      </div>
      <div>
        <p className={t.field}>Line items</p>
        <ul className="m-0 mt-1.5 grid list-none gap-2 p-0">
          {lineItems.map((item, i) => (
            <li key={item.id} className="flex gap-2">
              <span className="min-w-0 flex-1">
                <input
                  className={`${t.input} font-receipt uppercase`}
                  value={item.description}
                  placeholder="What it was"
                  maxLength={32}
                  aria-label={`Line ${i + 1} label`}
                  onChange={(e) => update(item.id, { description: e.target.value })}
                />
              </span>
              <span className="w-[6.5rem] shrink-0">
                <input
                  className={`${t.input} font-receipt tabular-nums`}
                  value={item.price}
                  placeholder="$0.00"
                  maxLength={12}
                  aria-label={`Line ${i + 1} cost`}
                  onChange={(e) => update(item.id, { price: e.target.value })}
                />
              </span>
              <button
                type="button"
                onClick={() => onPatch({ lineItems: lineItems.filter((li) => li.id !== item.id) })}
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
          <button
            type="button"
            onClick={() =>
              onPatch({
                lineItems: [...lineItems, { id: newId(), qty: '1x', description: '', price: '' }],
              })
            }
            className={`mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 ${t.button}`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add line
          </button>
        ) : null}
      </div>
    </div>
  );
});

const PolaroidEditor = memo(function PolaroidEditor({
  t,
  caption,
  onLayers,
  photoSlot,
}: {
  t: Tone;
  caption: string;
  onLayers: OnLayers;
  photoSlot: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      {photoSlot}
      <Labeled t={t} label="Caption on back" hint={`${caption.length}/${LIMITS.polaroidCaption}`}>
        <input
          className={`${t.input} font-hand !text-[19px]`}
          value={caption}
          maxLength={LIMITS.polaroidCaption}
          placeholder="the summer we never slept."
          onChange={(e) => onLayers({ polaroidCaption: e.target.value })}
        />
      </Labeled>
    </div>
  );
});

const StickyEditor = memo(function StickyEditor({
  t,
  secret,
  color,
  onLayers,
}: {
  t: Tone;
  secret: string;
  color: StickyColor;
  onLayers: OnLayers;
}) {
  const colorLabel = useId();
  return (
    <div className="grid gap-3">
      <Labeled
        t={t}
        label="Secret note · revealed when they peel it"
        hint={`${secret.length}/${LIMITS.secretNote}`}
      >
        <textarea
          className={`${t.input} min-h-[84px] resize-none font-hand !text-[19px] leading-snug`}
          value={secret}
          rows={3}
          maxLength={LIMITS.secretNote}
          onChange={(e) => onLayers({ secretNote: e.target.value })}
        />
      </Labeled>
      <div>
        <p className={t.field} id={colorLabel}>
          Note color
        </p>
        <div role="radiogroup" aria-labelledby={colorLabel} className="mt-1.5 flex flex-wrap gap-2">
          {(Object.keys(STICKY_COLORS) as StickyColor[]).map((id) => {
            const selected = id === color;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onLayers({ stickyColor: id })}
                className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 ${t.button} ${
                  selected ? '!border-[#ec4899]' : ''
                }`}
              >
                <span
                  aria-hidden
                  className={`h-5 w-5 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,.3)] ${
                    selected ? 'ring-2 ring-[#ec4899] ring-offset-1 ring-offset-transparent' : ''
                  }`}
                  style={{ background: STICKY_COLORS[id].paper }}
                />
                {STICKY_COLORS[id].label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const LetterEditor = memo(function LetterEditor({
  t,
  message,
  signOff,
  onPatch,
}: {
  t: Tone;
  message: string;
  signOff: string;
  onPatch: OnPatch;
}) {
  return (
    <div className="grid gap-3">
      <Labeled t={t} label="The letter" hint={`${message.length}/600`}>
        <textarea
          className={`${t.input} min-h-[170px] resize-y font-hand !text-[20px] leading-[1.25]`}
          value={message}
          maxLength={600}
          onChange={(e) => onPatch({ birthdayMessage: e.target.value })}
        />
      </Labeled>
      <Labeled t={t} label="Signed">
        <input
          className={`${t.input} font-hand !text-[20px]`}
          value={signOff}
          maxLength={40}
          onChange={(e) => onPatch({ billerName: e.target.value })}
        />
      </Labeled>
    </div>
  );
});

const TicketEditor = memo(function TicketEditor({
  t,
  title,
  place,
  when,
  onLayers,
}: {
  t: Tone;
  title: string;
  place: string;
  when: string;
  onLayers: OnLayers;
}) {
  return (
    <div className="grid gap-3 min-[420px]:grid-cols-2">
      <Labeled t={t} label="Event title" className="min-[420px]:col-span-2">
        <input
          className={t.input}
          value={title}
          maxLength={LIMITS.ticketTitle}
          placeholder="Our first concert"
          onChange={(e) => onLayers({ ticketTitle: e.target.value })}
        />
      </Labeled>
      <Labeled t={t} label="Location">
        <input
          className={t.input}
          value={place}
          maxLength={LIMITS.ticketPlace}
          placeholder="Brooklyn Steel"
          onChange={(e) => onLayers({ ticketPlace: e.target.value })}
        />
      </Labeled>
      <Labeled t={t} label="When">
        <input
          className={t.input}
          value={when}
          maxLength={LIMITS.ticketWhen}
          placeholder="06/21/2024 · 9 PM"
          onChange={(e) => onLayers({ ticketWhen: e.target.value })}
        />
      </Labeled>
    </div>
  );
});

const VoiceEditor = memo(function VoiceEditor({
  t,
  voiceNoteUrl,
  songUrl,
  onPatch,
  onLayers,
}: {
  t: Tone;
  voiceNoteUrl?: string;
  songUrl: string;
  onPatch: OnPatch;
  onLayers: OnLayers;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [song, setSong] = useState(songUrl);
  const songValid = song.trim() === '' || Boolean(spotifyLink(song));

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onPatch({ voiceNoteUrl: await readAudio(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {voiceNoteUrl ? (
        <div className="flex items-center gap-2">
          <audio controls src={voiceNoteUrl} className="h-10 min-w-0 flex-1" />
          <button
            type="button"
            onClick={() => onPatch({ voiceNoteUrl: undefined })}
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
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed font-receipt text-[11px] font-bold uppercase tracking-[0.12em] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 ${t.button}`}
        >
          <Mic className="h-4 w-4" aria-hidden />
          {busy ? 'Pressing to tape…' : 'Upload a voice note · up to 1.5 MB'}
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
      <Labeled t={t} label="Or a song · Spotify link">
        <input
          className={t.input}
          value={song}
          inputMode="url"
          maxLength={LIMITS.songUrl}
          placeholder="https://open.spotify.com/track/…"
          aria-invalid={!songValid}
          onChange={(e) => {
            const next = e.target.value;
            setSong(next);
            if (next.trim() === '') onLayers({ songUrl: '' });
            else {
              const link = spotifyLink(next);
              if (link) onLayers({ songUrl: link });
            }
          }}
        />
      </Labeled>
      {song.trim() && !songValid ? (
        <p role="alert" className={`-mt-1.5 text-[12.5px] ${t.error}`}>
          Paste a Spotify track, album or playlist link.
        </p>
      ) : songUrl ? (
        <p className={`-mt-1.5 text-[12.5px] ${t.ok}`}>✓ Song linked</p>
      ) : null}
    </div>
  );
});
