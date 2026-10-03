import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { GiftUnboxing } from '@/components/xso/GiftUnboxing';
import { getGift } from '@/lib/giftStore';
import { wrapperOf } from '@/lib/giftWrapper';
import { isManageKey } from '@/lib/manageKey';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Preview · not for sharing',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type PreviewPageProps = {
  params: { id: string };
  searchParams: { key?: string | string[] };
};

/** The sender walks the recipient's exact flow, wrap first, under a preview watermark. */
export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  if (!isManageKey(params.id, searchParams.key)) notFound();
  const gift = await getGift(params.id);
  if (!gift || gift.status !== 'paid') notFound();

  return (
    <main className="min-app-h bg-black">
      <GiftUnboxing giftId={gift.id} wrapper={wrapperOf(gift.id, gift.data)} watermark />
    </main>
  );
}
