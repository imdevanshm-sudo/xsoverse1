'use client';

import { memo } from 'react';
import { track } from '@/lib/analytics';
import {
  DEFAULT_CURRENCY,
  RECIPIENT_OFFER,
  TIERS,
  formatPrice,
  recipientOfferPrice,
} from '@/lib/pricing';

export const YOUR_TURN = 'Your turn';

/**
 * The last page of a received gift, on the gift's own paper: Make one back (with the gift-back
 * price while that offer is live) and a way to keep looking. Formats add it after the final card,
 * never over one.
 */
export const YourTurn = memo(function YourTurn({
  source,
  large = false,
  onDismiss,
}: {
  /** Where the tap came from, for analytics. */
  source: string;
  large?: boolean;
  onDismiss?: () => void;
}) {
  const offer = recipientOfferPrice();
  const full = formatPrice(TIERS.full.prices[DEFAULT_CURRENCY]);
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p
        className={`font-receipt uppercase opacity-60 ${
          large ? 'text-[13px] tracking-[0.24em]' : 'text-[12px] tracking-[0.22em]'
        }`}
      >
        The end · {YOUR_TURN}
      </p>
      <p
        className={`mt-3 max-w-[16ch] font-serif font-semibold leading-tight ${
          large ? 'text-[34px]' : 'text-[26px]'
        }`}
      >
        Someone you love deserves one too.
      </p>
      <p
        className={`mt-2 font-hand leading-tight text-[#b4234a] ${large ? 'text-[24px]' : 'text-[20px]'}`}
      >
        Make them a keepsake of their own.
      </p>
      <a
        href={`/?ref=${RECIPIENT_OFFER.ref}`}
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
          <span className="mt-0.5 font-receipt text-[12px] font-normal uppercase tracking-[0.16em] opacity-90">
            Yours for {offer} <s className="opacity-70">{full}</s>
          </span>
        ) : null}
      </a>
      {onDismiss ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          className="mt-2 min-h-11 px-4 font-receipt text-[13px] uppercase tracking-[0.18em] text-[#3a2530]/70 transition-colors hover:text-[#3a2530] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4234a]/60"
        >
          Keep looking
        </button>
      ) : null}
    </div>
  );
});
