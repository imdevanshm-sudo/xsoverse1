'use client';

import dynamic from 'next/dynamic';
import { useExpressOrder } from '@/store/useExpressOrder';

const ExpressOrderModal = dynamic(
  () => import('@/components/storefront/ExpressOrderModal').then((m) => m.ExpressOrderModal),
  { ssr: false },
);

/** Mounts the Express Order sheet only once someone asks for it. */
export function ExpressOrderHost() {
  const open = useExpressOrder((s) => s.open);
  return open ? <ExpressOrderModal /> : null;
}
