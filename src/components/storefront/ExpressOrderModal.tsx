'use client';

import Link from 'next/link';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Camera, Lock, X } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import { useExpressOrder } from '@/store/useExpressOrder';
import { CARTRIDGE_PRICE, CARTRIDGES, displayTitle, getCartridge } from '@/lib/cartridges';
import { THEMES, getTheme, type ThemeId } from '@/lib/themes';
import { compressImage } from '@/lib/media';
import { startCheckout } from '@/lib/startCheckout';
import { styleQuery } from '@/lib/styleLock';
import { MatteCta } from '@/components/desk/MatteCta';
import { StyleThumb } from '@/components/storefront/StyleThumb';
import type { GiftStyle } from '@/types/xso';

const MAX_PHOTOS = 3;
const MAX_NAME = 40;
const STEPS = ['Style', 'Photos', 'Pay'] as const;
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('[data-step-focus]')?.focus({
      preventScroll: true,
    });
  }, [step]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
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

  const addPhotos = useCallback(async (files: File[]) => {
    setError(null);
    try {
      const shrunk = await Promise.all(files.map((file) => compressImage(file)));
      setPhotos((current) => [...current, ...shrunk].slice(0, MAX_PHOTOS));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo');
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }, []);

  /** Writes the express choices into the draft (theme first, since it resets content). */
  const commit = useCallback(() => {
    const store = useXsoStore.getState();
    if (store.themeId !== theme) store.applyTheme(theme);
    const { setField, setPhotoAt } = useXsoStore.getState();
    setField('giftStyle', style);
    if (name.trim()) setField('customerName', name.trim());
    photos.forEach((photo, i) => setPhotoAt(i, photo));
  }, [name, photos, style, theme]);

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

  const canContinue = step === 0 || (photos.length > 0 && name.trim().length > 0);
  const cart = getCartridge(style);
  const pack = getTheme(theme) ?? THEMES[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <motion.button
        type="button"
        aria-label="Close express order"
        tabIndex={-1}
        className="absolute inset-0 bg-[#0c0609]/80"
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
        className="relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#180e15] text-[#fdf2f8] shadow-[0_-12px_40px_rgba(0,0,0,.5)] md:max-w-lg md:rounded-3xl"
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
                  ? 'Who is it for?'
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-4">
          {step === 0 ? (
            <StylePicker style={style} theme={theme} onStyle={setStyle} onTheme={setTheme} />
          ) : step === 1 ? (
            <PhotosAndName
              photos={photos}
              name={name}
              onName={setName}
              onAdd={addPhotos}
              onRemove={removePhoto}
            />
          ) : (
            <Review
              style={style}
              styleTitle={displayTitle(cart)}
              themeTitle={pack.title}
              name={name.trim()}
              photos={photos}
              onCustomize={customizeFirst}
            />
          )}
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
          {step < 2 ? (
            <button
              type="button"
              onClick={() => canContinue && setStep((s) => s + 1)}
              disabled={!canContinue}
              className="flex min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[#fdf2f8] font-serif text-[17px] font-semibold text-[#2d1b22] transition-transform active:scale-[0.98] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
            >
              {step === 0 ? 'Next · add their faces' : 'Next · review'}
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
}: {
  style: GiftStyle;
  theme: ThemeId;
  onStyle: (style: GiftStyle) => void;
  onTheme: (theme: ThemeId) => void;
}) {
  return (
    <>
      <p className="font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]">Format</p>
      <div
        role="radiogroup"
        aria-label="Format"
        className="mt-2 grid grid-cols-3 gap-2 min-[420px]:grid-cols-5"
      >
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
              <span className="block truncate px-2 py-1.5 font-receipt text-[10px] font-bold uppercase tracking-[0.1em]">
                {displayTitle(cart)}
              </span>
            </button>
          );
        })}
      </div>

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

const PhotosAndName = memo(function PhotosAndName({
  photos,
  name,
  onName,
  onAdd,
  onRemove,
}: {
  photos: string[];
  name: string;
  onName: (name: string) => void;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    if (files.length) onAdd(files);
  };

  return (
    <>
      <label
        htmlFor="express-name"
        className="font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]"
      >
        Their name
      </label>
      <input
        id="express-name"
        data-step-focus
        value={name}
        onChange={(e) => onName(e.target.value.slice(0, MAX_NAME))}
        autoComplete="off"
        enterKeyHint="next"
        placeholder="e.g. Alex"
        className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-[#21131b] px-4 text-[16px] text-[#fdf2f8] placeholder:text-[#7f5466] focus:border-[#ec4899] focus:outline-none"
      />

      <p className="mt-5 font-receipt text-[11px] uppercase tracking-[0.18em] text-[#c99aae]">
        1–3 photos of you two
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {Array.from({ length: MAX_PHOTOS }, (_, i) => {
          const photo = photos[i];
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
          const isNext = i === photos.length;
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

const Review = memo(function Review({
  style,
  styleTitle,
  themeTitle,
  name,
  photos,
  onCustomize,
}: {
  style: GiftStyle;
  styleTitle: string;
  themeTitle: string;
  name: string;
  photos: string[];
  onCustomize: () => void;
}) {
  return (
    <>
      <div className="flex gap-4 rounded-2xl border border-white/10 bg-[#21131b] p-3">
        <span className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-[#1a0f14]">
          <StyleThumb style={style} sizes="96px" />
        </span>
        <dl className="min-w-0 flex-1 space-y-1.5 text-[14px]">
          <Row label="For" value={name} />
          <Row label="Format" value={styleTitle} />
          <Row label="Story" value={themeTitle} />
          <Row label="Photos" value={`${photos.length} added`} />
          <Row label="Total" value={CARTRIDGE_PRICE} strong />
        </dl>
      </div>
      <p
        className="mt-4 text-pretty text-[14px] leading-relaxed text-[#e0b4c6]"
        data-step-focus
        tabIndex={-1}
      >
        Our story pack fills in the rest: the receipt, the audit and the letter. Want to write every
        line yourself?{' '}
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
