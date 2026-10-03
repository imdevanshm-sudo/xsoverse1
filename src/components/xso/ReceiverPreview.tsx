'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useXsoData } from '@/store/useXsoData';
import { pickXsoPayload } from '@/lib/xsoPayload';
import { GiftUnboxing } from '@/components/xso/GiftUnboxing';
import { wrapperOf } from '@/lib/giftWrapper';
import type { GiftStyle } from '@/types/xso';

/**
 * Headerless takeover that renders the draft through the same component as `/xso/[id]/view`,
 * trimmed by `pickXsoPayload` exactly as the server will store it.
 */
export function ReceiverPreview({ style, onClose }: { style: GiftStyle; onClose: () => void }) {
  const draft = useXsoData();
  const data = useMemo(() => pickXsoPayload({ ...draft, giftStyle: style }), [draft, style]);
  const exitRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    exitRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Receiver preview"
      className="fixed inset-0 z-[100] flex h-screen w-screen touch-pan-y flex-col overflow-y-auto overscroll-none bg-[#0c070a] pb-[env(safe-area-inset-bottom)] supports-[height:100dvh]:h-[100dvh]"
    >
      <button
        ref={exitRef}
        type="button"
        onClick={onClose}
        className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[110] inline-flex min-h-8 items-center gap-1 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-md hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Exit preview
      </button>
      <GiftUnboxing
        giftId="preview"
        wrapper={wrapperOf('preview', data)}
        draft={data}
        framed
        watermark
      />
    </div>,
    document.body,
  );
}
