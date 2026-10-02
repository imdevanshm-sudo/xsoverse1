'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Lock, X } from 'lucide-react';
import {
  CRAFT_LIMITS,
  storyToPatch,
  type Adjustment,
  type CraftTone,
  type Relationship,
} from '@/lib/aiCraft';
import {
  AdjustBar,
  CraftBadge,
  CraftStatus,
  GenerateButton,
  MemorySpark,
  VibeFields,
  requestStory,
  useMemoryQuestions,
  type CraftSource,
} from '@/components/xso/AIQuizCustomizer';
import { packContent, useXsoStore, type PackContent } from '@/store/useXsoStore';
import { useCustomizerModal } from '@/store/useCustomizerModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CARTRIDGE_PRICE } from '@/lib/cartridges';
import { THEMES, getTheme, type ThemeId } from '@/lib/themes';
import type { FormatKey, FormatLayers } from '@/lib/formats';
import { cardsPatch, normalizeCards, selectedCards, type CardId } from '@/lib/formatCards';
import { compressPhotoForStyle } from '@/lib/media';
import { startCheckout } from '@/lib/startCheckout';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { MatteCta } from '@/components/desk/MatteCta';
import { FormatEditor, type FormatPatch } from '@/components/xso/FormatEditor';
import { CardChecklist, FormatStep } from '@/components/storefront/customizer/steps';
import { FormatThumb } from '@/components/storefront/customizer/FormatThumb';
import { MAX_PHOTOS, PhotoPicker } from '@/components/storefront/customizer/PhotoPicker';
import {
  fromGiftStyle,
  toGiftStyle,
  type OrderFormat,
  type OrderVibe,
  type XSOOrderConfig,
} from '@/types/order';
import { LOOP_CARDS, type LoopCard, type XsoData } from '@/types/xso';

const STEPS = [
  { title: 'Choose a format', next: 'Next: choose cards' },
  { title: 'Pick the cards', next: 'Next: add the vibe' },
  { title: 'Vibe & Memory Spark', next: 'Next: add photos' },
  { title: 'Photos & magic', next: '' },
  { title: 'Preview & checkout', next: '' },
] as const;
const LAST = STEPS.length - 1;
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const LABEL = 'font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]';

type Draft = PackContent;

/** Keeps edits already made in the studio when the pack is unchanged; otherwise the pack's starter copy. */
function seedDraft(id: ThemeId): Draft {
  const store = useXsoStore.getState();
  if (store.themeId === id) {
    const { id: _id, giftStyle: _style, ...rest } = pickXsoPayload(store);
    return {
      ...rest,
      scrapbook: store.scrapbook,
      loop: store.loop,
      rewind: store.rewind,
      accordion: store.accordion,
      moviebox: store.moviebox,
    };
  }
  return packContent(id);
}

const EMPTY_VIBE: OrderVibe = {
  recipientName: '',
  relationship: null,
  tone: null,
  question: null,
  answer: '',
};

/** The preview focuses a card by its slot in the shared stack. */
function focusSlot(id: CardId | undefined): number | undefined {
  const i = LOOP_CARDS.indexOf(id as LoopCard);
  return i >= 0 ? i : undefined;
}

