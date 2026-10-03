import Link from 'next/link';
import type { StoredGift } from '@/lib/giftStore';
import { previewPath } from '@/lib/giftLinks';
import { ShareGiftLink } from '@/components/xso/ShareGiftLink';

const FORMAT_NAMES: Record<string, string> = {
  loop: 'Memory Deck',
  rewind: 'Rewind',
  scrapbook: 'Scrapbook',
  accordion: 'Accordion',
  moviebox: 'Movie Box',
};

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
    ['Mint ID', gift.id],
    ['Format', FORMAT_NAMES[data.giftStyle] ?? data.giftStyle],
    ['For', data.customerName || '—'],
    ['From', data.billerName || '—'],
    ['Occasion', data.occasion || '—'],
    ['Sealed', formatDate(gift.paidAt)],
    ['Order', gift.lemonOrderId === 'preview' ? 'Preview (no charge)' : gift.lemonOrderId || '—'],
  ];

  return (
    <div className="paper-panel w-full max-w-md p-6 sm:p-8">
      <p className="text-center font-receipt text-[11px] uppercase tracking-[0.24em] text-[#9a6b7b]">
        XSO · Receipt of delivery
      </p>
      <h1 className="mt-2 text-center font-serif text-[32px] font-semibold leading-tight text-[#2d1b22]">
        Sealed. It&apos;s theirs now.
      </h1>

      <section className="mt-6" aria-labelledby="send-heading">
        <h2 id="send-heading" className="font-serif text-xl font-semibold text-[#2d1b22]">
          Send their gift
        </h2>
        <p className="mt-1 text-[15px] leading-snug text-[#7a5563]">
          {data.customerName
            ? `This link is the only way in. Send it to ${data.customerName} when the moment feels right.`
            : 'This link is the only way in. Send it when the moment feels right.'}
        </p>
        <div className="mt-4">
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
                  label === 'Mint ID' || label === 'Order' ? 'normal-case tracking-normal' : ''
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[12px] leading-snug text-[#9a6b7b]">
          Bookmark this page: it&apos;s your private receipt. Only share the link above, never this
          page&apos;s address.
        </p>
      </section>
    </div>
  );
}
