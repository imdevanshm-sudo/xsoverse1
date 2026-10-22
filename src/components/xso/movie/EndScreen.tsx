'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Share2 } from 'lucide-react';
import type { StageSize } from '@/components/xso/movie/useStage';
import { viewPath } from '@/lib/giftLinks';
import { track } from '@/lib/analytics';
import { ShareStoryButton, useStoryGift } from '@/components/xso/ShareStory';
import { RECIPIENT_OFFER, formatPrice, quote } from '@/lib/pricing';

/**
 * The closing card: "Fin.", credits, then replay / share / Make one back.
 * The recipient offer never appears earlier than this screen.
 */
export const EndScreen = memo(function EndScreen({
  stage,
  reduce,
  onReplay,
  giftId,
  recipientName,
  senderName,
  cta,
}: {
  stage: StageSize;
  reduce: boolean;
  onReplay: () => void;
  giftId: string;
  recipientName: string;
  senderName: string;
  cta: boolean;
}) {
  const { big, compact } = stage;
  const [copied, setCopied] = useState(false);
  /** Sharing is the recipient's; the sender's preview of the same film doesn't offer it. */
  const shareable = Boolean(useStoryGift());
  const list = quote({ style: 'moviebox' });
  const discounted = Math.round(list.total * (1 - RECIPIENT_OFFER.percentOff / 100));

  /** Always the recipient's link, never the page URL (the sender's preview carries a key). */
  const share = async () => {
    const url = `${window.location.origin}${viewPath(giftId)}`;
    const title = recipientName ? `A Movie Box for ${recipientName}` : 'A Movie Box';
    track('movie_shared', { method: 'share' in navigator ? 'native' : 'copy' });
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      className={`movie-end absolute inset-0 z-30 flex flex-col items-center px-6 text-center ${compact ? 'justify-start gap-4 overflow-y-auto pb-6 pt-14' : 'justify-center gap-6'}`}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: 'easeInOut' }}
    >
      <motion.p
        className={`relative font-serif font-semibold italic leading-none text-[#fffaf0] [text-shadow:0_0_40px_rgba(253,186,116,0.18)] ${big ? 'text-[96px]' : compact ? 'text-[48px]' : 'text-[68px]'}`}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, delay: reduce ? 0 : 0.4, ease: 'easeOut' }}
      >
        Fin.
      </motion.p>

      {senderName || recipientName ? (
        <motion.dl
          className={`relative grid gap-1 font-receipt uppercase tracking-[0.2em] text-[#fffaf0]/70 ${big ? 'text-[14px]' : 'text-[13px]'}`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 1.1 }}
        >
          {senderName ? (
            <div>
              <dt className="inline">Directed by </dt>
              <dd className="inline text-[#fffaf0]">{senderName}</dd>
            </div>
          ) : null}
          {recipientName ? (
            <div>
              <dt className="inline">Starring </dt>
              <dd className="inline text-[#fffaf0]">{recipientName}</dd>
            </div>
          ) : null}
        </motion.dl>
      ) : null}

      {cta ? (
        <motion.div
          className={`relative grid w-full gap-3 ${big ? 'max-w-[420px]' : 'max-w-[320px]'}`}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 1.6, ease: 'easeOut' }}
        >
          <a
            href="/"
            onClick={() => track('make_one_back', { source: 'movie_end' })}
            className="matte-cta flex min-h-[4rem] w-full flex-col items-center justify-center rounded-full px-6 font-serif text-[20px] font-semibold leading-tight shadow-[0_14px_40px_rgba(236,72,153,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdba74]"
          >
            Make one back
            <span className="mt-1 font-receipt text-[13px] font-normal uppercase tracking-[0.1em] opacity-90">
              {RECIPIENT_OFFER.label} · from {formatPrice(discounted)}
            </span>
          </a>
          {shareable ? (
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#fffaf0]/30 px-5 font-receipt text-[13px] uppercase tracking-[0.16em] text-[#fffaf0] transition-colors hover:border-[#fdba74]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {copied ? 'Link copied' : 'Share'}
            </button>
          ) : null}
          <ShareStoryButton
            source="movie_end"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#fffaf0]/30 px-5 font-receipt text-[13px] uppercase tracking-[0.16em] text-[#fffaf0] transition-colors hover:border-[#fdba74]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
          />
        </motion.div>
      ) : null}

      <button
        type="button"
        onClick={onReplay}
        className="relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-receipt text-[13px] uppercase tracking-[0.18em] text-[#fffaf0]/70 transition-colors hover:text-[#fffaf0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Replay
      </button>
      <p className="sr-only" role="status">
        {copied ? 'Link copied' : ''}
      </p>
    </motion.div>
  );
});
