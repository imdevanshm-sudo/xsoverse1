'use client';

import { memo, useCallback } from 'react';
import { useXsoStore } from '@/store/useXsoStore';
import { compressImage } from '@/lib/media';
import { THEMES, getTheme } from '@/lib/themes';
import { FormatEditor, type FormatPatch } from '@/components/xso/FormatEditor';
import { PhotoFrame } from '@/components/xso/XsoEditor';
import type { GiftStyle } from '@/types/xso';

const FRAMES = 3;

const patchStore = (patch: FormatPatch) => useXsoStore.setState(patch);

/** The first three photo frames of the draft, as drop/tap targets. */
export const StudioPhotoFrames = memo(function StudioPhotoFrames({ label }: { label: string }) {
  const photos = useXsoStore((s) => s.photos);
  const setPhotoAt = useXsoStore((s) => s.setPhotoAt);
  const placeFiles = useCallback(
    async (start: number, files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) throw new Error('Please choose an image file');
      for (let i = 0; i < images.length && start + i < FRAMES; i += 1) {
        setPhotoAt(start + i, await compressImage(images[i]));
      }
    },
    [setPhotoAt],
  );
  return (
    <div>
      <p className="mb-1.5 font-receipt text-[11px] uppercase tracking-[0.14em] text-[#8a5f6e]">
        {label} · drop photos or tap a frame
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: FRAMES }, (_, index) => (
          <PhotoFrame
            key={index}
            index={index}
            url={photos[index] ?? ''}
            onFiles={placeFiles}
            onClear={() => setPhotoAt(index, '')}
          />
        ))}
      </div>
    </div>
  );
});

/** Studio wrapper: the format-aware editor bound straight to the draft store. */
export const FormatEditorPanel = memo(function FormatEditorPanel({
  style,
  onFocusCard,
}: {
  style: GiftStyle;
  onFocusCard?: (index: number) => void;
}) {
  const fields = useXsoStore();
  const { setFormat, resetStory, themeId } = fields;
  const packTitle = (getTheme(themeId) ?? THEMES[0]).title;

  return (
    <section
      id="format-editor"
      className="paper-panel scroll-mt-[calc(var(--xso-header-h)+0.5rem)] p-4 sm:p-6"
      aria-label="Format editor"
    >
      <FormatEditor
        key={style}
        tone="paper"
        style={style}
        fields={fields}
        onPatch={patchStore}
        onFormat={setFormat}
        photoSlot={
          <StudioPhotoFrames label={style === 'scrapbook' ? 'Polaroids' : 'Your photos'} />
        }
        packTitle={packTitle}
        onReset={resetStory}
        onFocusCard={onFocusCard}
      />
    </section>
  );
});
