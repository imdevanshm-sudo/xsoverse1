import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GiftUnboxing } from '@/components/xso/GiftUnboxing';
import { GiftPendingPoller } from '@/components/xso/GiftPendingPoller';
import { getGift } from '@/lib/giftStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GiftPageProps = { params: { id: string } };

const loadGift = cache(getGift);

export async function generateMetadata({ params }: GiftPageProps): Promise<Metadata> {
  const gift = await getGift(params.id).catch(() => null);
  const robots = { index: false, follow: false };

  if (!gift || gift.status !== 'paid') {
    return {
      title: 'An XSO gift is waiting',
      description: 'Someone turned the words they couldn’t say into something you can hold.',
      robots,
    };
  }

  const { customerName, billerName, occasion } = gift.data;
  const title = `A gift for ${customerName} from ${billerName}`;
  const description = occasion
    ? `${occasion} · a one-of-one XSO, made for you alone.`
    : 'A one-of-one XSO, made for you alone.';

  return {
    title,
    description,
    robots,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function GiftPage({ params }: GiftPageProps) {
  const gift = await getGift(params.id);
  if (!gift) notFound();

  return (
    <main className="min-app-h flex flex-col bg-[#0c070a] md:bg-transparent">
      <header className="flex items-center gap-3 px-4 pt-5 max-md:hidden lg:px-8">
        <Link
          href="/"
          className="grid h-8 w-8 place-items-center rounded-md border border-phosphor/60 font-pixel text-[8px] tracking-wide text-phosphor"
          aria-label="XSO home"
        >
          XSO
        </Link>
        <span className="font-display text-sm font-bold tracking-wide">
          XSO · Something for you
        </span>
      </header>

      {gift.status === 'paid' ? (
        <GiftUnboxing giftId={gift.id} initialData={gift.data} />
      ) : (
        <GiftPendingPoller giftId={gift.id} />
      )}
    </main>
  );
}
