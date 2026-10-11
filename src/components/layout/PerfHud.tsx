'use client';

import { useEffect, useState } from 'react';

const FLAG = 'xso-perf';

interface Reading {
  fps: number;
  worstMs: number;
  blockedMs: number;
  longTasks: number;
}

/**
 * On-device performance readout, for diagnosing lag on real phones: `?perf=1` turns it on for
 * the session, `?perf=0` off. Frame rate and worst frame cover the last second; blocked time and
 * long tasks (main thread busy over 50 ms) cover the last 10 seconds.
 */
export function PerfHud() {
  const [on, setOn] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('perf');
    try {
      if (q === '1') sessionStorage.setItem(FLAG, '1');
      if (q === '0') sessionStorage.removeItem(FLAG);
      setOn(sessionStorage.getItem(FLAG) === '1');
    } catch {
      setOn(q === '1');
    }
  }, []);

  useEffect(() => {
    if (!on) return;
    const frames: number[] = [];
    const tasks: { at: number; ms: number }[] = [];
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) =>
        list.getEntries().forEach((e) => tasks.push({ at: e.startTime, ms: e.duration })),
      );
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      observer = null;
    }
    let raf = 0;
    const tick = (now: number) => {
      frames.push(now);
      while (frames.length && now - frames[0] > 1000) frames.shift();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = window.setInterval(() => {
      const now = performance.now();
      while (tasks.length && now - tasks[0].at > 10_000) tasks.shift();
      const gaps = frames.slice(1).map((t, i) => t - frames[i]);
      setReading({
        fps: frames.length,
        worstMs: Math.round(Math.max(0, ...gaps)),
        blockedMs: Math.round(tasks.reduce((sum, t) => sum + t.ms, 0)),
        longTasks: tasks.length,
      });
      setLite(document.documentElement.classList.contains('lite'));
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [on]);

  if (!on || !reading) return null;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const tone =
    reading.fps >= 50 ? 'text-emerald-300' : reading.fps >= 35 ? 'text-amber-300' : 'text-rose-400';
  return (
    <div
      className="pointer-events-none fixed left-2 top-[calc(env(safe-area-inset-top,0px)+3.25rem)] z-[9999] rounded-lg bg-black/85 px-2.5 py-1.5 font-mono text-[11px] leading-[1.45] text-white"
      aria-hidden
    >
      <div className={tone}>
        {reading.fps} fps · worst {reading.worstMs} ms
      </div>
      <div>
        frozen {reading.blockedMs} ms / 10 s ({reading.longTasks})
      </div>
      <div className="opacity-70">
        lite {lite ? 'on' : 'off'} · {nav.deviceMemory ?? '?'} GB ·{' '}
        {navigator.hardwareConcurrency ?? '?'} cores · {window.devicePixelRatio}x
      </div>
    </div>
  );
}
