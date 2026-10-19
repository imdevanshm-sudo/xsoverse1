'use client';

import { memo, useState } from 'react';
import { RotateCcw, Share2 } from 'lucide-react';
import { track } from '@/lib/analytics';
import { ShareStoryButton } from '@/components/xso/ShareStory';
import { viewPath } from '@/lib/giftLinks';
import { RECIPIENT_OFFER, formatPrice, quote } from '@/lib/pricing';

export const YOUR_TURN = 'Your turn';

/**
 * The last page of a received gift, on the gift's own paper: Make one back and a way to keep
 * looking. Formats add it after the final card, never over one.
 */
export const YourTurn = memo(function YourTurn({
  source,
  large = false,
  onDismiss,
  onReplay,
  giftId,
  shareTitle,
  offer = false,
  stub = false,
}: {
  /** Where the tap came from, for analytics. */
  source: string;
  large?: boolean;
  onDismiss?: () => void;
  /** Accordion: fold the ribbon back to the start. */
  onReplay?: () => void;
  /** When set, Share uses the recipient gift link. */
  giftId?: string;
  shareTitle?: string;
  /** Show the recipient discount on Make one back (from pricing config). */
  offer?: boolean;
  /** Loop: the end card is the receipt's customer copy, with one item still owed. */
  stub?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const list = quote({ style: 'accordion' });
  const discounted = Math.round(list.total * (1 - RECIPIENT_OFFER.percentOff / 100));

  const share = async () => {
    if (!giftId) return;
    const shareUrl = `${window.location.origin}${viewPath(giftId)}`;
    track('movie_shared', { method: 'share' in navigator ? 'native' : 'copy', source });
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle || 'A keepsake', url: shareUrl });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p
        className={`font-receipt uppercase opacity-60 ${
          large ? 'text-[13px] tracking-[0.24em]' : 'text-[12px] tracking-[0.22em]'
        }`}
      >
        {stub ? '*** Customer copy ***' : `The end · ${YOUR_TURN}`}
      </p>
      <p
        className={`mt-3 max-w-[16ch] font-serif font-semibold leading-tight ${
          large ? 'text-[34px]' : 'text-[26px]'
        }`}
      >
        {stub ? 'Balance due: one keepsake.' : 'Someone you love deserves one too.'}
      </p>
      <p
        className={`mt-2 font-hand leading-tight text-[#b4234a] ${large ? 'text-[24px]' : 'text-[20px]'}`}
      >
        {stub ? 'Pay it forward. Someone you love deserves one too.' : 'Make them a keepsake of their own.'}
      </p>
      <a
        href="/"
        onClick={(event) => {
          event.stopPropagation();
          track('make_one_back', { source });
        }}
        className={`matte-cta mt-5 flex w-full max-w-[340px] flex-col items-center justify-center rounded-full px-6 font-serif font-semibold leading-tight shadow-[0_14px_40px_rgba(236,72,153,.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b4234a] ${
          large ? 'min-h-[4rem] text-[22px]' : 'min-h-[3.5rem] text-[19px]'
        }`}
      >
        Make one back
        {offer ? (
          <span className="mt-1 font-receipt text-[11px] font-normal uppercase tracking-[0.16em] opacity-90">
            {RECIPIENT_OFFER.label} · from {formatPrice(discounted)}
          </span>
        ) : null}
      </a>
      {giftId ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void share();
          }}
          className={`mt-2 inline-flex w-full max-w-[340px] items-center justify-center gap-2 rounded-full border border-[#b4234a]/40 px-5 font-receipt uppercase tracking-[0.16em] text-[#b4234a] transition-colors hover:bg-[#b4234a]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4234a]/60 ${
            large ? 'min-h-12 text-[14px]' : 'min-h-11 text-[13px]'
          }`}
        >
          <Share2 className="h-4 w-4" aria-hidden />
          {copied ? 'Link copied' : 'Share'}
        </button>
      ) : null}
      <ShareStoryButton
        source={source}
        className={`mt-2 inline-flex w-full max-w-[340px] items-center justify-center gap-2 rounded-full border border-[#b4234a]/40 px-5 font-receipt uppercase tracking-[0.16em] text-[#b4234a] transition-colors hover:bg-[#b4234a]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4234a]/60 ${
          large ? 'min-h-12 text-[14px]' : 'min-h-11 text-[12px]'
        }`}
      />
      {onReplay ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReplay();
          }}
          className="mt-2 inline-flex min-h-11 items-center gap-2 px-4 font-receipt text-[13px] uppercase tracking-[0.18em] text-[#3a2530]/75 transition-colors hover:text-[#3a2530] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4234a]/60"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Fold it back up
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          className="mt-1 min-h-11 px-4 font-receipt text-[13px] uppercase tracking-[0.18em] text-[#3a2530]/70 transition-colors hover:text-[#3a2530] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4234a]/60"
        >
          Keep looking
        </button>
      ) : null}
      <p className="sr-only" role="status">
        {copied ? 'Link copied' : ''}
      </p>
    </div>
  );
});
