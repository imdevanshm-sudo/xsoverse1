'use client';

import Link from 'next/link';
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Camera, ChevronDown, Lock, X, Zap } from 'lucide-react';
import { storyToPatch, type CraftedStory } from '@/lib/aiCraft';
import {
  AIQuizCustomizer,
  CraftBadge,
  type CraftPhase,
  type CraftSource,
} from '@/components/xso/AIQuizCustomizer';
import { packContent, useXsoStore, type PackContent } from '@/store/useXsoStore';
import { useExpressOrder } from '@/store/useExpressOrder';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CARTRIDGE_PRICE, CARTRIDGES, displayTitle, getCartridge } from '@/lib/cartridges';
import { THEMES, getTheme, type ThemeId } from '@/lib/themes';
import {
  CUSTOM_MODULE_META,
  resolveCustom,
  type FormatKey,
  type FormatLayers,
} from '@/lib/formats';
import { CustomBuilderCanvas } from '@/components/xso/CustomBuilderCanvas';
import { compressPhotoForStyle } from '@/lib/media';
import { startCheckout } from '@/lib/startCheckout';
import { styleQuery } from '@/lib/styleLock';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { MatteCta } from '@/components/desk/MatteCta';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import { FormatEditor, type FormatPatch } from '@/components/xso/FormatEditor';
import { FormatPreview } from '@/components/xso/preview/FormatPreview';
import type { CustomModule, GiftStyle, XsoData } from '@/types/xso';

const MAX_PHOTOS = 3;
const STEPS = ['Style', 'Photos', 'Pay'] as const;
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
      custom: store.custom,
    };
  }
  return packContent(id);
}

