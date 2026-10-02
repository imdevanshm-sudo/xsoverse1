'use client';

import { memo, useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { ELEMENT_META, LIMITS, STICKY_COLORS, spotifyLink } from '@/lib/scrapbook';
import {
  SCRAPBOOK_ELEMENTS,
  type ScrapbookElement,
  type ScrapbookLayers,
  type StickyColor,
  type XsoData,
} from '@/types/xso';
import {
  AudioField,
  EditorRow,
  Labeled,
  LineItemsEditor,
  TONES,
  useOpenSet,
  type Tone,
  type ToneName,
} from '@/components/xso/editors/kit';

export type ScrapbookFields = Pick<
  XsoData,
  'merchantName' | 'timestamp' | 'lineItems' | 'birthdayMessage' | 'billerName' | 'voiceNoteUrl'
> & { scrapbook: ScrapbookLayers };

type FieldPatch = Partial<Omit<ScrapbookFields, 'scrapbook'>>;
type OnPatch = (patch: FieldPatch) => void;
type OnLayers = (patch: Partial<ScrapbookLayers>) => void;

/** Desk card each artifact brings forward in the live preview. */
const FOCUS: Record<ScrapbookElement, number> = {
  receipt: 0,
  sticky: 1,
  polaroids: 2,
  letter: 3,
  ticket: 3,
  voice: 3,
};

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
  onFocusCard,
}: {
  fields: ScrapbookFields;
  onPatch: OnPatch;
  onLayers: OnLayers;
  /** The host's photo uploader, shown inside the Polaroid editor. */
  photoSlot: ReactNode;
  tone?: ToneName;
  defaultOpen?: ScrapbookElement[];
  onFocusCard?: (index: number) => void;
}) {
  const t = TONES[tone];
  const { scrapbook: layers } = fields;
  const [open, setOpen] = useOpenSet<ScrapbookElement>(defaultOpen);
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
      setOpen(id, !on);
      if (!on) onFocusCard?.(FOCUS[id]);
    },
    [onLayers, onFocusCard, setOpen],
  );

  const editor = (id: ScrapbookElement) => {
    switch (id) {
      case 'receipt':
        return (
          <div className="grid gap-3">
            <div className="grid gap-3 min-[420px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Labeled t={t} label="Store / memory name">
                <input
                  className={`${t.input} uppercase`}
                  value={fields.merchantName}
                  maxLength={32}
                  onChange={(e) => onPatch({ merchantName: e.target.value })}
                />
              </Labeled>
              <Labeled t={t} label="Date">
                <input
                  className={t.input}
                  value={fields.timestamp}
                  maxLength={30}
                  onChange={(e) => onPatch({ timestamp: e.target.value })}
                />
              </Labeled>
            </div>
            <LineItemsEditor
              t={t}
              lineItems={fields.lineItems}
              onChange={(lineItems) => onPatch({ lineItems })}
            />
          </div>
        );
      case 'polaroids':
        return (
          <div className="grid gap-3">
            {photoSlot}
            <Labeled
              t={t}
              label="Caption on back"
              hint={`${layers.polaroidCaption.length}/${LIMITS.polaroidCaption}`}
            >
              <input
                className={`${t.input} font-hand !text-[19px]`}
                value={layers.polaroidCaption}
                maxLength={LIMITS.polaroidCaption}
                placeholder="the summer we never slept."
                onChange={(e) => onLayers({ polaroidCaption: e.target.value })}
              />
            </Labeled>
          </div>
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
          <LetterFields
            t={t}
            message={fields.birthdayMessage}
            signOff={fields.billerName}
            onPatch={onPatch}
          />
        );
      case 'ticket':
        return (
          <div className="grid gap-3 min-[420px]:grid-cols-2">
            <Labeled t={t} label="Event title" className="min-[420px]:col-span-2">
              <input
                className={t.input}
                value={layers.ticketTitle}
                maxLength={LIMITS.ticketTitle}
                placeholder="Our first concert"
                onChange={(e) => onLayers({ ticketTitle: e.target.value })}
              />
            </Labeled>
            <Labeled t={t} label="Location">
              <input
                className={t.input}
                value={layers.ticketPlace}
                maxLength={LIMITS.ticketPlace}
                placeholder="Brooklyn Steel"
                onChange={(e) => onLayers({ ticketPlace: e.target.value })}
              />
            </Labeled>
            <Labeled t={t} label="When">
              <input
                className={t.input}
                value={layers.ticketWhen}
                maxLength={LIMITS.ticketWhen}
                placeholder="06/21/2024 · 9 PM"
                onChange={(e) => onLayers({ ticketWhen: e.target.value })}
              />
            </Labeled>
          </div>
        );
      case 'voice':
        return (
          <div className="grid gap-3">
            <AudioField
              t={t}
              value={fields.voiceNoteUrl}
              onChange={(voiceNoteUrl) => onPatch({ voiceNoteUrl })}
            />
            <SongField t={t} songUrl={layers.songUrl} onLayers={onLayers} />
          </div>
        );
    }
  };

  return (
    <div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {SCRAPBOOK_ELEMENTS.map((id) => {
          const checked = layers.elements.includes(id);
          const meta = ELEMENT_META[id];
          return (
            <EditorRow
              key={id}
              t={t}
              label={meta.label}
              detail={meta.detail}
              checked={checked}
              open={open.has(id)}
              onToggle={() => toggle(id)}
              onExpand={() => {
                if (!open.has(id)) onFocusCard?.(FOCUS[id]);
                setOpen(id);
              }}
            >
              {editor(id)}
            </EditorRow>
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

export function LetterFields({
  t,
  message,
  signOff,
  onPatch,
  label = 'The letter',
}: {
  t: Tone;
  message: string;
  signOff: string;
  onPatch: (patch: { birthdayMessage?: string; billerName?: string }) => void;
  label?: string;
}) {
  return (
    <div className="grid gap-3">
      <Labeled t={t} label={label} hint={`${message.length}/600`}>
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
}

function StickyEditor({
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
}

function SongField({
  t,
  songUrl,
  onLayers,
}: {
  t: Tone;
  songUrl: string;
  onLayers: OnLayers;
}) {
  const [song, setSong] = useState(songUrl);
  const songValid = song.trim() === '' || Boolean(spotifyLink(song));
  return (
    <>
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
    </>
  );
}
