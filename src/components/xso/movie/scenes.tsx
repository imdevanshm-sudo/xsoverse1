'use client';

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { isPlaceholderPhoto, type AuditMetrics, type MovieLayers, type XsoData } from '@/types/xso';
import { auditLabel } from '@/lib/formats';
import { photoCaption } from '@/lib/photoStrips';
import { LazyMedia } from '@/components/xso/LazyMedia';
import { playSound, useTexture } from '@/lib/sound';
import type { StageSize } from '@/components/xso/movie/useStage';

export interface SceneProps {
  data: XsoData;
  movie: MovieLayers;
  /** Which of the four scenes (receipt, audit, photos, letter) this is. */
  scene: number;
  /** Position in the reel, for the slate number. */
  index: number;
  stage: StageSize;
  /** On screen now; animations start when this turns true. */
  active: boolean;
  reduce: boolean;
  /** The scene has played out (the letter's last line has landed). */
  onDone?: () => void;
}

export const Slate = memo(function Slate({
  index,
  title,
  big,
}: {
  index: number;
  title?: string;
  big: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`font-receipt uppercase tracking-[0.32em] text-[#fdba74] ${big ? 'text-[13px]' : 'text-[11px]'}`}
      >
        Scene {String(index + 1).padStart(2, '0')}
      </p>
      {title ? (
        <h2
          className={`mt-1.5 text-balance font-serif font-semibold leading-tight text-[#fffaf0] ${big ? 'text-[44px]' : 'text-[26px]'}`}
        >
          {title}
        </h2>
      ) : null}
    </div>
  );
});

/** Film subtitle: always real text, sitting in the reserved caption zone above the controls. */
export const Subtitle = memo(function Subtitle({
  children,
  big,
}: {
  children: ReactNode;
  big: boolean;
}) {
  if (!children) return null;
  return (
    <p
      className={`mx-auto max-w-[36ch] text-balance text-center font-serif italic leading-snug text-[#fffaf0] [text-shadow:0_1px_10px_rgba(0,0,0,0.95),0_0_2px_rgba(0,0,0,0.9)] ${big ? 'text-[22px]' : 'text-[18px]'}`}
    >
      {children}
    </p>
  );
});

function sceneTitle(movie: MovieLayers, scene: number, data: XsoData) {
  return data.moviebox ? movie.scenes[scene]?.title : undefined;
}

export const ReceiptScene = memo(function ReceiptScene({
  data,
  movie,
  scene,
  index,
  stage,
}: SceneProps) {
  const { big, landscape } = stage;
  return (
    <div
      className={`flex h-full w-full items-center justify-center gap-8 px-6 ${landscape ? 'flex-row' : 'flex-col'}`}
    >
      <Slate index={index} title={sceneTitle(movie, scene, data)} big={big} />
      <div
        className={`w-full rotate-[-1deg] bg-[#fbf6ec] px-5 py-5 font-receipt uppercase text-[#2a1712] shadow-[0_24px_60px_rgba(0,0,0,0.6)] ${big ? 'max-w-[480px] px-7 py-7 text-[18px]' : 'max-w-[310px] text-[13px]'}`}
      >
        {data.merchantName ? (
          <p className="text-center font-bold tracking-[0.08em]">{data.merchantName}</p>
        ) : null}
        <div className="my-3 border-t border-dashed border-[#2a1712]/40" />
        <ul className="space-y-1.5">
          {data.lineItems.slice(0, 5).map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {item.qty ? `${item.qty} ` : ''}
                {item.description}
              </span>
              <span className="shrink-0 tabular-nums">{item.price}</span>
            </li>
          ))}
        </ul>
        <div className="my-3 border-t border-dashed border-[#2a1712]/40" />
        <p className="flex justify-between gap-3 font-bold">
          <span>Total</span>
          <span>{data.total}</span>
        </p>
      </div>
    </div>
  );
});

const BAR_START = 0.5;
const BAR_STAGGER = 0.28;

