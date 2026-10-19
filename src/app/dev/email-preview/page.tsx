import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmailPreview } from '@/app/dev/email-preview/EmailPreview';
import { getAppUrl } from '@/lib/lemon';
import { previewBuyerGiftReady, previewReceiverGiftLink } from '@/lib/mail';

export const metadata: Metadata = {
  title: 'Email preview',
  robots: { index: false, follow: false },
};

/**
 * Renders buyer + recipient transactional templates for local QA.
 * Disabled in production (same gate as /dev/sound-test).
 */
export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const origin = getAppUrl();
  const giftId = 'xso_preview_email_01';
  const buyer = previewBuyerGiftReady({
    origin,
    giftId,
    recipientName: 'Alex',
    style: 'loop',
    addOns: ['spotify_song'],
    amountPaid: '$14.99',
    orderNumber: 'LS-9042',
    dateIso: new Date().toISOString(),
  });
  const receiver = previewReceiverGiftLink({
    origin,
    giftId,
    recipientName: 'Alex',
    senderName: 'Sarah',
  });

  return <EmailPreview buyer={buyer} receiver={receiver} />;
}
