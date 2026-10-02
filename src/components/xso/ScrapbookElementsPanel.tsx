'use client';

import { memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import { compressImage } from '@/lib/media';
import { ScrapbookElements, type ScrapbookFields } from '@/components/xso/ScrapbookElements';
import { PhotoFrame } from '@/components/xso/XsoEditor';

const POLAROIDS = 3;

const patchStore = (patch: Partial<ScrapbookFields>) => useXsoStore.setState(patch);

/** Studio wrapper: the scrapbook checklist bound straight to the draft store. */
export const ScrapbookElementsPanel = memo(function ScrapbookElementsPanel() {
  const fields = useXsoStore(
    useShallow((s) => ({
      merchantName: s.merchantName,
      timestamp: s.timestamp,
      lineItems: s.lineItems,
      birthdayMessage: s.birthdayMessage,
      billerName: s.billerName,
      voiceNoteUrl: s.voiceNoteUrl,
      scrapbook: s.scrapbook,
    })),
  );
  const setScrapbook = useXsoStore((s) => s.setScrapbook);
  const photos = useXsoStore((s) => s.photos);
  const setPhotoAt = useXsoStore((s) => s.setPhotoAt);

  const placeFiles = useCallback(
    async (start: number, files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) throw new Error('Please choose an image file');
      for (let i = 0; i < images.length && start + i < POLAROIDS; i += 1) {
        setPhotoAt(start + i, await compressImage(images[i]));
      }
    },
    [setPhotoAt],
  );

  const photoSlot = useMemo(
    () => (
      <div>
        <p className="mb-1.5 font-receipt text-[11px] uppercase tracking-[0.14em] text-[#8a5f6e]">
          Polaroids · drop photos or tap a frame
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: POLAROIDS }, (_, index) => (
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
    ),
    [photos, placeFiles, setPhotoAt],
  );

  return (
    <section className="paper-panel p-4 sm:p-6" aria-labelledby="scrapbook-elements-title">
      <h2
        id="scrapbook-elements-title"
        className="font-serif text-[20px] font-semibold leading-tight text-[#2d1b22]"
      >
        Build your scrapbook elements
      </h2>
      <p className="mb-4 mt-0.5 text-[13px] text-[#8a5f6e]">
        Check what goes on their desk. Unchecked pieces disappear from the preview.
      </p>
      <ScrapbookElements
        tone="paper"
        fields={fields}
        onPatch={patchStore}
        onLayers={setScrapbook}
        photoSlot={photoSlot}
      />
    </section>
  );
});
