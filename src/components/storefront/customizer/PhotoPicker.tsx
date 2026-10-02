'use client';

import { memo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Camera, X } from 'lucide-react';

export const MAX_PHOTOS = 3;

export const PhotoPicker = memo(function PhotoPicker({
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
  /** Inside an editor that supplies its own spacing. */
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
        Up to 3 photos of you two · drop or tap to add
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
      <p className="mt-2.5 flex items-start gap-1.5 text-[13px] leading-snug text-[#c99aae]">
        <span aria-hidden className="text-[#fdba74]">
          ✦
        </span>
        We automatically color-match your photos to your chosen XSO style.
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
