// #region agent log
/** Temporary Loop-deck flick profiler, active only after visiting with ?dbg=1. */
function on() {
  try {
    if (/[?&]dbg=1/.test(location.search)) sessionStorage.setItem('xso-dbg', '1');
    return sessionStorage.getItem('xso-dbg') === '1';
  } catch {
    return false;
  }
}

function send(message: string, data: Record<string, unknown>, hypothesisId: string) {
  fetch('/api/debug-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: '51bbe9',
      runId: 'loop-1',
      hypothesisId,
      location: 'MemoryDeck.tsx',
      message,
      data,
      timestamp: Date.now(),
    }),
    keepalive: true,
  }).catch(() => {});
}

interface Flick {
  t0: number;
  via: string;
  soundMs: number;
  landAt: number;
  landRenderMs: number;
  gaps: number[];
  tasks: number[][];
  cancels: number;
}

let flick: Flick | null = null;
let observer: PerformanceObserver | null = null;
let count = 0;

export function dbgLaunch(via: string, soundMs: number) {
  if (!on()) return;
  if (!observer) {
    try {
      observer = new PerformanceObserver((l) =>
        l.getEntries().forEach((e) => {
          if (flick) flick.tasks.push([Math.round(e.startTime - flick.t0), Math.round(e.duration)]);
        }),
      );
      observer.observe({ type: 'longtask' });
    } catch {}
  }
  const t0 = performance.now();
  flick = { t0, via, soundMs, landAt: 0, landRenderMs: 0, gaps: [], tasks: [], cancels: 0 };
  const current = flick;
  let prev = t0;
  const tick = (now: number) => {
    if (flick !== current) return;
    current.gaps.push(Math.round(now - prev));
    prev = now;
    if (current.landAt && now - current.landAt > 450) {
      flick = null;
      count += 1;
      const g = current.gaps;
      const sorted = [...g].sort((a, b) => a - b);
      send(
        `flick ${count}`,
        {
          via: current.via,
          soundMs: current.soundMs,
          flightMs: Math.round(current.landAt - current.t0),
          landRenderMs: current.landRenderMs,
          frames: g.length,
          over20: g.filter((x) => x > 20).length,
          over34: g.filter((x) => x > 34).length,
          p50: sorted[sorted.length >> 1],
          max: sorted[sorted.length - 1],
          gapsSeq: g.slice(0, 60),
          longTasks: current.tasks,
          cancels: current.cancels,
          dpr: window.devicePixelRatio,
          lite: document.documentElement.classList.contains('lite'),
        },
        'A,B,C,D,E',
      );
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function dbgLand() {
  if (!flick) return;
  const current = flick;
  const start = performance.now();
  current.landAt = start;
  requestAnimationFrame(() => {
    current.landRenderMs = Math.round(performance.now() - start);
  });
}

let drag: { t0: number; gaps: number[]; moves: number } | null = null;

export function dbgPointer(
  kind: 'cancel' | 'dragStart' | 'dragEnd' | 'move',
  data?: Record<string, unknown>,
) {
  if (!on()) return;
  if (kind === 'move') {
    if (drag) drag.moves += 1;
    return;
  }
  if (kind === 'cancel') {
    if (flick) flick.cancels += 1;
    send('pointer cancel', { ...data, dragging: Boolean(drag) }, 'C');
    return;
  }
  if (kind === 'dragStart') {
    const current = { t0: performance.now(), gaps: [] as number[], moves: 0 };
    drag = current;
    let prev = current.t0;
    const tick = (now: number) => {
      if (drag !== current) return;
      current.gaps.push(Math.round(now - prev));
      prev = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return;
  }
  const current = drag;
  drag = null;
  if (!current) return;
  const g = current.gaps;
  send(
    'drag',
    {
      ...data,
      ms: Math.round(performance.now() - current.t0),
      frames: g.length,
      moves: current.moves,
      over20: g.filter((x) => x > 20).length,
      max: Math.max(0, ...g),
      gapsSeq: g.slice(0, 60),
    },
    'B,C',
  );
}
// #endregion
