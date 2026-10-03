'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Share2 } from 'lucide-react';
import type { StageSize } from '@/components/xso/movie/useStage';
import { RECIPIENT_OFFER, recipientOfferPrice } from '@/lib/pricing';
import { viewPath } from '@/lib/giftLinks';
import { track } from '@/lib/analytics';

/**
 * The closing card: "Fin.", then the way back to the store with the gift-back price, sharing and
 * a replay. Drafts in the studio (`cta` off) only get the replay.
 */
export const EndScreen = memo(function EndScreen({
  stage,
  reduce,
  onReplay,
  giftId,
  recipientName,
  cta,
}: {
  stage: StageSize;
  reduce: boolean;
  onReplay: () => void;
  giftId: string;
  recipientName: string;
  cta: boolean;
}) {
  const { big } = stage;
  const [copied, setCopied] = useState(false);
  const offer = recipientOfferPrice();

  /** Always the recipient's link, never the page URL (the sender's preview carries a key). */
  const share = async () => {
    const url = `${window.location.origin}${viewPath(giftId)}`;
    const title = recipientName ? `A Movie Box for ${recipientName}` : 'A Movie Box';
    track('movie_shared', { method: 'share' in navigator ? 'native' : 'copy' });
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-7 bg-[#050203] px-6 text-center"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: 'easeInOut' }}
    >
      <motion.p
        className={`font-serif font-semibold italic text-[#fffaf0] ${big ? 'text-[96px]' : 'text-[68px]'}`}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, delay: reduce ? 0 : 0.4, ease: 'easeOut' }}
      >
        Fin.
      </motion.p>

      {cta ? (
        <motion.div
          className={`grid w-full gap-3 ${big ? 'max-w-[420px]' : 'max-w-[320px]'}`}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 1.6, ease: 'easeOut' }}
        >
          <a
            href={`/?ref=${RECIPIENT_OFFER.ref}`}
            onClick={() => track('make_one_back', { source: 'movie_end' })}
            className="matte-cta flex min-h-[4rem] w-full flex-col items-center justify-center rounded-full px-6 font-serif text-[20px] font-semibold leading-tight shadow-[0_14px_40px_rgba(236,72,153,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdba74]"
          >
            Make one back
            {offer ? (
              <span className="mt-0.5 font-receipt text-[11px] font-normal uppercase tracking-[0.16em] opacity-90">
                Yours for {offer}
              </span>
            ) : null}
          </a>
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#fffaf0]/30 px-5 font-receipt text-[13px] uppercase tracking-[0.16em] text-[#fffaf0] transition-colors hover:border-[#fdba74]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            {copied ? 'Link copied' : 'Share this'}
          </button>
        </motion.div>
      ) : null}

      <button
        type="button"
        onClick={onReplay}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-receipt text-[12px] uppercase tracking-[0.18em] text-[#fffaf0]/70 transition-colors hover:text-[#fffaf0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Watch again
      </button>
      <p className="sr-only" role="status">
        {copied ? 'Link copied' : ''}
      </p>
    </motion.div>
  );
});
