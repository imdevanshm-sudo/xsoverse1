'use client';

import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { LineItem, XsoData } from '@/types/xso';
import { CoffeeStain, InkStamp, PaperGrain } from '@/components/xso/paper/PaperCraft';
import { formatReceiptQty } from '@/lib/receiptFormat';

export interface Side1ReceiptProps {
  data: XsoData;
  /** Drop the paper, tilt and shadow when the host card is the paper. */
  bare?: boolean;
}

const PAPER = '#fff7fb';
const INK = '#262626';
const MUTED = '#4a4a4a';

const CLIP_RECEIPT =
  'polygon(0% 8px, 4% 0, 8% 8px, 12% 0, 16% 8px, 20% 0, 24% 8px, 28% 0, 32% 8px, 36% 0, 40% 8px, 44% 0, 48% 8px, 52% 0, 56% 8px, 60% 0, 64% 8px, 68% 0, 72% 8px, 76% 0, 80% 8px, 84% 0, 88% 8px, 92% 0, 96% 8px, 100% 0, 100% calc(100% - 8px), 96% 100%, 92% calc(100% - 8px), 88% 100%, 84% calc(100% - 8px), 80% 100%, 76% calc(100% - 8px), 72% 100%, 68% calc(100% - 8px), 64% 100%, 60% calc(100% - 8px), 56% 100%, 52% calc(100% - 8px), 48% 100%, 44% calc(100% - 8px), 40% 100%, 36% calc(100% - 8px), 32% 100%, 28% calc(100% - 8px), 24% 100%, 20% calc(100% - 8px), 16% 100%, 12% calc(100% - 8px), 8% 100%, 4% calc(100% - 8px), 0% 100%)';

export const Side1Receipt = memo(function Side1Receipt({ data, bare = false }: Side1ReceiptProps) {
  return (
    <div
      className="relative mx-auto w-full max-w-[320px]"
      style={bare ? undefined : { transform: 'rotate(-2deg)' }}
    >
      {/* clip-path swallows box-shadow, so the paper shadow is its own layer */}
      {bare ? null : (
        <div
          className="pointer-events-none absolute inset-x-1 inset-y-2"
          style={{
            boxShadow:
              '0 30px 48px rgba(0,0,0,0.32), 0 12px 18px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.18)',
          }}
          aria-hidden
        />
      )}
      <article
        className="relative px-4 pb-6 pt-6 font-receipt text-[11.5px] uppercase leading-[1.4] tabular-nums"
        style={
          bare
            ? { color: INK }
            : {
                color: INK,
                background: `linear-gradient(180deg, rgba(255,255,255,0.5), transparent 16%, transparent 84%, rgba(0,0,0,0.035)), ${PAPER}`,
                clipPath: CLIP_RECEIPT,
                WebkitClipPath: CLIP_RECEIPT,
              }
        }
        aria-label="Thermal receipt"
      >
        {bare ? null : <PaperGrain opacity={0.18} />}
        <CoffeeStain className="bottom-16 left-4" />

        <div className="relative z-10">
          <p className="mb-2 text-center text-[13px] font-bold tracking-[0.06em]">
            {data.merchantName}
          </p>
          {data.cashier ? <ReceiptMeta label="Cashier" value={data.cashier} /> : null}
          {data.customerName ? <ReceiptMeta label="Customer" value={data.customerName} /> : null}
          <p style={{ color: MUTED }}>{data.timestamp}</p>
          {data.occasion ? <ReceiptMeta label="Occasion" value={data.occasion} /> : null}

          <DashedDivider />

          <div
            className="mb-1 grid grid-cols-[4.2ch_1fr_auto] gap-x-1.5 text-[10px] opacity-60"
            aria-hidden
          >
            <span>QTY</span>
            <span>ITEM</span>
            <span className="text-right">AMT</span>
          </div>

          <ul className="m-0 list-none p-0">
            {data.lineItems.map((item: LineItem, index) => (
              <li
                key={item.id}
                className="receipt-row mb-[0.3rem] grid grid-cols-[4.2ch_1fr_auto] items-baseline gap-x-1.5"
                style={{ '--i': index } as CSSProperties}
              >
                <span className="text-right">{formatReceiptQty(item.qty)}</span>
                <span className="flex min-w-0 items-baseline">
                  <span className="min-w-0 truncate">{item.description}</span>
                  <span className="receipt-leader" aria-hidden />
                </span>
                <span className="text-right">{item.price}</span>
              </li>
            ))}
          </ul>

          <DashedDivider />

          <div className="grid gap-[0.3rem]">
            <TotalsRow label="Subtotal" value={data.subtotal} />
            <TotalsRow label="Emotional tax" value={data.emotionalTax} />
            <DashedDivider />
            <div className="flex items-baseline text-[15px] font-bold">
              <span>Total</span>
              <span className="receipt-leader" aria-hidden />
              <span className="text-right">{data.total}</span>
            </div>
          </div>

          <BarcodeSvg id={data.id} />

          <p className="mt-3 text-center font-bold tracking-[0.04em]">No refunds / no returns</p>
          <div className="mt-3 flex justify-center">
            <InkStamp size="sm" rotate={-9}>
              {data.certifiedStampText || 'Certified bestie'}
            </InkStamp>
          </div>
        </div>
      </article>
    </div>
  );
});

const ReceiptMeta = memo(function ReceiptMeta({ label, value }: { label: string; value: string }) {
  return (
    <p className="truncate" style={{ color: MUTED }}>
      {label}: {value}
    </p>
  );
});

const DashedDivider = memo(function DashedDivider() {
  return (
    <div
      className="my-2 h-0 border-t-[1.5px] border-dashed opacity-60"
      style={{ borderColor: INK }}
      aria-hidden
    />
  );
});

const TotalsRow = memo(function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline">
      <span className="shrink-0">{label}</span>
      <span className="receipt-leader" aria-hidden />
      <span className="max-w-[60%] truncate text-right">{value}</span>
    </div>
  );
});

const BarcodeSvg = memo(function BarcodeSvg({ id }: { id: string }) {
  const seed = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const bars = Array.from({ length: 48 }, (_, i) => {
    const n = (seed * (i + 3) * 7) % 11;
    return n < 3 ? 1 : n < 7 ? 2 : 3;
  });

  const totalWidth = bars.reduce((sum, w) => sum + w + 1, 0);
  let x = 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-1 px-2" aria-hidden>
      <svg
        viewBox={`0 0 ${totalWidth} 40`}
        className="h-10 w-full max-w-[260px]"
        role="img"
        aria-label="Barcode"
        shapeRendering="crispEdges"
      >
        {bars.map((width, i) => {
          const rect = (
            <rect key={i} x={x} y={0} width={width} height={40} fill={INK} opacity={0.88} />
          );
          x += width + 1;
          return rect;
        })}
      </svg>
    </div>
  );
});
