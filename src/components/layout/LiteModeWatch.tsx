'use client';

import { useEffect } from 'react';
import { watchFrameRate } from '@/lib/liteMode';

export function LiteModeWatch() {
  useEffect(() => watchFrameRate(), []);
  return null;
}
