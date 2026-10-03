'use client';

import { memo, type ReactNode } from 'react';
import type { AuditMetrics, MovieLayers, XsoData } from '@/types/xso';
import { auditLabel } from '@/lib/formats';
import { LazyMedia } from '@/components/xso/LazyMedia';
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

/** Film subtitle: always real text, sitting above the controls. */
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
      className={`mx-auto max-w-[36ch] text-balance text-center font-serif italic leading-snug text-[#fffaf0] [text-shadow:0_1px_8px_rgba(0,0,0,0.95)] ${big ? 'text-[20px]' : 'text-[16px]'}`}
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
            <li key={item.id} className="flex justify-between gap-3">
              <span className="truncate">
                {item.qty ? `${item.qty} ` : ''}
                {item.description}
              </span>
              <span className="shrink-0">{item.price}</span>
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

export const AuditScene = memo(function AuditScene({
  data,
  movie,
  scene,
  index,
  stage,
}: SceneProps) {
  const { big } = stage;
  const metrics = Object.entries(data.auditMetrics) as [keyof AuditMetrics, number][];
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6">
      <Slate index={index} title={sceneTitle(movie, scene, data)} big={big} />
      <p
        className={`font-serif font-semibold text-[#fffaf0] ${big ? 'text-[56px]' : 'text-[44px]'}`}
        aria-label={`Rated ${movie.stars} out of 5`}
      >
        {movie.stars.toFixed(1)} <span className="text-[#fdba74]">★</span>
      </p>
      <ul className={`w-full space-y-3 ${big ? 'max-w-[520px]' : 'max-w-[330px]'}`}>
        {metrics.map(([key, score]) => (
          <li
            key={key}
            className="grid grid-cols-[minmax(0,8.5rem)_1fr_2.25rem] items-center gap-3"
          >
            <span className="truncate font-receipt text-[14px] uppercase tracking-[0.1em] text-[#fffaf0]/85">
              {auditLabel(data, key)}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-[#fffaf0]/10">
              <span
                className="block h-full origin-left rounded-full bg-gradient-to-r from-[#fdba74] to-[#f472b6]"
                style={{ transform: `scaleX(${score / 100})` }}
              />
            </span>
            <span className="text-right font-receipt text-[14px] tabular-nums text-[#fffaf0]/85">
              {score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});

/** Photos the sender uploaded for the montage: the scene's own still first, then the gift's. */
export function montagePhotos(data: XsoData, movie: MovieLayers): string[] {
  const own = movie.scenes[2]?.image;
  return [own, ...data.photos].filter((src): src is string => Boolean(src)).slice(0, 6);
}

export const PhotoScene = memo(function PhotoScene({ data, movie }: SceneProps) {
  const photos = montagePhotos(data, movie);
  return (
    <div className="absolute inset-0 grid grid-cols-1 gap-1 bg-black">
      {photos.map((src, i) => (
        <div key={i} className="relative min-h-0 overflow-hidden">
          <LazyMedia
            src={src}
            alt={`Memory ${i + 1}`}
            fill
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
});

/** Without photos, the montage is a run of title cards made from the gift's own words. */
export function montageCards(data: XsoData): string[] {
  return [
    ...data.greenFlags.slice(0, 2),
    ...data.lineItems.slice(0, 2).map((item) => item.description),
  ]
    .filter(Boolean)
    .slice(0, 3);
}

export const TitleCards = memo(function TitleCards({ data, stage }: SceneProps) {
  const cards = montageCards(data);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6">
      {cards.map((text, i) => (
        <p
          key={i}
          className={`w-full rounded-sm border border-[#fdba74]/25 bg-[#1b0e0b] px-5 py-4 text-center font-serif italic text-[#fffaf0] ${stage.big ? 'max-w-[520px] text-[22px]' : 'max-w-[320px] text-[18px]'}`}
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

export const LetterScene = memo(function LetterScene({ data, stage }: SceneProps) {
  const { big } = stage;
  const lines = letterLines(data.birthdayMessage);
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto px-7 py-20">
      <div className={`w-full ${big ? 'max-w-[640px]' : 'max-w-[340px]'}`}>
        <p
          className={`font-hand leading-none text-[#fffaf0] ${big ? 'text-[44px]' : 'text-[34px]'}`}
        >
          Dear {data.customerName},
        </p>
        <div
          className={`mt-5 space-y-2 font-serif italic text-[#fffaf0]/90 ${big ? 'text-[20px] leading-relaxed' : 'text-[17px] leading-snug'}`}
        >
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {data.billerName ? (
          <p
            className={`mt-6 text-right font-hand text-[#fdba74] ${big ? 'text-[32px]' : 'text-[26px]'}`}
          >
            — {data.billerName}
          </p>
        ) : null}
      </div>
    </div>
  );
});
