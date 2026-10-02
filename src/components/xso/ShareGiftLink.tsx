'use client';

import { useEffect, useState } from 'react';

interface ShareGiftLinkProps {
  giftId: string;
  recipientName?: string;
  compact?: boolean;
  tone?: 'console' | 'paper';
}

export function giftPath(giftId: string) {
  return `/gift/${encodeURIComponent(giftId)}`;
}

export function ShareGiftLink({
  giftId,
  recipientName,
  compact = false,
  tone = 'console',
}: ShareGiftLinkProps) {
  const paper = tone === 'paper';
  const [url, setUrl] = useState(giftPath(giftId));
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${giftPath(giftId)}`);
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [giftId]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const input = document.getElementById(`gift-link-${giftId}`) as HTMLInputElement | null;
      input?.select();
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: recipientName ? `A gift for ${recipientName}` : 'Your XSO gift',
        text: 'Someone turned the words they couldn’t say into something you can hold.',
        url,
      });
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') void copy();
    }
  };

  const buttonClass =
    'min-h-11 flex-1 touch-manipulation rounded-full border px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] transition-[transform,opacity] active:scale-[0.98]';

  return (
    <div className={compact ? 'w-full' : 'w-full space-y-3'}>
      {!compact && (
        <input
          id={`gift-link-${giftId}`}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Shareable gift link"
          className={
            paper
              ? 'paper-field font-receipt text-[13px]'
              : 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-xs text-white/75 outline-none focus:border-phosphor/50'
          }
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className={
            paper
              ? `${buttonClass} border-[#efd2de] bg-white/60 font-receipt font-bold text-[#2d1b22]`
              : `${buttonClass} border-white/15 bg-white/5 font-mono text-white/80`
          }
          aria-live="polite"
        >
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className={
              paper
                ? `${buttonClass} border-[#ec4899]/50 bg-[#ec4899]/10 font-receipt font-bold text-[#be185d]`
                : `${buttonClass} border-phosphor/40 bg-phosphor/10 font-mono text-phosphor`
            }
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