/** Three-step impulse checkout: format + story, faces + name, pay. */
export function ExpressOrderModal() {
  const reduce = useReducedMotion();
  const close = useExpressOrder((s) => s.close);
  const [style, setStyle] = useState<GiftStyle>(
    () => useExpressOrder.getState().style ?? useXsoStore.getState().giftStyle,
  );
  const [theme, setTheme] = useState<ThemeId>(
    () => useExpressOrder.getState().theme ?? (useXsoStore.getState().themeId as ThemeId),
  );
  const [draft, setDraft] = useState<Draft>(() => seedDraft(theme));
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [craftPhase, setCraftPhase] = useState<CraftPhase>('quiz');
  const [craftSource, setCraftSource] = useState<CraftSource | null>(null);
  const [quizStep, setQuizStep] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  /** A crafted story belongs to one pack + format; changing either sends the quiz back (answers kept). */
  const uncraft = useCallback(() => {
    setCraftPhase((p) => (p === 'crafted' ? 'quiz' : p));
    setCraftSource(null);
    setEditorOpen(false);
  }, []);
  const pickTheme = useCallback(
    (id: ThemeId) => {
      setTheme(id);
      setDraft((d) => ({ ...seedDraft(id), custom: d.custom }));
      uncraft();
    },
    [uncraft],
  );
  const pickStyle = useCallback(
    (next: GiftStyle) => {
      setStyle(next);
      uncraft();
    },
    [uncraft],
  );
  const applyStory = useCallback((story: CraftedStory, source: CraftSource) => {
    setDraft((d) => ({ ...d, ...storyToPatch(story, d) }));
    setCraftSource(source);
  }, []);
  const openEditor = useCallback(() => {
    setEditorOpen(true);
    requestAnimationFrame(() =>
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }, []);
  const patchDraft = useCallback((patch: FormatPatch) => setDraft((d) => ({ ...d, ...patch })), []);
  const patchFormat = useCallback(
    <K extends FormatKey>(key: K, patch: Partial<FormatLayers[K]>) =>
      setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } })),
    [],
  );
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const resetStory = useCallback(
    () =>
      setDraft((d) => ({
        ...packContent(themeRef.current),
        custom: d.custom,
        customerName: d.customerName,
        billerName: d.billerName,
        voiceNoteUrl: d.voiceNoteUrl,
      })),
    [],
  );
  const [focusCard, setFocusCard] = useState<number | undefined>(undefined);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocusCard(undefined);
    bodyRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [step, style, quizStep, craftPhase, reduce]);

  useBodyScrollLock();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    const targets = dialogRef.current?.querySelectorAll<HTMLElement>('[data-step-focus]') ?? [];
    Array.from(targets)
      .find((el) => el.getClientRects().length > 0)
      ?.focus({ preventScroll: true });
  }, [step, quizStep]);

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

  /** Originals are kept as File handles (not decoded) so a style change can re-grade them. */
  const filesRef = useRef<File[]>([]);
  const styleRef = useRef(style);
  styleRef.current = style;
  const [processing, setProcessing] = useState(0);

  const addPhotos = useCallback(async (files: File[]) => {
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
  }, []);

  const removePhoto = useCallback((index: number) => {
    filesRef.current = filesRef.current.filter((_, i) => i !== index);
    setPhotos((current) => current.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    const files = filesRef.current;
    if (!files.length) return;
    let cancelled = false;
    Promise.all(files.map((file) => compressPhotoForStyle(file, style)))
      .then((graded) => {
        if (!cancelled) setPhotos(graded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [style]);

  /** Writes the express choices into the draft (theme first, since it resets content). */
  const commit = useCallback(() => {
    const store = useXsoStore.getState();
    if (store.themeId !== theme) store.applyTheme(theme);
    useXsoStore.setState({
      ...draft,
      giftStyle: style,
      ...(name.trim() ? { customerName: name.trim() } : {}),
    });
    if (style === 'scrapbook') {
      if (photos.length) useXsoStore.setState({ photos });
    } else {
      const { setPhotoAt } = useXsoStore.getState();
      photos.forEach((photo, i) => setPhotoAt(i, photo));
    }
  }, [draft, name, photos, style, theme]);

  const customizeFirst = useCallback(() => {
    commit();
    close();
  }, [close, commit]);

  const pay = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    commit();
    try {
      await startCheckout(style);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  }, [busy, commit, style]);

  const scrapbook = style === 'scrapbook';
  const elements = draft.scrapbook.elements;
  const custom = draft.custom;
  const modules = useMemo(() => resolveCustom({ custom }).modules, [custom]);
  const setModules = useCallback(
    (next: CustomModule[]) => patchFormat('custom', { modules: next }),
    [patchFormat],
  );
  const needsPhotos = scrapbook
    ? elements.includes('polaroids')
    : style !== 'loop' || draft.loop.cards.includes('photos');
  const quizzing = step === 1 && craftPhase === 'quiz';
  const photosReady = processing === 0 && (!needsPhotos || photos.length > 0);
  const canContinue =
    step === 0 ||
    (craftPhase !== 'quiz' &&
      name.trim().length > 0 &&
      processing === 0 &&
      (!needsPhotos || photos.length > 0) &&
      (!scrapbook || elements.length > 0));
  const cart = getCartridge(style);
  const pack = getTheme(theme) ?? THEMES[0];

  /** Mirrors `commit`: scrapbook keeps only real photos, strips keep the pack's frames after them. */
  const previewData = useMemo<XsoData>(
    () => ({
      ...draft,
      id: 'express-preview',
      giftStyle: style,
      customerName: name.trim() || draft.customerName,
      photos: scrapbook ? photos : [...photos, ...draft.photos.slice(photos.length)],
    }),
    [draft, name, photos, scrapbook, style],
  );
  const photoPicker = useMemo(
    () => (
      <PhotoPicker
        photos={photos}
        processing={processing}
        onAdd={addPhotos}
        onRemove={removePhoto}
        compact
      />
    ),
    [addPhotos, photos, processing, removePhoto],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <motion.button
        type="button"
        aria-label="Close express order"
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
        aria-labelledby="express-title"
        onKeyDown={onKeyDown}
        initial={reduce ? false : { y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="relative flex max-h-[85vh] min-h-[min(620px,80vh)] w-full flex-col overflow-hidden supports-[height:100svh]:max-h-[85svh] supports-[height:100svh]:min-h-[min(620px,80svh)] md:min-h-0 rounded-t-3xl border border-white/10 bg-[#180e15] text-[#fdf2f8] shadow-[0_-12px_40px_rgba(0,0,0,.5)] md:max-w-lg md:rounded-3xl"
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
              Express order · {step + 1} of {STEPS.length}
            </p>
            <h2
              id="express-title"
              className="font-serif text-[1.35rem] font-semibold leading-tight"
            >
              {step === 0
                ? 'Pick how it unfolds'
                : step === 1
                  ? scrapbook
                    ? 'Build your scrapbook'
                    : 'Make it theirs'
                  : 'Seal it and send it'}
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
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#ec4899]' : 'bg-white/10'}`}
            />
          ))}
        </ol>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4"
        >
          {step === 0 ? (
            <StylePicker
              style={style}
              theme={theme}
              onStyle={pickStyle}
              onTheme={pickTheme}
              builder={
                style === 'custom' ? (
                  <CustomBuilderCanvas modules={modules} onModules={setModules} />
                ) : null
              }
            />
          ) : null}
          {step === 1 && craftPhase !== 'quiz' ? (
            <FormatThumb
              data={previewData}
              style={style}
              focus={focusCard}
              large={craftPhase === 'crafted'}
              onEdit={openEditor}
              badge={craftSource ? <CraftBadge source={craftSource} /> : null}
            />
          ) : null}
          {/* Stays mounted across steps so going back never loses the answers. */}
          <div hidden={step !== 1}>
            <AIQuizCustomizer
              style={style}
              modules={modules}
              name={name}
              onName={setName}
              photoSlot={photoPicker}
              photosReady={photosReady}
              phase={craftPhase}
              onPhase={setCraftPhase}
              source={craftSource}
              onCrafted={applyStory}
              onStep={setQuizStep}
            />
          </div>
          {step === 1 && craftPhase !== 'quiz' ? (
            <div ref={editorRef} className="mt-5 scroll-mt-2">
              {craftPhase === 'crafted' ? (
                <button
                  type="button"
                  aria-expanded={editorOpen}
                  onClick={() => setEditorOpen((o) => !o)}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-[#21131b] px-4 text-left text-[15px] font-semibold text-[#fdf2f8]"
                >
                  <span>
                    Edit every detail
                    <span className="block text-[12.5px] font-normal text-[#c99aae]">
                      Photos, line items, scores and the letter
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-[#c99aae] transition-transform ${editorOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              ) : null}
              {craftPhase === 'manual' || editorOpen ? (
                <div className={craftPhase === 'crafted' ? 'mt-4' : ''}>
                  <FormatEditor
                    key={style}
                    style={style}
                    fields={draft}
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
          ) : null}
          {step === 2 ? (
            <Review
              style={style}
              styleTitle={displayTitle(cart)}
              themeTitle={pack.title}
              name={name.trim()}
              photos={photos}
              pieces={
                scrapbook
                  ? `${elements.length} on the desk`
                  : style === 'loop'
                    ? `${draft.loop.cards.length} of 4 cards`
                    : style === 'custom'
                      ? modules.map((m) => CUSTOM_MODULE_META[m].emoji).join(' ')
                      : undefined
              }
              onCustomize={customizeFirst}
            />
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
          {quizzing ? null : step < 2 ? (
            <button
              type="button"
              onClick={() => canContinue && setStep((s) => s + 1)}
              disabled={!canContinue}
              className="flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[#fdf2f8] font-serif text-[17px] font-semibold text-[#2d1b22] transition-transform active:scale-[0.98] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
            >
              {step === 0
                ? scrapbook
                  ? 'Next · build the scrapbook'
                  : 'Next · make it theirs'
                : 'Next · review'}
            </button>
          ) : (
            <MatteCta
              onClick={pay}
              loading={busy}
              label="Pay & send"
              price={CARTRIDGE_PRICE}
              loadingLabel="Opening secure checkout…"
              ariaLabel={`Pay ${CARTRIDGE_PRICE} and send`}
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

const StylePicker = memo(function StylePicker({
  style,
  theme,
  onStyle,
  onTheme,
  builder,
}: {
  style: GiftStyle;
  theme: ThemeId;
  onStyle: (style: GiftStyle) => void;
  onTheme: (theme: ThemeId) => void;
  /** Custom Hybrid's layer builder, shown under the formats when it's picked. */
  builder?: ReactNode;
}) {
  return (
    <>
      <p className="font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]">Format</p>
      <div role="radiogroup" aria-label="Format" className="mt-2 grid grid-cols-3 gap-2">
        {CARTRIDGES.map((cart, i) => {
          const selected = cart.id === style;
          return (
            <button
              key={cart.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-step-focus={selected ? '' : undefined}
              onClick={() => onStyle(cart.id as GiftStyle)}
              className={`group overflow-hidden rounded-xl border text-left transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4] ${
                selected ? 'border-[#ec4899] bg-[#2e1620]' : 'border-white/10 bg-[#21131b]'
              }`}
            >
              <span className="relative block aspect-[4/5] bg-[#1a0f14]">
                <StyleThumb style={cart.id as GiftStyle} sizes="96px" priority={i < 3} />
              </span>
              <span className="line-clamp-2 px-2 py-1.5 font-receipt text-[10px] font-bold uppercase leading-tight tracking-[0.1em]">
                {cart.id === 'custom' ? '✨ Custom Hybrid' : displayTitle(cart)}
              </span>
            </button>
          );
        })}
      </div>
      {builder ? (
        <div className="mt-4">
          <p className="mb-2 font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]">
            Build your stack
          </p>
          {builder}
        </div>
      ) : null}

      <p className="mt-5 font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]">
        Story pack
      </p>
      <div role="radiogroup" aria-label="Story pack" className="mt-2 grid gap-2">
        {THEMES.map((pack) => {
          const selected = pack.id === theme;
          return (
            <button
              key={pack.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onTheme(pack.id)}
              className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition-transform active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4] ${
                selected ? 'border-[#ec4899] bg-[#2e1620]' : 'border-white/10 bg-[#21131b]'
              }`}
            >
              <span
                aria-hidden
                className="h-9 w-7 shrink-0 rounded-md"
                style={{ background: pack.box.body, boxShadow: `inset 0 -8px 0 ${pack.box.band}` }}
              />
              <span className="min-w-0">
                <span className="block font-serif text-[16px] font-semibold leading-tight">
                  {pack.title}
                </span>
                <span className="block truncate text-[12px] text-[#c99aae]">{pack.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
});

const PhotoPicker = memo(function PhotoPicker({
  photos,
  processing,
  onAdd,
  onRemove,
  compact = false,
}: {
  photos: string[];
  processing: number;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  /** Inside the scrapbook's Polaroid editor, which supplies its own spacing. */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    const room = MAX_PHOTOS - photos.length - processing;
    const files = Array.from(list ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, room));
    if (files.length) onAdd(files);
  };
  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    take(e.target.files);
    e.target.value = '';
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files);
  };

  return (
    <>
      <p
        className={`font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae] ${compact ? '' : 'mt-5'}`}
      >
        1–3 photos of you two{compact ? ' · drop or tap to add' : ''}
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`mt-2 grid grid-cols-3 gap-2 rounded-2xl transition-shadow ${
          over ? 'shadow-[0_0_0_2px_#ec4899]' : ''
        }`}
      >
        {Array.from({ length: MAX_PHOTOS }, (_, i) => {
          const photo = photos[i];
          if (!photo && i < photos.length + processing) {
            return (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-xl bg-[#21131b]"
                aria-label={`Preparing photo ${i + 1}`}
                role="status"
              >
                <span
                  aria-hidden
                  className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#f9a8d4]"
                />
              </div>
            );
          }
          if (photo) {
            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-xl bg-[#21131b]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#180e15]/90 text-[#fdf2f8]"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            );
          }
          const isNext = i === photos.length + processing;
          return (
            <button
              key={i}
              type="button"
              disabled={!isNext}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-[#21131b] text-[#c99aae] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
              aria-label={isNext ? `Add photo ${i + 1}` : `Photo slot ${i + 1}`}
            >
              <Camera className="h-5 w-5" aria-hidden />
              <span className="font-receipt text-[10px] uppercase tracking-[0.12em]">
                {i === 0 ? 'Add' : 'Optional'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] italic leading-snug text-[#c99aae]">
        <span aria-hidden className="not-italic text-[#fdba74]">
          ✦
        </span>
        Photos are automatically color-matched to your chosen XSO aesthetic.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={onFiles}
      />
    </>
  );
});

/** Live, non-interactive miniature of the desk the recipient will open. */
const DESK_W = 380;
const DESK_H = 470;
const THUMB_SCALE = 0.45;

const THUMB_COPY: Record<GiftStyle, string> = {
  scrapbook: 'Every piece you check lands on their desk. Uncheck one and it’s cleared away.',
  loop: 'Each card you keep joins the loop. Open a card to bring it to the front.',
  rewind: 'Your tape label, scores and review land on the stack as you type.',
  accordion: 'Every line item prints onto the ribbon the moment you add it.',
  moviebox: 'Scene titles, stills and your rating play on the reel as you edit.',
  custom: 'Every layer you stack becomes a tab they play through, in this order.',
};

const LARGE_SCALE = 0.78;

/** Small beside the copy while editing by hand; large and tappable once the AI has filled it. */
const FormatThumb = memo(function FormatThumb({
  data,
  style,
  focus,
  large = false,
  onEdit,
  badge,
}: {
  data: XsoData;
  style: GiftStyle;
  focus?: number;
  large?: boolean;
  onEdit?: () => void;
  badge?: ReactNode;
}) {
  const deferred = useDeferredValue(data);
  const makeInert = useCallback((node: HTMLDivElement | null) => {
    node?.setAttribute('inert', '');
  }, []);
  const scale = large ? LARGE_SCALE : THUMB_SCALE;
  const Frame = onEdit ? 'button' : 'div';
  return (
    <div className={`mb-5 flex items-center gap-4 ${large ? 'flex-col' : ''}`}>
      <Frame
        {...(onEdit
          ? { type: 'button' as const, onClick: onEdit, 'aria-label': 'Edit the story' }
          : {})}
        className={`relative shrink-0 overflow-hidden rounded-2xl ${onEdit ? 'cursor-pointer ring-[#ec4899]/60 transition-shadow hover:ring-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]' : ''}`}
        style={{ width: DESK_W * scale, height: DESK_H * scale }}
      >
        {badge ? (
          <span
            className={`absolute inset-x-2 z-10 flex justify-center ${style === 'custom' ? 'bottom-2' : 'top-2'}`}
          >
            {badge}
          </span>
        ) : null}
        <div
          ref={makeInert}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: DESK_W, height: DESK_H, transform: `scale(${scale})` }}
        >
          <FormatPreview
            style={style}
            data={deferred}
            size="fill"
            chrome={false}
            focusIndex={focus}
            autoplay={4000}
          />
        </div>
      </Frame>
      {large ? null : (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-[#fdba74]">
            <span aria-hidden className="led-peach" />
            Live preview
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-[#e0b4c6]">{THUMB_COPY[style]}</p>
        </div>
      )}
    </div>
  );
});

const Review = memo(function Review({
  style,
  styleTitle,
  themeTitle,
  name,
  photos,
  pieces,
  onCustomize,
}: {
  style: GiftStyle;
  styleTitle: string;
  themeTitle: string;
  name: string;
  photos: string[];
  /** Scrapbook and Loop: which artifacts made the cut. */
  pieces?: string;
  onCustomize: () => void;
}) {
  return (
    <>
      <p className="mb-3 flex items-center justify-center gap-2 rounded-full border border-[#fdba74]/45 bg-[#2a1a12] px-3 py-2 text-center font-receipt text-[10.5px] font-bold uppercase leading-tight tracking-[0.1em] text-[#fed7aa]">
        <Zap className="h-3.5 w-3.5 shrink-0 fill-[#fdba74] text-[#fdba74]" aria-hidden />
        Instant link generated right after checkout · No app required
      </p>
      <div className="flex gap-4 rounded-2xl border border-white/10 bg-[#21131b] p-3">
        <span className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-[#1a0f14]">
          <StyleThumb style={style} sizes="96px" />
        </span>
        <dl className="min-w-0 flex-1 space-y-1.5 text-[14px]">
          <Row label="For" value={name} />
          <Row label="Format" value={styleTitle} />
          <Row label="Story" value={themeTitle} />
          {pieces !== undefined ? <Row label="Pieces" value={pieces} /> : null}
          <Row label="Photos" value={`${photos.length} added`} />
          <Row label="Total" value={CARTRIDGE_PRICE} strong />
        </dl>
      </div>
      <p
        className="mt-4 text-pretty text-[14px] leading-relaxed text-[#e0b4c6]"
        data-step-focus
        tabIndex={-1}
      >
        Anything you didn’t edit keeps the story pack’s starter text. Want the full studio with a
        big live preview?{' '}
        <Link
          href={`/customize?${styleQuery(style)}`}
          className="font-semibold text-[#f9a8d4] underline underline-offset-2"
          onClick={onCustomize}
        >
          Customize first
        </Link>
        .
      </p>
    </>
  );
});

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-receipt text-[10px] uppercase tracking-[0.16em] text-[#9a6a7e]">
        {label}
      </dt>
      <dd
        className={`truncate ${strong ? 'font-receipt font-bold text-[#fdba74]' : 'font-semibold'}`}
      >
        {value}
      </dd>
    </div>
  );
}
