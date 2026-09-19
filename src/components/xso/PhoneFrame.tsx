'use client';

import type { ReactNode } from 'react';

export type PhoneFrameSize = 'hero' | 'default' | 'compact';

const FRAME_SIZE: Record<PhoneFrameSize, string> = {
  hero:
    'relative mx-auto h-[min(58dvh,640px)] min-h-[300px] w-full overflow-hidden rounded-xso-phone border border-white/12 bg-[#090a0c] shadow-[0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-black/50 sm:h-[min(72dvh,760px)] sm:min-h-[480px] sm:shadow-[0_28px_80px_rgba(0,0,0,0.55)]',
  default:
    'relative mx-auto h-[min(48dvh,480px)] min-h-[280px] w-full overflow-hidden rounded-xso-phone border border-white/12 bg-[#090a0c] shadow-[0_10px_28px_rgba(0,0,0,0.4)] ring-1 ring-black/50 sm:h-[min(52vh,500px)] sm:min-h-[380px] sm:shadow-[0_20px_56px_rgba(0,0,0,0.5)]',
  compact:
    'relative mx-auto h-[min(42dvh,400px)] min-h-[260px] w-full overflow-hidden rounded-xso-phone border border-white/12 bg-[#090a0c] shadow-[0_8px_20px_rgba(0,0,0,0.35)] ring-1 ring-black/50 sm:h-[min(48vh,440px)] sm:min-h-[340px] sm:shadow-[0_16px_40px_rgba(0,0,0,0.45)]',
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
