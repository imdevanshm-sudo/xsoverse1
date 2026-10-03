'use client';

import dynamic from 'next/dynamic';

/** Holds the takeover's backdrop while the preview and unboxing code download on first open. */
function Loading() {
  return (
    <div
      role="status"
      aria-label="Opening preview"
      className="fixed inset-0 z-[100] grid place-items-center bg-[#0c070a]"
    >
      <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
    </div>
  );
}

/** The receiver preview and gift wrap stay out of the studio bundle until someone asks for them. */
export const ReceiverPreview = dynamic(
  () => import('@/components/xso/ReceiverPreview').then((m) => m.ReceiverPreview),
  { ssr: false, loading: Loading },
);
