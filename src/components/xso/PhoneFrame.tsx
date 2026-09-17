'use client';

import type { ReactNode } from 'react';

export type PhoneFrameSize = 'hero' | 'default' | 'compact';

const FRAME_SIZE: Record<PhoneFrameSize, string> = {
  hero:
    'relative mx-auto h-[min(78dvh,760px)] min-h-[520px] w-full overflow-hidden rounded-xso-phone border border-white/12 bg-[#090a0c] shadow-[0_28px_80px_rgba(0,0,0,0.55)] ring-1 ring-black/50',
  default:
    'relative mx-auto h-[min(52vh,500px)] min-h-[380px] w-full overflow-hidden rounded-xso-phone border border-white/12 bg-[#090a0c] shadow-[0_20px_56px_rgba(0,0,0,0.5)] ring-1 ring-black/50',
  compact:
    'relative mx-auto h-[min(48vh,440px)] min-h-[340px] w-full overflow-hidden rounded-xso-phone border border-white/12 bg-[#090a0c] shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-black/50',
};

interface PhoneFrameProps {
  children: ReactNode;
  size?: PhoneFrameSize;
  className?: string;
}

export function PhoneFrame({
  children,
  size = 'default',
  className = '',
}: PhoneFrameProps) {
  return (
    <div className={`${FRAME_SIZE[size]} ${className}`.trim()}>{children}</div>
  );
}
