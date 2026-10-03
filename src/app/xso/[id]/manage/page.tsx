import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGift } from '@/lib/giftStore';
import { isManageKey } from '@/lib/manageKey';
import { SenderDashboard } from '@/components/xso/sender/SenderDashboard';
import { ManagePending } from '@/components/xso/sender/ManagePending';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Send their gift · XSO',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type ManagePageProps = {
  params: { id: string };
  searchParams: { key?: string | string[]; preview?: string };
};

export default async function ManagePage({ params, searchParams }: ManagePageProps) {
  if (!isManageKey(params.id, searchParams.key)) notFound();
  const gift = await getGift(params.id);
  if (!gift) notFound();

  return (
    <main className="desk grid min-app-h place-items-center px-4 py-10">
      {gift.status === 'paid' ? (
        <SenderDashboard gift={gift} manageKey={String(searchParams.key)} />
      ) : (
        <ManagePending giftId={gift.id} preview={searchParams.preview === '1'} />
      )}
    </main>
  );
}
