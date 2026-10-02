'use client';

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  FORMAT_LIMITS,
  LOOP_CARD_META,
  MIN_LOOP_CARDS,
  RATED,
  type FormatKey,
  type FormatLayers,
} from '@/lib/formats';
import {
  LOOP_CARDS,
  type GiftStyle,
  type LoopCard,
  type MovieScene,
  type ScrapbookElement,
  type ScrapbookLayers,
  type XsoData,
} from '@/types/xso';
import { LetterFields, ScrapbookElements } from '@/components/xso/ScrapbookElements';
import {
  AudioField,
  EditorRow,
  ImageField,
  Labeled,
  LineItemsEditor,
  MetricSliders,
  SmallButton,
  StarPicker,
  TONES,
  useOpenSet,
  type Tone,
  type ToneName,
} from '@/components/xso/editors/kit';

export type FormatFields = Omit<XsoData, 'id' | 'giftStyle' | FormatKey> & FormatLayers;
export type FormatPatch = Partial<Omit<XsoData, 'id' | 'giftStyle' | FormatKey>>;
export type OnFormat = <K extends FormatKey>(key: K, patch: Partial<FormatLayers[K]>) => void;

interface EditorProps {
  t: Tone;
  fields: FormatFields;
  onPatch: (patch: FormatPatch) => void;
  onFormat: OnFormat;
  photoSlot: ReactNode;
  onFocusCard?: (index: number) => void;
}

const FORMAT_NAMES: Record<GiftStyle, string> = {
  loop: 'Loop',
  rewind: 'Rewind',
  scrapbook: 'Scrapbook',
  accordion: 'Accordion',
  moviebox: 'Movie Box',
};

/**
 * Step-2 customization for whichever format is selected. Controlled: the host
 * owns the data (the express modal's draft or the studio store).
 */
export const FormatEditor = memo(function FormatEditor({
  style,
  fields,
  onPatch,
  onFormat,
  photoSlot,
  packTitle,
  onReset,
  onFocusCard,
  tone = 'dark',
  heading = true,
}: {
  style: GiftStyle;
  fields: FormatFields;
  onPatch: (patch: FormatPatch) => void;
  onFormat: OnFormat;
  /** The host's photo uploader; each format places it where its photos live. */
  photoSlot: ReactNode;
  packTitle: string;
  onReset: () => void;
  onFocusCard?: (index: number) => void;
  tone?: ToneName;
  heading?: boolean;
}) {
  const t = TONES[tone];
  const onScrapbook = useCallback(
    (patch: Partial<ScrapbookLayers>) => onFormat('scrapbook', patch),
    [onFormat],
  );
  const props: EditorProps = { t, fields, onPatch, onFormat, photoSlot, onFocusCard };

  return (
    <div>
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {heading ? (
            <h3 className={`font-receipt text-[11px] uppercase tracking-[0.18em] ${t.detail}`}>
              {style === 'scrapbook'
                ? 'Build your scrapbook elements'
                : `Customize your ${FORMAT_NAMES[style]}`}
            </h3>
          ) : null}
          <p className={`mt-1 text-[12.5px] leading-snug ${t.detail} opacity-80`}>
            Pre-filled from {packTitle}. Edit any piece, or just add photos and go.
          </p>
        </div>
        <ResetButton t={t} onReset={onReset} />
      </div>
      {style === 'scrapbook' ? (
        <ScrapbookElements
          tone={tone}
          fields={fields}
          onPatch={onPatch}
          onLayers={onScrapbook}
          photoSlot={photoSlot}
          defaultOpen={['polaroids'] as ScrapbookElement[]}
          onFocusCard={onFocusCard}
        />
      ) : style === 'loop' ? (
        <LoopEditor {...props} />
      ) : style === 'rewind' ? (
        <RewindEditor {...props} />
      ) : style === 'accordion' ? (
        <AccordionEditor {...props} />
      ) : (
        <MovieEditor {...props} />
      )}
    </div>
  );
});

/** Two taps, so a stray one can't wipe an afternoon of writing. */
function ResetButton({ t, onReset }: { t: Tone; onReset: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <SmallButton
      t={t}
      onClick={() => {
        window.clearTimeout(timer.current);
        if (armed) {
          setArmed(false);
          onReset();
          return;
        }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), 3500);
      }}
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      <span aria-live="polite">{armed ? 'Tap again to reset' : 'Reset to default story'}</span>
    </SmallButton>
  );
}

