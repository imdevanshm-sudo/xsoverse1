import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { GiftUnboxing } from '@/components/xso/GiftUnboxing';
import { GiftPendingPoller } from '@/components/xso/GiftPendingPoller';
import { getGift } from '@/lib/giftStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
};

type ViewPageProps = { params: { id: string } };

export async function generateMetadata({ params }: ViewPageProps): Promise<Metadata> {
  const gift = await getGift(params.id).catch(() => null);
  const robots = { index: false, follow: false };

  if (!gift || gift.status !== 'paid') {
    return { title: 'A gift is waiting', robots };
  }

  const { customerName, billerName } = gift.data;
  const title = `For ${customerName}, from ${billerName}`;
  return {
    title,
    description: 'Made for you alone.',
    robots,
    openGraph: { title, description: 'Made for you alone.', type: 'website' },
    twitter: { card: 'summary', title },
  };
}

/** The recipient's link: no site chrome, no utilities, just the gift on a black canvas. */
export default async function ViewPage({ params }: ViewPageProps) {
  const gift = await getGift(params.id);
  if (!gift) notFound();

  return (
    <main className="min-app-h bg-black">
      {gift.status === 'paid' ? (
        <GiftUnboxing giftId={gift.id} initialData={gift.data} />
      ) : (
        <GiftPendingPoller giftId={gift.id} />
      )}
    </main>
  );
}
