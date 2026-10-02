'use client';

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Loader2, PencilLine, RotateCcw, Sparkles } from 'lucide-react';
import {
  ADJUSTMENTS,
  CRAFT_LIMITS,
  CRAFT_TONES,
  RELATIONSHIPS,
  type Adjustment,
  type CraftInput,
  type CraftResponse,
  type CraftTone,
  type CraftedStory,
  type Relationship,
} from '@/lib/aiCraft';
import { TONES, type ToneName } from '@/components/xso/editors/kit';
import type { GiftStyle } from '@/types/xso';

export type CraftPhase = 'quiz' | 'crafted' | 'manual';
export type CraftSource = CraftResponse['source'];

const MEMORY_PROMPT =
  'Tell us 1 or 2 memories, inside jokes, or habits you two share (e.g., 3 AM boba runs, bad driving, shared brain cells):';
const SPARKS = ['3 AM boba runs', 'bad driving', 'shared brain cell', 'voice notes at 2am'];
const QUESTIONS = ['Vibe & relationship', 'The memory spark', 'Photos & generate'];

const PILL = {
  dark: {
    on: 'border-[#ec4899] bg-[#ec4899]/15 text-[#fdf2f8]',
    off: 'border-white/15 text-[#e0b4c6] hover:border-white/30',
    hint: 'text-[#9a6a7e]',
    heading: 'text-[#fdf2f8]',
    status: 'border-[#fdba74]/40 bg-[#2a1a12] text-[#fed7aa]',
  },
  paper: {
    on: 'border-[#ec4899] bg-[#fce7f3] text-[#2d1b22]',
    off: 'border-[#ebc3d3] bg-white/60 text-[#6b4452] hover:border-[#ec4899]/60',
    hint: 'text-[#8a5f6e]',
    heading: 'text-[#2d1b22]',
    status: 'border-[#fdba74]/60 bg-[#fff7ed] text-[#9a3412]',
  },
} as const;

async function requestStory(input: CraftInput, signal: AbortSignal): Promise<CraftResponse> {
  const res = await fetch('/api/generate-xso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  const json = (await res.json().catch(() => ({}))) as Partial<CraftResponse> & { error?: string };
  if (!res.ok || !json.story) throw new Error(json.error || 'The story machine jammed. Try again.');
  return { story: json.story, source: json.source ?? 'template' };
}

/** Floating label over a preview the AI just filled. */
export function CraftBadge({
  source,
  className = '',
}: {
  source: CraftSource;
  className?: string;
}) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-medium leading-tight text-white/90 shadow-lg backdrop-blur-md ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#fdba74]" aria-hidden />
      {source === 'ai' ? 'AI Crafted' : 'Story crafted'} · Tap any element on the preview to edit or
      regenerate.
    </span>
  );
}

/**
 * Three questions → a complete, format-specific story. Owns the answers so a
 * re-roll never needs re-typing; the host owns the draft and photos.
 */
