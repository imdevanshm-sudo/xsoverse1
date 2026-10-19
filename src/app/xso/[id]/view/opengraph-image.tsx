import { ImageResponse } from 'next/og';
import { getGift } from '@/lib/giftStore';
import type { GiftStyle } from '@/types/xso';

export const runtime = 'nodejs';
export const alt = 'A keepsake made on XSOverse';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FORMAT: Record<GiftStyle, string> = {
  loop: 'The Loop',
  rewind: 'The Rewind',
  scrapbook: 'The Scrapbook',
  accordion: 'The Accordion',
  moviebox: 'The Movie Box',
};

/**
 * The card a gift link unfurls into in chats: who it's for, who made it and what kind of
 * keepsake it is. Nothing inside the gift is shown; unpaid or missing gifts get a plain card.
 */
export default async function GiftLinkImage({ params }: { params: { id: string } }) {
  const gift = await getGift(params.id).catch(() => null);
  const paid = gift?.status === 'paid';
  const recipient = paid ? gift.data.customerName?.trim() : '';
  const sender = paid ? gift.data.billerName?.trim() : '';
  const format = paid ? FORMAT[gift.data.giftStyle] : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a0f14',
          backgroundImage:
            'radial-gradient(circle at 50% 28%, rgba(253,186,116,0.24), rgba(26,15,20,0) 60%)',
          color: '#fffaf0',
          textAlign: 'center',
          padding: '0 80px',
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 10, color: '#fdba74' }}>XSOVERSE</div>
        <div style={{ marginTop: 34, fontSize: recipient ? 92 : 80, fontWeight: 700, lineHeight: 1.05 }}>
          {recipient ? `For ${recipient}` : 'A gift is waiting'}
        </div>
        <div style={{ marginTop: 18, fontSize: 38, color: 'rgba(255,250,240,0.78)' }}>
          {sender ? `a keepsake from ${sender}` : 'made for you alone'}
        </div>
        <div
          style={{
            marginTop: 54,
            display: 'flex',
            padding: '16px 40px',
            borderRadius: 999,
            fontSize: 28,
            letterSpacing: 2,
            color: '#1a0f14',
            background: 'linear-gradient(90deg, #f472b6, #fb923c)',
          }}
        >
          {format ? `${format} · tap to open` : 'Tap to open'}
        </div>
      </div>
    ),
    size,
  );
}
