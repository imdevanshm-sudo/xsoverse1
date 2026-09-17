'use client';

import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useState } from 'react';
import { useBillStore } from '@/store/useBillStore';

export function ExportButton() {
  const customerName = useBillStore((s) => s.customerName);
  const [exporting, setExporting] = useState(false);

  async function downloadPng() {
    const node = document.getElementById('receipt-export');
    if (!node) return;
    setExporting(true);
    try {
      // ~300 DPI equivalent for a ~340px-wide receipt at print size
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 4,
        backgroundColor: '#120f0c',
      });
      const link = document.createElement('a');
      link.download = `bestie-bill-${(customerName || 'friend')
        .toLowerCase()
        .replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPng}
      disabled={exporting}
      className="inline-flex items-center justify-center gap-2 border border-white/25 px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:border-acid hover:text-acid disabled:opacity-60"
    >
      <Download className="h-4 w-4" />
      {exporting ? 'Exporting…' : 'Download 300DPI PNG'}
    </button>
  );
}