function FlagFields({
  t,
  label,
  flags,
  onChange,
}: {
  t: Tone;
  label: string;
  flags: string[];
  onChange: (flags: string[]) => void;
}) {
  return (
    <div>
      <p className={t.field}>{label}</p>
      <div className="mt-1.5 grid gap-2">
        {flags.slice(0, 3).map((flag, i) => (
          <input
            key={i}
            className={t.input}
            value={flag}
            maxLength={60}
            aria-label={`${label} ${i + 1}`}
            onChange={(e) => onChange(flags.map((f, j) => (j === i ? e.target.value : f)))}
          />
        ))}
      </div>
    </div>
  );
}

function FacesRow({
  t,
  open,
  onExpand,
  photoSlot,
  detail,
}: {
  t: Tone;
  open: boolean;
  onExpand: () => void;
  photoSlot: ReactNode;
  detail: string;
}) {
  return (
    <EditorRow t={t} label="Your photos" detail={detail} open={open} onExpand={onExpand}>
      {photoSlot}
    </EditorRow>
  );
}

const LOOP_FOCUS: Record<LoopCard, number> = { receipt: 0, audit: 1, photos: 2, letter: 3 };

function LoopEditor({ t, fields, onPatch, onFormat, photoSlot, onFocusCard }: EditorProps) {
  const [open, setOpen] = useOpenSet<LoopCard>(['photos']);
  const { cards } = fields.loop;
  const expand = (id: LoopCard) => {
    if (!open.has(id)) onFocusCard?.(LOOP_FOCUS[id]);
    setOpen(id);
  };

  const editor = (id: LoopCard) => {
    switch (id) {
      case 'receipt':
        return (
          <div className="grid gap-3">
            <div className="grid gap-3 min-[420px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Labeled t={t} label="Title">
                <input
                  className={`${t.input} uppercase`}
                  value={fields.merchantName}
                  maxLength={32}
                  onChange={(e) => onPatch({ merchantName: e.target.value })}
                />
              </Labeled>
              <Labeled t={t} label="Timestamp">
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
      case 'audit':
        return (
          <div className="grid gap-3">
            <FlagFields
              t={t}
              label="The roast · red flags"
              flags={fields.redFlags}
              onChange={(redFlags) => onPatch({ redFlags })}
            />
            <FlagFields
              t={t}
              label="The note · green flags"
              flags={fields.greenFlags}
              onChange={(greenFlags) => onPatch({ greenFlags })}
            />
            <Labeled t={t} label="Certified stamp">
              <input
                className={`${t.input} uppercase`}
                value={fields.certifiedStampText}
                maxLength={28}
                onChange={(e) => onPatch({ certifiedStampText: e.target.value })}
              />
            </Labeled>
          </div>
        );
      case 'photos':
        return photoSlot;
      case 'letter':
        return (
          <div className="grid gap-3">
            <LetterFields
              t={t}
              label="Closing letter"
              message={fields.birthdayMessage}
              signOff={fields.billerName}
              onPatch={onPatch}
            />
            <div>
              <p className={`mb-1.5 ${t.field}`}>Audio snippet</p>
              <AudioField
                t={t}
                value={fields.voiceNoteUrl}
                onChange={(voiceNoteUrl) => onPatch({ voiceNoteUrl })}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {LOOP_CARDS.map((id) => {
        const checked = cards.includes(id);
        return (
          <EditorRow
            key={id}
            t={t}
            label={LOOP_CARD_META[id].label}
            detail={LOOP_CARD_META[id].detail}
            checked={checked}
            lockedOn={checked && cards.length <= MIN_LOOP_CARDS}
            open={open.has(id)}
            onToggle={() => {
              onFormat('loop', {
                cards: LOOP_CARDS.filter((c) => (c === id ? !checked : cards.includes(c))),
              });
              setOpen(id, !checked);
              if (!checked) onFocusCard?.(LOOP_FOCUS[id]);
            }}
            onExpand={() => expand(id)}
          >
            {editor(id)}
          </EditorRow>
        );
      })}
      <li className={`px-1 text-[12px] ${t.detail} opacity-80`}>
        At least {MIN_LOOP_CARDS} cards stay in the stack so it has something to loop to.
      </li>
    </ul>
  );
}

type RewindSection = 'tape' | 'audit' | 'faces' | 'review';
const REWIND_FOCUS: Record<RewindSection, number> = { tape: 0, audit: 1, faces: 2, review: 4 };

function RewindEditor({ t, fields, onPatch, onFormat, photoSlot, onFocusCard }: EditorProps) {
  const [open, setOpen] = useOpenSet<RewindSection>(['faces']);
  const tape = fields.rewind;
  const expand = (id: RewindSection) => {
    if (!open.has(id)) onFocusCard?.(REWIND_FOCUS[id]);
    setOpen(id);
  };
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      <EditorRow
        t={t}
        label="Tape label"
        detail="Side A & B titles and the date it was dubbed"
        open={open.has('tape')}
        onExpand={() => expand('tape')}
      >
        <div className="grid gap-3 min-[420px]:grid-cols-2">
          <Labeled t={t} label="Side A title">
            <input
              className={`${t.input} font-hand !text-[19px]`}
              value={tape.sideA}
              maxLength={FORMAT_LIMITS.sideA}
              onChange={(e) => onFormat('rewind', { sideA: e.target.value })}
            />
          </Labeled>
          <Labeled t={t} label="Side B title">
            <input
              className={`${t.input} font-hand !text-[19px]`}
              value={tape.sideB}
              maxLength={FORMAT_LIMITS.sideB}
              onChange={(e) => onFormat('rewind', { sideB: e.target.value })}
            />
          </Labeled>
          <Labeled t={t} label="Date" className="min-[420px]:col-span-2">
            <input
              className={t.input}
              value={tape.tapeDate}
              maxLength={FORMAT_LIMITS.tapeDate}
              onChange={(e) => onFormat('rewind', { tapeDate: e.target.value })}
            />
          </Labeled>
        </div>
      </EditorRow>
      <EditorRow
        t={t}
        label="Friendship audit"
        detail="Chaos, loyalty, brain cells & the stamp"
        open={open.has('audit')}
        onExpand={() => expand('audit')}
      >
        <div className="grid gap-4">
          <MetricSliders
            t={t}
            metrics={fields.auditMetrics}
            onChange={(auditMetrics) => onPatch({ auditMetrics })}
          />
          <Labeled t={t} label="Certified stamp">
            <input
              className={`${t.input} uppercase`}
              value={fields.certifiedStampText}
              maxLength={28}
              onChange={(e) => onPatch({ certifiedStampText: e.target.value })}
            />
          </Labeled>
        </div>
      </EditorRow>
      <FacesRow
        t={t}
        open={open.has('faces')}
        onExpand={() => expand('faces')}
        photoSlot={photoSlot}
        detail="The photo card in the pile"
      />
      <EditorRow
        t={t}
        label="Director's note"
        detail="Your review, on its own liner-notes card"
        open={open.has('review')}
        onExpand={() => expand('review')}
      >
        <Labeled
          t={t}
          label="Review · leave empty to skip the card"
          hint={`${tape.review.length}/${FORMAT_LIMITS.review}`}
        >
          <textarea
            className={`${t.input} min-h-[130px] resize-y font-hand !text-[20px] leading-[1.2]`}
            value={tape.review}
            maxLength={FORMAT_LIMITS.review}
            onChange={(e) => onFormat('rewind', { review: e.target.value })}
          />
        </Labeled>
      </EditorRow>
    </ul>
  );
}

type AccordionSection = 'items' | 'total' | 'faces' | 'note';
const ACCORDION_FOCUS: Record<AccordionSection, number> = { items: 0, total: 0, faces: 2, note: 3 };
const TOTAL_PRESETS = ['PRICELESS', 'PAID IN FULL', 'FOREVER', 'NO REFUNDS'];

function sumPrices(fields: FormatFields) {
  const amounts = fields.lineItems
    .map((item) => Number(item.price.replace(/[^0-9.]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  return amounts.length ? `$${amounts.reduce((a, b) => a + b, 0).toFixed(2)}` : null;
}

function AccordionEditor({ t, fields, onPatch, onFormat, photoSlot, onFocusCard }: EditorProps) {
  const [open, setOpen] = useOpenSet<AccordionSection>(['faces']);
  const expand = (id: AccordionSection) => {
    if (!open.has(id)) onFocusCard?.(ACCORDION_FOCUS[id]);
    setOpen(id);
  };
  const sum = sumPrices(fields);
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      <EditorRow
        t={t}
        label="Line items"
        detail="Add or remove what it cost, e.g. 3 AM Boba Run · $40.00"
        open={open.has('items')}
        onExpand={() => expand('items')}
      >
        <div className="grid gap-3">
          <Labeled t={t} label="Bill from">
            <input
              className={`${t.input} uppercase`}
              value={fields.merchantName}
              maxLength={32}
              onChange={(e) => onPatch({ merchantName: e.target.value })}
            />
          </Labeled>
          <LineItemsEditor
            t={t}
            lineItems={fields.lineItems}
            onChange={(lineItems) => onPatch({ lineItems })}
          />
        </div>
      </EditorRow>
      <EditorRow
        t={t}
        label="Total & sentiment"
        detail="Priceless or the real sum, plus a line underneath"
        open={open.has('total')}
        onExpand={() => expand('total')}
      >
        <div className="grid gap-3">
          <Labeled t={t} label="Total">
            <input
              className={`${t.input} font-receipt uppercase`}
              value={fields.total}
              maxLength={16}
              onChange={(e) => onPatch({ total: e.target.value })}
            />
          </Labeled>
          <div className="flex flex-wrap gap-2">
            {TOTAL_PRESETS.map((preset) => (
              <SmallButton key={preset} t={t} onClick={() => onPatch({ total: preset })}>
                {preset}
              </SmallButton>
            ))}
            {sum ? (
              <SmallButton t={t} onClick={() => onPatch({ total: sum })}>
                Add it up · {sum}
              </SmallButton>
            ) : null}
          </div>
          <Labeled
            t={t}
            label="Sentiment under the total"
            hint={`${fields.accordion.sentiment.length}/${FORMAT_LIMITS.sentiment}`}
          >
            <input
              className={`${t.input} font-hand !text-[19px]`}
              value={fields.accordion.sentiment}
              maxLength={FORMAT_LIMITS.sentiment}
              onChange={(e) => onFormat('accordion', { sentiment: e.target.value })}
            />
          </Labeled>
        </div>
      </EditorRow>
      <FacesRow
        t={t}
        open={open.has('faces')}
        onExpand={() => expand('faces')}
        photoSlot={photoSlot}
        detail="Fold 03 · the faces"
      />
      <EditorRow
        t={t}
        label="The note"
        detail="Fold 04 · the letter at the end of the ribbon"
        open={open.has('note')}
        onExpand={() => expand('note')}
      >
        <LetterFields
          t={t}
          message={fields.birthdayMessage}
          signOff={fields.billerName}
          onPatch={onPatch}
        />
      </EditorRow>
    </ul>
  );
}

type MovieSection = 'rating' | 'faces' | `scene-${number}`;

function MovieEditor({ t, fields, onFormat, photoSlot, onFocusCard }: EditorProps) {
  const [open, setOpen] = useOpenSet<MovieSection>(['faces']);
  const { scenes, stars } = fields.moviebox;
  const expand = (id: MovieSection, focus: number) => {
    if (!open.has(id)) onFocusCard?.(focus);
    setOpen(id);
  };
  const setScene = (index: number, patch: Partial<MovieScene>) =>
    onFormat('moviebox', {
      scenes: scenes.map((scene, i) => (i === index ? { ...scene, ...patch } : scene)),
    });

  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      <EditorRow
        t={t}
        label="Rating"
        detail="The critic's star score on the audit scene"
        open={open.has('rating')}
        onExpand={() => expand('rating', 1)}
      >
        <StarPicker
          t={t}
          label="Star score"
          value={stars}
          onChange={(next) =>
            onFormat('moviebox', {
              stars: next,
              scenes: scenes.map((scene) => ({
                ...scene,
                caption: scene.caption.replace(RATED, `Rated ${next} out of 5`),
              })),
            })
          }
        />
      </EditorRow>
      {scenes.map((scene, i) => {
        const id: MovieSection = `scene-${i}`;
        return (
          <EditorRow
            key={id}
            t={t}
            label={`Scene ${String(i + 1).padStart(2, '0')} · ${scene.title || 'Untitled'}`}
            detail={scene.caption || 'Title, subtitle & an optional still'}
            open={open.has(id)}
            onExpand={() => expand(id, i)}
          >
            <div className="grid gap-3">
              <Labeled t={t} label="Scene title">
                <input
                  className={t.input}
                  value={scene.title}
                  maxLength={FORMAT_LIMITS.sceneTitle}
                  onChange={(e) => setScene(i, { title: e.target.value })}
                />
              </Labeled>
              <Labeled
                t={t}
                label="Subtitle"
                hint={`${scene.caption.length}/${FORMAT_LIMITS.sceneCaption}`}
              >
                <textarea
                  className={`${t.input} min-h-[72px] resize-none italic`}
                  value={scene.caption}
                  rows={2}
                  maxLength={FORMAT_LIMITS.sceneCaption}
                  onChange={(e) => setScene(i, { caption: e.target.value })}
                />
              </Labeled>
              <ImageField
                t={t}
                label={i === 2 ? 'Still · replaces the photo strip' : 'Still · optional backdrop'}
                value={scene.image}
                onChange={(image) => setScene(i, { image })}
              />
            </div>
          </EditorRow>
        );
      })}
      <FacesRow
        t={t}
        open={open.has('faces')}
        onExpand={() => expand('faces', 2)}
        photoSlot={photoSlot}
        detail="Scene 03's strip and the film reel"
      />
    </ul>
  );
}
