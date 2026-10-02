'use client';

import { useShallow } from 'zustand/react/shallow';
import { useXsoStore } from '@/store/useXsoStore';
import type { XsoData } from '@/types/xso';

/** Souvenir content only (no actions), re-rendering on shallow changes. */
export function useXsoData(): XsoData {
  return useXsoStore(
    useShallow((s) => ({
      id: s.id,
      giftStyle: s.giftStyle,
      billerName: s.billerName,
      customerName: s.customerName,
      occasion: s.occasion,
      timestamp: s.timestamp,
      merchantName: s.merchantName,
      cashier: s.cashier,
      lineItems: s.lineItems,
      subtotal: s.subtotal,
      emotionalTax: s.emotionalTax,
      total: s.total,
      auditMetrics: s.auditMetrics,
      greenFlags: s.greenFlags,
      redFlags: s.redFlags,
      certifiedStampText: s.certifiedStampText,
      photos: s.photos,
      birthdayMessage: s.birthdayMessage,
      voiceNoteUrl: s.voiceNoteUrl,
      scratchOffReward: s.scratchOffReward,
      scrapbook: s.scrapbook,
    })),
  );
}
