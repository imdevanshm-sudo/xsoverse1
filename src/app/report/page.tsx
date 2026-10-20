import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Report a souvenir',
  robots: { index: false, follow: false },
};

/**
 * Lightweight abuse / unexpected-gift landing linked from recipient emails.
 * No gift content is loaded — only a mailto with the ID the visitor already has.
 */
export default function ReportPage({
  searchParams,
}: {
  searchParams: { gift?: string };
}) {
  const giftId = (searchParams.gift || '').trim().slice(0, 64);
  const subject = giftId ? `Unexpected souvenir (${giftId})` : 'Unexpected souvenir';
  const body = giftId
    ? `I received a souvenir I did not expect.\n\nGift ID: ${giftId}\n\n(Please add any details below.)\n`
    : 'I received a souvenir I did not expect.\n\n(Please add any details below.)\n';
  const mailto = `mailto:xsoverse@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <main className="desk min-app-h">
      <div className="mx-auto w-full max-w-md px-5 py-16 text-center">
        <p className="font-receipt text-[11px] uppercase tracking-[0.22em] text-[#c99aae]">
          XSOVERSE
        </p>
        <h1 className="mt-4 font-serif text-[2rem] font-semibold leading-tight text-[#fdf2f8]">
          Report a souvenir
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#e0b4c6]">
          Tell us if you got something you didn&apos;t ask for. We&apos;ll look into it — no
          marketing, just support.
        </p>
        {giftId ? (
          <p className="mt-4 break-all font-receipt text-[11px] text-[#9a6b7b]">
            Gift ID {giftId}
          </p>
        ) : null}
        <a
          href={mailto}
          className="matte-cta mt-8 inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-full px-6 font-serif text-[17px] font-semibold"
        >
          Email support
        </a>
        <p className="mt-6">
          <Link href="/" className="text-[13px] text-[#c99aae] underline-offset-2 hover:underline">
            Back to XSO
          </Link>
        </p>
      </div>
    </main>
  );
}
