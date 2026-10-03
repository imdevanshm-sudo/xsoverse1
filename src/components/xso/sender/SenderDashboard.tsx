import Link from 'next/link';
import type { StoredGift } from '@/lib/giftStore';
import { previewPath } from '@/lib/giftLinks';
import { ShareGiftLink } from '@/components/xso/ShareGiftLink';

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** The sender's post-purchase screen: everything the recipient's link deliberately leaves out. */
export function SenderDashboard({ gift, manageKey }: { gift: StoredGift; manageKey: string }) {
  const { data } = gift;
  const details: Array<[string, string]> = [
    ['Gift ID', gift.id],
    ['Sealed', formatDate(gift.paidAt)],
    ['Order', gift.lemonOrderId === 'preview' ? 'Preview (no charge)' : gift.lemonOrderId || '—'],
  ];

  return (
    <div className="paper-panel w-full max-w-md p-6 sm:p-8">
      <section aria-labelledby="send-heading">
        <h1
          id="send-heading"
          className="text-center font-serif text-[30px] font-semibold leading-tight text-[#2d1b22]"
        >
          {data.customerName ? `Send ${data.customerName} their gift` : 'Send their gift'}
        </h1>
        <div className="mt-5">
          <ShareGiftLink giftId={gift.id} recipientName={data.customerName} tone="paper" />
        </div>
        <Link
          href={previewPath(gift.id, manageKey)}
          target="_blank"
          rel="noopener noreferrer"
          className="matte-cta mt-4 flex min-h-[3.25rem] w-full items-center justify-center rounded-full px-6 font-serif text-[17px] font-semibold"
        >
          Preview what they&apos;ll see
        </Link>
      </section>

      <section
        className="mt-6 border-t border-dashed border-[#f0cfdc] pt-4"
        aria-label="Order details"
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-receipt text-[11px] uppercase tracking-[0.12em]">
          {details.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-[#b48799]">{label}</dt>
              <dd
                className={`min-w-0 break-all text-right text-[#2d1b22] ${
                  label === 'Gift ID' || label === 'Order' ? 'normal-case tracking-normal' : ''
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[12px] leading-snug text-[#9a6b7b]">
          Keep this page private. Share only the link above.
        </p>
      </section>
    </div>
  );
}