/** One audit row: label wraps, bar fills proportionally, score counts up with it. */
const AuditBar = memo(function AuditBar({
  label,
  score,
  delay,
  reduce,
  active,
}: {
  label: string;
  score: number;
  delay: number;
  reduce: boolean;
  active: boolean;
}) {
  const [shown, setShown] = useState(reduce || !active ? score : 0);
  useEffect(() => {
    if (reduce || !active) {
      setShown(score);
      return;
    }
    setShown(0);
    const controls = animate(0, score, {
      duration: 0.9,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [active, delay, reduce, score]);

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,2.2fr)_2.5rem] items-center gap-2.5 sm:gap-3">
      <span className="break-words font-receipt text-[13px] uppercase leading-tight tracking-[0.08em] text-[#fffaf0]/85 [overflow-wrap:anywhere] sm:text-[14px]">
        {label}
      </span>
      <span className="h-2.5 overflow-hidden rounded-full bg-[#fffaf0]/10">
        <motion.span
          className="block h-full origin-left rounded-full bg-gradient-to-r from-[#fdba74] to-[#f472b6]"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: active ? score / 100 : 0 }}
          transition={{
            duration: reduce ? 0 : 0.9,
            delay: reduce ? 0 : delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </span>
      <span className="text-right font-receipt text-[14px] tabular-nums text-[#fffaf0]/85">
        {shown}
      </span>
    </li>
  );
});