/** One flow for every order: format, cards, vibe, photos, then preview and pay. */
export function XSOCustomizerModal() {
  const reduce = useReducedMotion();
  const close = useCustomizerModal((s) => s.close);
  const [theme] = useState<ThemeId>(
    () => useCustomizerModal.getState().theme ?? (useXsoStore.getState().themeId as ThemeId),
  );
  const [draft, setDraft] = useState<Draft>(() => seedDraft(theme));
  const [config, setConfig] = useState<XSOOrderConfig>(() => {
    const style = useCustomizerModal.getState().format ?? useXsoStore.getState().giftStyle;
    return {
      format: fromGiftStyle(style),
      selectedCards: selectedCards({ ...draft, id: '', giftStyle: style }, style),
      vibe: EMPTY_VIBE,
      media: { photos: [] },
    };
  });
  const style = toGiftStyle(config.format);
  const { vibe, selectedCards: cards } = config;
  const photos = config.media.photos;

  const [step, setStep] = useState(0);
  const [crafted, setCrafted] = useState<CraftSource | null>(null);
  const [crafting, setCrafting] = useState<'generate' | Adjustment | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [focusCard, setFocusCard] = useState<number | undefined>(undefined);
  const busy = paying || crafting !== null;

  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setVibe = useCallback(
    (patch: Partial<OrderVibe>) => setConfig((c) => ({ ...c, vibe: { ...c.vibe, ...patch } })),
    [],
  );
  const setCards = useCallback((next: CardId[], toggled?: CardId) => {
    setConfig((c) => ({ ...c, selectedCards: next }));
    setFocusCard(focusSlot(toggled));
  }, []);
  const pickFormat = useCallback(
    (format: OrderFormat) => {
      if (format === config.format) return;
      const next = toGiftStyle(format);
      setConfig((c) => ({
        ...c,
        format,
        selectedCards: selectedCards({ ...draft, id: '', giftStyle: next }, next),
      }));
      setCrafted(null);
      setEditorOpen(false);
    },
    [config.format, draft],
  );

  useBodyScrollLock();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    return () => {
      abortRef.current?.abort();
      previous?.focus?.({ preventScroll: true });
    };
  }, []);
  const firstStep = useRef(true);
  useEffect(() => {
    setFocusCard(undefined);
    setError(null);
    bodyRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (firstStep.current) firstStep.current = false;
    else titleRef.current?.focus({ preventScroll: true });
  }, [step, reduce]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => !node.closest('[inert]'),
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [busy, close],
  );

  /** Originals are kept as File handles (not decoded) so a format change can re-grade them. */
  const filesRef = useRef<File[]>([]);
  const styleRef = useRef(style);
  styleRef.current = style;
  const [processing, setProcessing] = useState(0);
  const setPhotos = useCallback(
    (update: (current: string[]) => string[]) =>
      setConfig((c) => ({ ...c, media: { photos: update(c.media.photos) } })),
    [],
  );
  const addPhotos = useCallback(
    async (files: File[]) => {
      setError(null);
      setProcessing((n) => n + files.length);
      try {
        const shrunk = await Promise.all(
          files.map((file) => compressPhotoForStyle(file, styleRef.current)),
        );
        filesRef.current = [...filesRef.current, ...files].slice(0, MAX_PHOTOS);
        setPhotos((current) => [...current, ...shrunk].slice(0, MAX_PHOTOS));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that photo');
      } finally {
        setProcessing((n) => Math.max(0, n - files.length));
      }
    },
    [setPhotos],
  );
  const removePhoto = useCallback(
    (index: number) => {
      filesRef.current = filesRef.current.filter((_, i) => i !== index);
      setPhotos((current) => current.filter((_, i) => i !== index));
    },
    [setPhotos],
  );
  useEffect(() => {
    const files = filesRef.current;
    if (!files.length) return;
    let cancelled = false;
    Promise.all(files.map((file) => compressPhotoForStyle(file, style)))
      .then((graded) => {
        if (!cancelled) setPhotos(() => graded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setPhotos, style]);

  const prompts = useMemoryQuestions(
    step >= 2 && vibe.relationship !== null && vibe.tone !== null,
    vibe.relationship,
    vibe.tone,
    vibe.recipientName,
  );
  const question =
    vibe.question && prompts.questions.includes(vibe.question) ? vibe.question : null;
  useEffect(() => {
    if (!question && prompts.questions.length) setVibe({ question: prompts.questions[0] });
  }, [prompts.questions, question, setVibe]);

  const name = vibe.recipientName.trim();
  const vibeDone =
    name.length > 0 &&
    vibe.relationship !== null &&
    vibe.tone !== null &&
    vibe.answer.trim().length >= CRAFT_LIMITS.minMemory;

  const generate = useCallback(
    async (adjust?: Adjustment) => {
      if (!vibe.relationship || !vibe.tone || crafting) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setCrafting(adjust ?? 'generate');
      setError(null);
      try {
        const result = await requestStory(
          {
            recipientName: name,
            relationship: vibe.relationship,
            tone: vibe.tone,
            memoryText: vibe.answer.trim(),
            question: question ?? undefined,
            format: style,
            cards,
            adjust,
          },
          controller.signal,
        );
        setDraft((d) => ({ ...d, ...storyToPatch(result.story, d) }));
        setCrafted(result.source);
        setStep(LAST);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      } finally {
        if (abortRef.current === controller) setCrafting(null);
      }
    },
    [cards, crafting, name, question, style, vibe],
  );

  const patchDraft = useCallback((patch: FormatPatch) => setDraft((d) => ({ ...d, ...patch })), []);
  /** The editor's own card toggles (loop cards, scrapbook pieces) stay in sync with the checklist. */
  const patchFormat = useCallback(
    <K extends FormatKey>(key: K, patch: Partial<FormatLayers[K]>) => {
      setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
      if (key !== style) return;
      const raw = patch as { cards?: unknown[]; elements?: unknown[] };
      const picked = raw.cards ?? raw.elements;
      if (picked) setConfig((c) => ({ ...c, selectedCards: normalizeCards(style, picked) }));
    },
    [style],
  );
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const resetStory = useCallback(
    () =>
      setDraft((d) => ({
        ...packContent(themeRef.current),
        customerName: d.customerName,
        billerName: d.billerName,
        voiceNoteUrl: d.voiceNoteUrl,
      })),
    [],
  );
  const openEditor = useCallback(() => {
    setEditorOpen(true);
    requestAnimationFrame(() =>
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }, []);

  const scrapbook = style === 'scrapbook';
  const withCards = useMemo(
    () => ({ ...draft, ...cardsPatch(style, cards, draft) }),
    [cards, draft, style],
  );
  /** Mirrors `commit`: the sender's photos first, the pack's placeholders after them. */
  const previewData = useMemo<XsoData>(
    () => ({
      ...withCards,
      id: 'customizer-preview',
      giftStyle: style,
      customerName: name || withCards.customerName,
      photos:
        scrapbook && photos.length ? photos : [...photos, ...withCards.photos.slice(photos.length)],
    }),
    [name, photos, scrapbook, style, withCards],
  );

  /** Writes the order into the gift draft (theme first, since it resets content). */
  const commit = useCallback(() => {
    const store = useXsoStore.getState();
    if (store.themeId !== theme) store.applyTheme(theme);
    useXsoStore.setState({
      ...withCards,
      giftStyle: style,
      ...(name ? { customerName: name } : {}),
    });
    if (scrapbook) {
      if (photos.length) useXsoStore.setState({ photos });
    } else {
      const { setPhotoAt } = useXsoStore.getState();
      photos.forEach((photo, i) => setPhotoAt(i, photo));
    }
  }, [name, photos, scrapbook, style, theme, withCards]);

  const checkout = useCallback(async () => {
    if (busy) return;
    setPaying(true);
    setError(null);
    commit();
    try {
      await startCheckout(style);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setPaying(false);
    }
  }, [busy, commit, style]);

  const pack = getTheme(theme) ?? THEMES[0];
  const canNext = step === 0 || step === 1 || (step === 2 && vibeDone);
  const photoPicker = (
    <PhotoPicker
      photos={photos}
      processing={processing}
      onAdd={addPhotos}
      onRemove={removePhoto}
      compact
    />
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <motion.button
        type="button"
        aria-label="Close customizer"
        tabIndex={-1}
        className="absolute inset-0 bg-[#180e15]/[0.92]"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={() => !busy && close()}
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
        onKeyDown={onKeyDown}
        initial={reduce ? false : { y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="relative flex max-h-[90vh] min-h-[min(640px,85vh)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#180e15] text-[#fdf2f8] shadow-[0_-12px_40px_rgba(0,0,0,.5)] supports-[height:100svh]:max-h-[90svh] supports-[height:100svh]:min-h-[min(640px,85svh)] md:min-h-0 md:max-w-lg md:rounded-3xl"
      >
        <header className="flex items-center gap-3 border-b border-white/10 px-5 pb-3 pt-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={busy}
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[#e0b4c6] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-receipt text-[10px] uppercase tracking-[0.22em] text-[#fdba74]">
              Create your XSO · Step {step + 1} of {STEPS.length}
            </p>
            <h2
              ref={titleRef}
              id="customizer-title"
              tabIndex={-1}
              className="font-serif text-[1.35rem] font-semibold leading-tight focus:outline-none"
            >
              {STEPS[step].title}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-[#e0b4c6] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <ol className="flex gap-1.5 px-5 pt-3" aria-hidden>
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#ec4899]' : 'bg-white/10'}`}
            />
          ))}
        </ol>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4"
        >
          {step === 0 ? <FormatStep format={config.format} onFormat={pickFormat} /> : null}

          {step === 1 ? (
            <div className="grid gap-5">
              <FormatThumb data={previewData} style={style} focus={focusCard} />
              <CardChecklist format={config.format} cards={cards} onCards={setCards} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-6">
              <VibeFields
                name={vibe.recipientName}
                onName={(recipientName) => setVibe({ recipientName })}
                relationship={vibe.relationship}
                onRelationship={(relationship: Relationship) => setVibe({ relationship })}
                vibe={vibe.tone}
                onVibe={(tone: CraftTone) => setVibe({ tone })}
              />
              {vibe.relationship && vibe.tone ? (
                <div className="border-t border-white/10 pt-5">
                  <h3 className="mb-3 font-serif text-[1.1rem] font-semibold leading-tight">
                    ✨ Memory Spark
                  </h3>
                  <MemorySpark
                    relationship={vibe.relationship}
                    prompts={prompts}
                    question={question}
                    onQuestion={(q) => setVibe({ question: q })}
                    answer={vibe.answer}
                    onAnswer={(answer) => setVibe({ answer })}
                    onSubmit={() => setStep(3)}
                  />
                </div>
              ) : (
                <p className="text-[13px] leading-snug text-[#9a6a7e]">
                  Pick who they are to you and a vibe, and we&apos;ll ask three questions to spark
                  the story.
                </p>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4">
              <p className="text-[14px] leading-relaxed text-[#e0b4c6]">
                Photos are optional. Skip them and we&apos;ll use the {pack.title} pack&apos;s
                placeholders, which you can swap any time before checkout.
              </p>
              <div>{photoPicker}</div>
              {crafted ? (
                <button
                  type="button"
                  onClick={() => setStep(LAST)}
                  disabled={busy}
                  className="justify-self-center text-[13px] font-semibold text-[#f9a8d4] underline underline-offset-2"
                >
                  Keep my current story and go to the preview
                </button>
              ) : null}
            </div>
          ) : null}

          {step === LAST ? (
            <div className="grid gap-5" aria-live="polite">
              <FormatThumb
                data={previewData}
                style={style}
                focus={focusCard}
                large
                onEdit={openEditor}
                badge={crafted ? <CraftBadge source={crafted} /> : null}
              />
              {crafted ? <CraftStatus source={crafted} name={name} /> : null}
              <section>
                <p className={`mb-2 ${LABEL}`}>Quick adjustments</p>
                <AdjustBar
                  busy={crafting}
                  onAdjust={(a) => void generate(a)}
                  onChangeAnswers={() => setStep(2)}
                />
              </section>
              <section>
                <p className={`mb-2 ${LABEL}`}>Cards in your XSO</p>
                <CardChecklist
                  format={config.format}
                  cards={cards}
                  onCards={setCards}
                  variant="chips"
                />
              </section>
              <div ref={editorRef} className="scroll-mt-2">
                <button
                  type="button"
                  aria-expanded={editorOpen}
                  onClick={() => setEditorOpen((o) => !o)}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-[#21131b] px-4 text-left text-[15px] font-semibold text-[#fdf2f8]"
                >
                  <span>
                    Edit every detail
                    <span className="block text-[12.5px] font-normal text-[#c99aae]">
                      Optional: photos, line items, scores and the letter
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-[#c99aae] transition-transform ${editorOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {editorOpen ? (
                  <div className="mt-4">
                    <FormatEditor
                      key={style}
                      style={style}
                      fields={withCards}
                      onPatch={patchDraft}
                      onFormat={patchFormat}
                      photoSlot={photoPicker}
                      packTitle={pack.title}
                      onReset={resetStory}
                      onFocusCard={setFocusCard}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-[#3b1220] px-3 py-2 text-[13px] text-[#fecdd3]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-white/10 px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3">
          {step < 3 ? (
            <button
              type="button"
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[#fdf2f8] font-serif text-[17px] font-semibold text-[#2d1b22] transition-transform active:scale-[0.98] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
            >
              {STEPS[step].next}
            </button>
          ) : step === 3 ? (
            <GenerateButton
              busy={crafting === 'generate'}
              disabled={busy || processing > 0}
              onClick={() => void generate()}
              label={crafted ? '✨ Regenerate Keepsake' : '✨ Generate Keepsake'}
            />
          ) : (
            <MatteCta
              onClick={checkout}
              loading={paying}
              disabled={crafting !== null}
              label="Proceed to Checkout"
              price={CARTRIDGE_PRICE}
              loadingLabel="Opening secure checkout…"
              ariaLabel={`Proceed to checkout, ${CARTRIDGE_PRICE}`}
            />
          )}
          <p className="mt-2.5 flex items-center justify-center gap-1.5 font-receipt text-[10px] uppercase tracking-[0.16em] text-[#9a6a7e]">
            <Lock className="h-3 w-3" aria-hidden /> Secure checkout · delivered as a private link
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
