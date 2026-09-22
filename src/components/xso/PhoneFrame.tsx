'use client';

import type { ReactNode } from 'react';

export type PhoneFrameSize = 'hero' | 'default' | 'compact';

const FRAME_SIZE: Record<PhoneFrameSize, string> = {
  hero: 'phone-frame-shell phone-frame-shell--hero',
  default: 'phone-frame-shell phone-frame-shell--default',
  compact: 'phone-frame-shell phone-frame-shell--compact',
};

interface PhoneFrameProps {
  children: ReactNode;
  size?: PhoneFrameSize;
  className?: string;
}

/** Framed stage that stays proportioned in portrait, landscape, and legacy WebViews. */
export function PhoneFrame({
  children,
  size = 'default',
  className = '',
}: PhoneFrameProps) {
  return (
    <div className={`${FRAME_SIZE[size]} ${className}`.trim()}>{children}</div>
  );
}