/** The audit: bars fill one after another while the star rating counts up to its score. */
export const AuditScene = memo(function AuditScene({
  data,
  movie,
  scene,
  index,
  stage,
  active,
  reduce,
}: SceneProps) {
  const { big } = stage;
  const metrics = useMemo(
    () => Object.entries(data.auditMetrics) as [keyof AuditMetrics, number][],
    [data.auditMetrics],
  );
  const [rating, setRating] = useState(reduce ? movie.stars : 0);
  useEffect(() => {
    if (reduce || !active) {
      setRating(movie.stars);
      return;
    }
    setRating(0);
    const total = BAR_START + BAR_STAGGER * metrics.length + 0.6;
    const controls = animate(0, movie.stars, {
      duration: total,
      ease: 'easeOut',
      onUpdate: setRating,
    });
    /** A tick as each bar starts to fill, then one chime when the count lands. */
    const timers = [
      ...metrics.map((_, i) =>
        window.setTimeout(() => playSound('movie.bar'), (BAR_START + i * BAR_STAGGER) * 1000),
      ),
      window.setTimeout(() => playSound('movie.star'), total * 1000),
    ];
    return () => {
      controls.stop();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [active, metrics, movie.stars, reduce]);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-5 sm:px-6">
      <Slate index={index} title={sceneTitle(movie, scene, data)} big={big} />
      <p
        className={`font-serif font-semibold text-[#fffaf0] ${big ? 'text-[56px]' : 'text-[44px]'}`}
        aria-label={`Rated ${movie.stars} out of 5`}
      >
        <span className="tabular-nums" aria-hidden>
          {rating.toFixed(1)}
        </span>{' '}
        <span className="text-[#fdba74]" aria-hidden>
          ★
        </span>
      </p>
      <ul className={`w-full space-y-3.5 ${big ? 'max-w-[560px]' : 'max-w-[360px]'}`}>
        {metrics.map(([key, score], i) => (
          <AuditBar
            key={key}
            label={auditLabel(data, key)}
            score={score}
            delay={BAR_START + i * BAR_STAGGER}
            reduce={reduce}
            active={active}
          />
        ))}
      </ul>
    </div>
  );
});

/**
 * Photos for the montage: real uploads first (scene still, then gift photos). Theme placeholders
 * only when nothing was uploaded — those render as wrapping cards, not cropped SVG text.
 */
export function montagePhotos(data: XsoData, movie: MovieLayers): string[] {
  const own = movie.scenes[2]?.image;
  const candidates = [own, ...data.photos].filter((src): src is string => Boolean(src));
  const uploaded = candidates.filter((src) => !isPlaceholderPhoto(src));
  return (uploaded.length ? uploaded : []).slice(0, 6);
}

/** Lore lines used when the sender left no photos. */
export function montageFallback(data: XsoData): string[] {
  return [
    ...data.greenFlags.slice(0, 2),
    ...data.lineItems.slice(0, 2).map((item) => item.description),
  ]
    .filter(Boolean)
    .slice(0, 4);
}

const SLIDE_MS = 5000;
/** Start and end framing for each slide, alternating so consecutive photos drift differently. */
const DRIFT = [
  { from: { scale: 1, x: '0%', y: '0%' }, to: { scale: 1.12, x: '-2%', y: '-2%' } },
  { from: { scale: 1.12, x: '2%', y: '1%' }, to: { scale: 1, x: '0%', y: '0%' } },
  { from: { scale: 1.04, x: '-2%', y: '2%' }, to: { scale: 1.14, x: '2%', y: '-1%' } },
];

/** The montage: uploaded photos as a Ken Burns slideshow, or wrapping lore cards as fallback. */
export const PhotoScene = memo(function PhotoScene({
  data,
  movie,
  active,
  reduce,
  stage,
}: SceneProps) {
  const photos = montagePhotos(data, movie);
  const cards = useMemo(() => (photos.length ? [] : montageFallback(data)), [data, photos.length]);
  const slides = photos.length || cards.length;
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (!active || slides < 2) return;
    const timer = window.setInterval(
      () => setSlide((n) => (n + 1) % slides),
      reduce ? SLIDE_MS * 1.5 : SLIDE_MS,
    );
    return () => window.clearInterval(timer);
  }, [active, reduce, slides]);
  const current = slides ? slide % slides : 0;
  const next = slides ? (current + 1) % slides : 0;
  /** One soft shutter per new slide. */
  const shown = useRef(current);
  useEffect(() => {
    if (shown.current === current) return;
    shown.current = current;
    playSound('movie.shutter');
  }, [current]);
  const drift = DRIFT[current % DRIFT.length];
  const caption = photos.length
    ? photoCaption(data, current)
    : cards[current]
      ? photoCaption(data, current)
      : movie.scenes[2]?.caption;

  if (!photos.length) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden bg-[#0b0507] px-6 pb-8">
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            key={current}
            className={`w-full max-w-[20ch] break-words rounded-sm border border-[#fdba74]/25 bg-[#1b0e0b] px-5 py-6 text-center font-serif italic leading-snug text-[#fffaf0] [overflow-wrap:anywhere] ${stage.big ? 'text-[28px]' : 'text-[22px]'}`}
            style={{ transform: `rotate(${[-1.5, 1, -0.5, 0.8][current % 4]}deg)` }}
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.6 }}
          >
            {cards[current]}
          </motion.p>
        </AnimatePresence>
        {caption ? (
          <p className="mt-2 max-w-[36ch] text-balance text-center font-serif text-[18px] italic text-[#fffaf0]/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
            {caption}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 1.2, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute inset-0 will-change-transform"
            initial={reduce ? false : drift.from}
            animate={reduce ? undefined : drift.to}
            transition={{ duration: (SLIDE_MS + 1200) / 1000, ease: 'linear' }}
          >
            <LazyMedia
              src={photos[current]}
              alt={caption || `Memory ${current + 1} of ${photos.length}`}
              fill
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      {photos.length > 1 ? <link rel="preload" as="image" href={photos[next]} /> : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
      />
      {caption ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-[5.25rem] z-10 px-6 text-balance text-center font-serif text-[18px] italic text-[#fffaf0] [text-shadow:0_1px_10px_rgba(0,0,0,0.95)]">
          {caption}
        </p>
      ) : null}
    </div>
  );
});

/** Without photos, the montage is a run of title cards made from the gift's own words. */
export function montageCards(data: XsoData): string[] {
  return montageFallback(data).slice(0, 3);
}

