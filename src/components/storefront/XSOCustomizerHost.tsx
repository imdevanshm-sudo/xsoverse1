'use client';

import dynamic from 'next/dynamic';
import { useCustomizerModal } from '@/store/useCustomizerModal';

const XSOCustomizerModal = dynamic(
  () => import('@/components/storefront/XSOCustomizerModal').then((m) => m.XSOCustomizerModal),
  { ssr: false },
);

/** Mounts the customizer only once someone asks for it. */
export function XSOCustomizerHost() {
  const isOpen = useCustomizerModal((s) => s.isOpen);
  return isOpen ? <XSOCustomizerModal /> : null;
}
