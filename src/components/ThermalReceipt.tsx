'use client';

import { THEMES } from '@/lib/constants';
import { useBillStore } from '@/store/useBillStore';

export function ThermalReceipt() {
  const bill = useBillStore();
  const theme = THEMES[bill.theme];

  return (
    <article
      className="w-[min(100%,340px)] mx-auto animate-drop drop-shadow-receipt"
      style={{ color: theme.ink }}
      aria-label="Bestie Bill receipt"
    >
      <div
        className="h-3"
        style={{
          backgroundColor: theme.paper,
          WebkitMask:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12'%3E%3Cpolygon fill='black' points='0,12 8,0 16,12'/%3E%3C/svg%3E\") repeat-x bottom / 16px 12px",
          mask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12'%3E%3Cpolygon fill='black' points='0,12 8,0 16,12'/%3E%3C/svg%3E\") repeat-x bottom / 16px 12px",
        }}
        aria-hidden
      />

      <div
        className="relative overflow-hidden px-4 pt-4 pb-5 font-mono text-[11.5px] leading-[1.35]"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.28), transparent 22%), ${theme.paper}`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: theme.grainOpacity,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          }}
          aria-hidden
        />

        <div className="relative z-10">
          <p className="mb-2 text-center text-[13px] font-bold tracking-[0.04em]">
            {bill.merchantName}
          </p>
          <p style={{ color: theme.muted }}>CASHIER: {bill.cashier.toUpperCase()}</p>
          <p style={{ color: theme.muted }}>
            CUSTOMER: {bill.customerName.toUpperCase() || 'BESTIE'}
          </p>
          <p style={{ color: theme.muted }}>FROM: {bill.billerName.toUpperCase() || 'ANON'}</p>
          <p style={{ color: theme.muted }}>{bill.timestamp}</p>
          <p className="my-2 text-center tracking-[-0.08em] opacity-70">
            --------------------------------
          </p>

          <div
            className="mb-1 grid grid-cols-[2.2rem_1fr_4.6rem] gap-1 text-[10px] opacity-60"
            aria-hidden
          >
            <span>QTY</span>
            <span>ITEM</span>
            <span className="text-right">AMT</span>
          </div>

          <ul className="m-0 list-none p-0">
            {bill.lineItems.map((item) => (
              <li
                key={item.id}
                className="mb-[0.28rem] grid grid-cols-[2.2rem_1fr_4.6rem] gap-1"
              >
                <span className="whitespace-pre">{item.qty}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {item.description}
                </span>
                <span className="text-right">{item.price}</span>
              </li>
            ))}
          </ul>

          <p className="my-2 text-center tracking-[-0.08em] opacity-70">
            --------------------------------
          </p>

          <div className="grid gap-[0.28rem]">
            <Row label="SUBTOTAL" value={bill.subtotal} />
            <Row label="TAX" value={bill.emotionalTax} />
            <Row label="SURCHARGE" value={bill.delusionTax} />
            <Row label="TIP" value={bill.tipSuggestion} small />
            <p className="my-1 text-center tracking-[-0.08em] opacity-70">
              --------------------------------
            </p>
            <div className="flex justify-between gap-3 text-[15px] font-bold">
              <span>TOTAL</span>
              <span className="text-right" style={{ color: theme.accent }}>
                {bill.total}
              </span>
            </div>
          </div>

          <div className="mt-4 mb-1 flex h-10 items-stretch justify-center gap-px px-2" aria-hidden>
            {Array.from({ length: 42 }).map((_, i) => (
              <span
                key={i}
                className="block h-full"
                style={{
                  width: `${(i * 7) % 3 === 0 ? 3 : (i * 3) % 2 === 0 ? 2 : 1}px`,
                  backgroundColor: theme.ink,
                  opacity: 0.75 + ((i % 5) * 0.05),
                }}
              />
            ))}
          </div>
          <p className="text-center text-[10px] tracking-[0.12em] opacity-70">
            {bill.barcodeId}
          </p>
          <p className="mt-3 text-center font-bold tracking-[0.03em]">
            {bill.footerQuote}
          </p>
          <p className="mt-2 text-center text-[10px] opacity-55">
            *** THE BESTIE BILL ***
          </p>
        </div>
      </div>

      <div
        className="h-3 scale-y-[-1]"
        style={{
          backgroundColor: theme.paper,
          WebkitMask:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12'%3E%3Cpolygon fill='black' points='0,12 8,0 16,12'/%3E%3C/svg%3E\") repeat-x bottom / 16px 12px",
          mask: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='12' viewBox='0 0 16 12'%3E%3Cpolygon fill='black' points='0,12 8,0 16,12'/%3E%3C/svg%3E\") repeat-x bottom / 16px 12px",
        }}
        aria-hidden
      />
    </article>
  );
}

function Row({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={`max-w-[62%] text-right ${small ? 'text-[10px] leading-tight' : ''}`}>
        {value}
      </span>
    </div>
  );
}
