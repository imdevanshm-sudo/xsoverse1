'use client';

import { useCallback, useRef } from 'react';

type Report = (index: number, label: string) => void;

/**
 * Wraps a format's `onChange` so it also notices when every card has been on top at least once,
 * and fires `onFinish` that one time. The first card counts as seen from the start.
 */
export function useProgress(count: number, onChange?: Report, onFinish?: () => void): Report {
  const seen = useRef(new Set([0]));
  const done = useRef(false);
  const latest = useRef({ count, onChange, onFinish });
  latest.current = { count, onChange, onFinish };
  return useCallback((index: number, label: string) => {
    const { count: total, onChange: report, onFinish: finish } = latest.current;
    report?.(index, label);
    seen.current.add(index);
    if (done.current || seen.current.size < total) return;
    done.current = true;
    finish?.();
  }, []);
}