export const TitleCards = memo(function TitleCards({ data, stage }: SceneProps) {
  const cards = montageCards(data);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6">
      {cards.map((text, i) => (
        <p
          key={i}
          className={`w-full break-words rounded-sm border border-[#fdba74]/25 bg-[#1b0e0b] px-5 py-4 text-center font-serif italic leading-snug text-[#fffaf0] [overflow-wrap:anywhere] ${stage.big ? 'max-w-[520px] text-[22px]' : 'max-w-[320px] text-[18px]'}`}
          style={{ transform: `rotate(${[-1.5, 1, -0.5][i]}deg)` }}
        >
          {text}
        </p>
      ))}
    </div>
  );
});

/** The letter's lines: paragraphs first, then sentences, so the reveal has a rhythm. */
export function letterLines(message: string): string[] {
  return message
    .split(/\n+/)
    .flatMap((para) => para.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [para])
    .map((line) => line.trim())
    .filter(Boolean);
}

const CHAR_MS = 24;
const LINE_PAUSE = 450;
/** A breath before the last line lands. */
const FINAL_PAUSE = 1400;
const AFTER_LETTER = 2600;
/** Lines that are heard being typed before the keys fade out. */
const TYPED_LINES = 2;

/**
 * The letter types itself out line by line, holds before the final line, then signs off. A tap
 * finishes it at once; reduced motion shows it whole. Screen readers get the full text up front.
 */
export const LetterScene = memo(function LetterScene({
  data,
  stage,
  active,
  reduce,
  onDone,
}: SceneProps) {
  const { big } = stage;
  const lines = useMemo(() => letterLines(data.birthdayMessage), [data.birthdayMessage]);
  const total = lines.length;
  const [line, setLine] = useState(reduce ? total : 0);
  const [chars, setChars] = useState(0);
  const done = line >= total;
  /** Typewriter keys over the first lines only; reduced motion shows the letter whole, silently. */
  const keys = useTexture('letter.type');
  const typing = active && !reduce && !done && line < TYPED_LINES;
  useEffect(() => {
    if (typing) keys.touch();
    else keys.stop(line >= TYPED_LINES ? 700 : 120);
  }, [typing, keys, line]);

  useEffect(() => {
    if (!active || done) return;
    const text = lines[line];
    if (chars < text.length) {
      const timer = window.setTimeout(() => setChars((c) => c + 1), CHAR_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => {
        setLine((l) => l + 1);
        setChars(0);
      },
      line === total - 2 ? FINAL_PAUSE : LINE_PAUSE,
    );
    return () => window.clearTimeout(timer);
  }, [active, chars, done, line, lines, total]);

  useEffect(() => {
    if (!active || !done || !onDone) return;
    const timer = window.setTimeout(onDone, AFTER_LETTER);
    return () => window.clearTimeout(timer);
  }, [active, done, onDone]);

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-y-auto px-7 py-20"
      onClick={() => setLine(total)}
    >
      <div className={`w-full ${big ? 'max-w-[640px]' : 'max-w-[340px]'}`}>
        <p
          className={`font-hand leading-none text-[#fffaf0] ${big ? 'text-[44px]' : 'text-[34px]'}`}
        >
          Dear {data.customerName},
        </p>
        <p className="sr-only">{data.birthdayMessage}</p>
        <div
          aria-hidden
          className={`mt-5 space-y-2 font-serif italic text-[#fffaf0]/90 ${big ? 'text-[20px] leading-relaxed' : 'text-[17px] leading-snug'}`}
        >
          {lines.map((text, i) => {
            if (i < line) return <p key={i}>{text}</p>;
            if (i > line)
              return (
                <p key={i} className="invisible">
                  {text}
                </p>
              );
            return (
              <p key={i}>
                {text.slice(0, chars)}
                <span className="movie-caret" />
                <span className="invisible">{text.slice(chars)}</span>
              </p>
            );
          })}
        </div>
        {data.billerName ? (
          <p
            className={`mt-6 text-right font-hand text-[#fdba74] transition-opacity duration-700 ${done ? 'opacity-100' : 'opacity-0'} ${big ? 'text-[32px]' : 'text-[26px]'}`}
          >
            — {data.billerName}
          </p>
        ) : null}
      </div>
    </div>
  );
});
