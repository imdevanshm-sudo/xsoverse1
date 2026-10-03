'use client';

import dynamic from 'next/dynamic';
import { usePolaroidStore } from '@/store/usePolaroidStore';

const PolaroidLightbox = dynamic(
  () => import('@/components/xso/PolaroidLightbox').then((m) => m.PolaroidLightbox),
  { ssr: false },
);

/** Warms the lightbox chunk on the press that will open it. */
export function preloadLightbox() {
  void import('@/components/xso/PolaroidLightbox');
}

/** Root-level slot: the lightbox's code and DOM exist only while a photo is out. */
export function PolaroidLightboxHost() {
  const needed = usePolaroidStore((state) => state.activePolaroidData !== null);
  return needed ? <PolaroidLightbox /> : null;
}
