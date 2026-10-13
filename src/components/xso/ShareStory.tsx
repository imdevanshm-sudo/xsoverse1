'use client';

import { createContext, useContext, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, Share2, X } from 'lucide-react';
import { track } from '@/lib/analytics';
import { canRecordStory, renderStoryVideo, storyInput } from '@/lib/storyVideo';
import type { XsoData } from '@/types/xso';

/** The opened gift, for the recipient's "Post to your story". Absent in previews and drafts. */
const StoryGift = createContext<XsoData | null>(null);
export const StoryGiftProvider = StoryGift.Provider;

const stop = (event: SyntheticEvent) => event.stopPropagation();

export function ShareStoryButton({ source, className }: { source: string; className: string }) {
  const data = useContext(StoryGift);
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setSupported(canRecordStory()), []);
  if (!data || !supported) return null;
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          track('story_video', { source, step: 'open' });
          setOpen(true);
        }}
        className={className}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Post to your story
      </button>
      {open
        ? createPortal(
            <StorySheet data={data} source={source} onClose={() => setOpen(false)} />,
            document.body,
          )
        : null}
    </>
  );
}

type Render =
  | { state: 'rendering'; progress: number }
  | { state: 'ready'; file: File; url: string }
  | { state: 'failed' };

function StorySheet({
  data,
  source,
  onClose,
}: {
  data: XsoData;
  source: string;
  onClose: () => void;
}) {
  const [render, setRender] = useState<Render>({ state: 'rendering', progress: 0 });
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let live = true;
    let url = '';
    setRender({ state: 'rendering', progress: 0 });
    renderStoryVideo(storyInput(data), (progress) => {
      if (live) setRender({ state: 'rendering', progress });
    })
      .then((file) => {
        url = URL.createObjectURL(file);
        if (live) setRender({ state: 'ready', file, url });
      })
      .catch(() => live && setRender({ state: 'failed' }));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data, attempt]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ready = render.state === 'ready' ? render : null;
  const canShareFile = Boolean(ready && navigator.canShare?.({ files: [ready.file] }));

  const share = async () => {
    if (!ready) return;
    track('story_video', { source, step: 'share' });
    try {
      await navigator.share({ files: [ready.file] });
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') save();
    }
  };
  const save = () => {
    if (!ready) return;
    track('story_video', { source, step: 'save' });
    const link = document.createElement('a');
    link.href = ready.url;
    link.download = ready.file.name;
    link.click();
  };

  const action =
    'flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-full px-6 font-serif text-[18px] font-semibold';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-title"
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 p-3 sm:items-center"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerDown={stop}
      onTouchStart={stop}
    >
      <div className="relative w-full max-w-[400px] rounded-[28px] border border-white/10 bg-[#1b0f15] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-center text-[#fffaf0] shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <h2 id="story-title" className="font-serif text-[22px] font-semibold leading-tight">
          Post to your story
        </h2>
        <p className="mx-auto mt-1 max-w-[30ch] text-[13px] leading-snug text-[#e0b4c6]">
          Shows your photos and the letter&apos;s first line only. Your gift link stays private.
        </p>

        <div className="mx-auto mt-4 aspect-[9/16] max-h-[52svh] overflow-hidden rounded-2xl bg-black">
          {ready ? (
            <video
              src={ready.url}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
              {render.state === 'failed' ? (
                <>
                  <p className="text-[14px] leading-snug text-[#fda4af]">
                    We couldn&apos;t make the video on this browser.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAttempt((n) => n + 1)}
                    className="min-h-11 rounded-full border border-white/20 px-5 font-receipt text-[12px] uppercase tracking-[0.16em]"
                  >
                    Try again
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-[#f9a8d4]" aria-hidden />
                  <p className="font-receipt text-[12px] uppercase tracking-[0.18em] text-[#e0b4c6]">
                    Making your video…{' '}
                    {render.state === 'rendering' ? Math.round(render.progress * 100) : 0}%
                  </p>
                  <span className="block h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-[#ec4899]"
                      style={{
                        width: `${render.state === 'rendering' ? render.progress * 100 : 0}%`,
                      }}
                    />
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-2">
          {canShareFile ? (
            <button
              type="button"
              onClick={() => void share()}
              className={`matte-cta ${action} shadow-[0_14px_40px_rgba(236,72,153,.35)]`}
            >
              <Share2 className="h-5 w-5" aria-hidden />
              Share to Instagram, Snapchat…
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={!ready}
            className={
              canShareFile
                ? 'inline-flex min-h-11 items-center justify-center gap-2 font-receipt text-[12px] uppercase tracking-[0.16em] text-white/75 disabled:opacity-40'
                : `matte-cta ${action} disabled:opacity-50`
            }
          >
            <Download className="h-4 w-4" aria-hidden />
            Save video
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-snug text-white/50">
          {canShareFile
            ? 'Pick Instagram or Snapchat from the menu, then post it to your story.'
            : 'Save it, then post it to your story from your gallery.'}
        </p>
      </div>
    </div>
  );
}