export const AIQuizCustomizer = memo(function AIQuizCustomizer({
  style,
  name,
  onName,
  photoSlot,
  photosReady,
  phase,
  onPhase,
  source,
  onCrafted,
  onStep,
  allowManual = true,
  tone = 'dark',
}: {
  style: GiftStyle;
  name: string;
  onName: (name: string) => void;
  photoSlot: ReactNode;
  /** False while required photos are missing or still processing. */
  photosReady: boolean;
  /** Controlled so the host can send it back to the questions when the draft resets. */
  phase: CraftPhase;
  onPhase: (phase: CraftPhase) => void;
  source: CraftSource | null;
  onCrafted: (story: CraftedStory, source: CraftSource) => void;
  onStep?: (step: number) => void;
  allowManual?: boolean;
  tone?: ToneName;
}) {
  const t = TONES[tone];
  const p = PILL[tone];
  const [step, setStepState] = useState(0);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [vibe, setVibe] = useState<CraftTone | null>(null);
  const [memory, setMemory] = useState('');
  const [busy, setBusy] = useState<'generate' | Adjustment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const setPhase = onPhase;
  const setStep = useCallback(
    (next: number) => {
      setStepState(next);
      setError(null);
      onStep?.(next);
    },
    [onStep],
  );

  const trimmedName = name.trim();
  const step1Done = trimmedName.length > 0 && relationship !== null && vibe !== null;
  const step2Done = memory.trim().length >= CRAFT_LIMITS.minMemory;

  const generate = useCallback(
    async (adjust?: Adjustment) => {
      if (!relationship || !vibe || busy) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(adjust ?? 'generate');
      setError(null);
      try {
        const result = await requestStory(
          {
            recipientName: trimmedName,
            relationship,
            tone: vibe,
            memoryText: memory.trim(),
            format: style,
            adjust,
          },
          controller.signal,
        );
        onCrafted(result.story, result.source);
        setPhase('crafted');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      } finally {
        if (abortRef.current === controller) setBusy(null);
      }
    },
    [busy, memory, onCrafted, relationship, setPhase, style, trimmedName, vibe],
  );

  const appendSpark = (spark: string) =>
    setMemory((m) => {
      const base = m.trim().replace(/[,.]$/, '');
      return (base ? `${base}, ${spark}` : spark).slice(0, CRAFT_LIMITS.memory);
    });

  const errorLine = error ? (
    <p role="alert" className={`mt-3 text-[13px] ${t.error}`}>
      {error}
    </p>
  ) : null;

  if (phase === 'manual') {
    return (
      <div className="grid gap-4">
        <NameInput t={t} name={name} onName={onName} />
        <button
          type="button"
          onClick={() => setPhase('quiz')}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-[13px] font-semibold ${p.off}`}
        >
          <Sparkles className="h-4 w-4 text-[#ec4899]" aria-hidden />
          Let AI write it instead
        </button>
      </div>
    );
  }

  if (phase === 'crafted') {
    return (
      <div className="grid gap-3" aria-live="polite">
        <p className={`rounded-2xl border px-3 py-2 text-[13px] leading-snug ${p.status}`}>
          <Sparkles className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
          {source === 'ai'
            ? `Crafted for ${trimmedName}. Every line is editable below.`
            : `Our AI writer is offline right now, so we assembled ${trimmedName}'s story from your answers. Every line is editable below.`}
        </p>
        <div>
          <p className={t.field}>Regenerate tone</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ADJUSTMENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => generate(a.id)}
                disabled={busy !== null}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50 ${p.off}`}
              >
                {busy === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <span aria-hidden>{a.emoji}</span>
                )}
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setPhase('quiz');
              }}
              disabled={busy !== null}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-50 ${p.off}`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Change my answers
            </button>
          </div>
          {busy ? (
            <p className={`mt-2 text-[12.5px] ${p.hint}`} role="status">
              Re-writing every line…
            </p>
          ) : null}
          {errorLine}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className={`font-receipt text-[10.5px] uppercase tracking-[0.18em] text-[#fdba74]`}>
          <Sparkles className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
          AI Story Craft · {step + 1} of 3
        </p>
        <ol className="flex gap-1" aria-hidden>
          {QUESTIONS.map((q, i) => (
            <li
              key={q}
              className={`h-1.5 w-6 rounded-full ${i <= step ? 'bg-[#ec4899]' : tone === 'dark' ? 'bg-white/10' : 'bg-[#f0cfdc]'}`}
            />
          ))}
        </ol>
      </div>
      <h3 className={`mt-1.5 font-serif text-[1.15rem] font-semibold leading-tight ${p.heading}`}>
        {QUESTIONS[step]}
      </h3>

      {step === 0 ? (
        <div className="mt-4 grid gap-5">
          <NameInput t={t} name={name} onName={onName} />
          <fieldset>
            <legend className={t.field}>You are their…</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={relationship === r}
                  onClick={() => setRelationship(r)}
                  className={`min-h-10 rounded-full border px-4 text-[14px] font-semibold transition-colors ${relationship === r ? p.on : p.off}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={t.field}>Pick the vibe</legend>
            <div className="mt-2 grid gap-2">
              {CRAFT_TONES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={vibe === v.id}
                  onClick={() => setVibe(v.id)}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left text-[15px] font-semibold transition-colors ${vibe === v.id ? p.on : p.off}`}
                >
                  <span className="text-[20px]" aria-hidden>
                    {v.emoji}
                  </span>
                  {v.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      ) : step === 1 ? (
        <div className="mt-4">
          <label className="grid gap-2">
            <span className={`text-[14px] leading-snug ${p.heading}`}>{MEMORY_PROMPT}</span>
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value.slice(0, CRAFT_LIMITS.memory))}
              rows={5}
              data-step-focus
              placeholder="She always says she's 5 min away (she's at home). Our 3 AM boba runs. The time we got lost going to IKEA…"
              className={`${t.input} min-h-[8.5rem] resize-y leading-relaxed`}
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`text-[12px] ${p.hint}`}>Need a spark?</span>
            {SPARKS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => appendSpark(s)}
                className={`min-h-8 rounded-full border px-2.5 text-[12px] ${p.off}`}
              >
                + {s}
              </button>
            ))}
          </div>
          <p className={`mt-1.5 text-right text-[11px] tabular-nums ${p.hint}`}>
            {memory.length}/{CRAFT_LIMITS.memory}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {photoSlot}
          <button
            type="button"
            onClick={() => generate()}
            disabled={!photosReady || busy !== null}
            aria-busy={busy === 'generate'}
            className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ec4899] via-[#f472b6] to-[#fb923c] px-5 font-serif text-[17px] font-semibold text-white shadow-[0_10px_30px_rgba(236,72,153,.35)] transition-transform active:scale-[0.98] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
          >
            {busy === 'generate' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Crafting your custom story...
              </>
            ) : (
              '✨ Magic Generate XSO'
            )}
          </button>
          {!photosReady && busy === null ? (
            <p className={`-mt-2 text-center text-[12.5px] ${p.hint}`}>
              Add at least one photo to generate.
            </p>
          ) : null}
        </div>
      )}

      {errorLine}

      <div className="mt-5 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={busy !== null}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold ${p.off}`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
        ) : allowManual ? (
          <button
            type="button"
            onClick={() => setPhase('manual')}
            className={`inline-flex min-h-10 items-center gap-1.5 text-[13px] underline underline-offset-2 ${p.hint}`}
          >
            <PencilLine className="h-4 w-4" aria-hidden />
            Skip, I&apos;ll write it myself
          </button>
        ) : (
          <span />
        )}
        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={step === 0 ? !step1Done : !step2Done}
            className={`min-h-11 rounded-full px-5 text-[14px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 ${tone === 'dark' ? 'bg-[#fdf2f8] text-[#2d1b22]' : 'bg-[#2d1b22] text-[#fdf2f8]'}`}
          >
            Next
          </button>
        ) : null}
      </div>
    </div>
  );
});

function NameInput({
  t,
  name,
  onName,
}: {
  t: (typeof TONES)[ToneName];
  name: string;
  onName: (name: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={t.field}>Their name</span>
      <input
        value={name}
        onChange={(e) => onName(e.target.value.slice(0, CRAFT_LIMITS.name))}
        placeholder="e.g. Alex"
        autoComplete="off"
        enterKeyHint="next"
        data-step-focus
        className={t.input}
      />
    </label>
  );
}
