'use client';

import { BillEditor } from '@/components/BillEditor';
import { ExportButton } from '@/components/ExportButton';
import { ThermalReceipt } from '@/components/ThermalReceipt';

export function Studio() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8">
      <div className="order-2 lg:order-1">
        <BillEditor />
      </div>

      <aside className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/50">
            Live Preview
          </p>
          <ExportButton />
        </div>
        <div
          id="receipt-export"
          className="rounded-sm bg-[#120f0c] p-6 sm:p-8"
        >
          <ThermalReceipt />
        </div>
      </aside>
    </div>
  );
}
