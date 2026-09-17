'use client';

import { motion } from 'framer-motion';
import type { LineItem, XsoData } from '@/types/xso';
import {
  CoffeeStain,
  HandNote,
  PaperGrain,
} from '@/components/xso/paper/PaperCraft';

export interface Side1ReceiptProps {
  data: XsoData;
}

const PAPER = '#fcfaf2';
const INK = '#2a2a2a';
const MUTED = '#4a4a4a';

const CLIP_RECEIPT =
  'polygon(0% 8px, 4% 0, 8% 8px, 12% 0, 16% 8px, 20% 0, 24% 8px, 28% 0, 32% 8px, 36% 0, 40% 8px, 44% 0, 48% 8px, 52% 0, 56% 8px, 60% 0, 64% 8px, 68% 0, 72% 8px, 76% 0, 80% 8px, 84% 0, 88% 8px, 92% 0, 96% 8px, 100% 0, 100% calc(100% - 8px), 96% 100%, 92% calc(100% - 8px), 88% 100%, 84% calc(100% - 8px), 80% 100%, 76% calc(100% - 8px), 72% 100%, 68% calc(100% - 8px), 64% 100%, 60% calc(100% - 8px), 56% 100%, 52% calc(100% - 8px), 48% 100%, 44% calc(100% - 8px), 40% 100%, 36% calc(100% - 8px), 32% 100%, 28% calc(100% - 8px), 24% 100%, 20% calc(100% - 8px), 16% 100%, 12% calc(100% - 8px), 8% 100%, 4% calc(100% - 8px), 0% 100%)';

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function Side1Receipt({ data }: Side1ReceiptProps) {
  return (
    <article
      className="relative mx-auto w-full max-w-[320px] px-4 pb-5 pt-5 font-receipt text-[11.5px] leading-[1.35] shadow-2xl"
      style={{
        color: INK,
        background: `linear-gradient(180deg, rgba(255,255,255,0.45), transparent 18%), ${PAPER}`,
        clipPath: CLIP_RECEIPT,
        WebkitClipPath: CLIP_RECEIPT,
        transform: 'rotate(-2deg)',
        boxShadow:
          '0 28px 50px rgba(0,0,0,0.3), 0 10px 20px rgba(0,0,0,0.18)',
      }}
      aria-label="Thermal receipt"
    >
      <PaperGrain opacity={0.22} />
      <CoffeeStain className="bottom-16 left-4" />
      <HandNote className="bottom-8 right-3" rotate={-8}>
        lol remember this??
      </HandNote>

      <div className="relative z-10">
        <p className="mb-2 text-center text-[13px] font-bold tracking-[0.04em]">
          {data.merchantName}
        </p>
        <p style={{ color: MUTED }}>CASHIER: {data.cashier.toUpperCase()}</p>
        <p style={{ color: MUTED }}>
          CUSTOMER: {data.customerName.toUpperCase()}
        </p>
        <p style={{ color: MUTED }}>{data.timestamp}</p>
        {data.occasion ? (
          <p style={{ color: MUTED }}>OCCASION: {data.occasion.toUpperCase()}</p>
        ) : null}

        <DashedDivider />

        <div
          className="mb-1 grid grid-cols-[2.2rem_1fr_4.6rem] gap-1 text-[10px] opacity-60"
          aria-hidden
        >
          <span>QTY</span>
          <span>ITEM</span>
          <span className="text-right">AMT</span>
        </div>

        <motion.ul
          className="m-0 list-none p-0"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {data.lineItems.map((item: LineItem) => (
            <motion.li
              key={item.id}
              variants={itemVariants}
              className="mb-[0.28rem] grid grid-cols-[2.2rem_1fr_4.6rem] gap-1"
            >
              <span className="whitespace-pre">{item.qty}</span>
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {item.description}
              </span>
              <span className="text-right">{item.price}</span>
            </motion.li>
          ))}
        </motion.ul>

        <DashedDivider />

        <div className="grid gap-[0.28rem]">
          <TotalsRow label="SUBTOTAL" value={data.subtotal} />
          <TotalsRow label="EMOTIONAL TAX" value={data.emotionalTax} />
          <DashedDivider />
          <div className="flex justify-between gap-3 text-[15px] font-bold">
            <span>TOTAL</span>
            <span className="text-right">{data.total}</span>
          </div>
        </div>

        <BarcodeSvg id={data.id} />

        <p className="mt-3 text-center font-bold tracking-[0.03em]">
          NO REFUNDS / NO RETURNS
        </p>
        <p className="mt-2 text-center text-[10px] opacity-55">
          *** {data.certifiedStampText} ***
        </p>
      </div>
    </article>
  );
}

function DashedDivider() {
  return (
    <p className="my-2 text-center tracking-[-0.08em] opacity-70" aria-hidden>
      --------------------------------
    </p>
  );
}

function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="max-w-[62%] text-right">{value}</span>
    </div>
  );
}

function BarcodeSvg({ id }: { id: string }) {
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
      >
        {bars.map((width, i) => {
          const rect = (
            <rect
              key={i}
              x={x}
              y={0}
              width={width}
              height={40}
              fill={INK}
              opacity={0.85}
            />
          );
          x += width + 1;
          return rect;
        })}
      </svg>
      <p className="text-center text-[10px] tracking-[0.12em] opacity-70">
        {id.toUpperCase()}
      </p>
    </div>
  );
}
