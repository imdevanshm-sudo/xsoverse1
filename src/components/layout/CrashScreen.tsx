'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'xso:chunk-reload';

function isStaleChunk(error: Error) {
  const name = error.name || '';
  const message = error.message || '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w.-]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

/** What a visitor sees instead of a blank page when something breaks; reports the error once. */
export function CrashScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStaleChunk(error);

  useEffect(() => {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        path: window.location.pathname + window.location.search,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  // After a deploy, old tabs request JS chunks that no longer exist. Soft reset
  // cannot fix that — reload once so the buyer lands on the new build.
  useEffect(() => {
    if (!stale) return;
    try {
      if (sessionStorage.getItem(RELOAD_KEY) === '1') {
        sessionStorage.removeItem(RELOAD_KEY);
        return;
      }
      sessionStorage.setItem(RELOAD_KEY, '1');
    } catch {
      // private mode / blocked storage — still try a hard reload once
    }
    window.location.reload();
  }, [stale]);

  function recover() {
    if (stale) {
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* ignore */
      }
      window.location.reload();
      return;
    }
    reset();
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#1a0f15',
        color: '#fdf2f8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Something went wrong.</p>
        <p style={{ fontSize: 15, opacity: 0.75, margin: '10px 0 20px' }}>
          {stale
            ? 'The site just updated. Reloading…'
            : 'Tap below to try again. If it keeps happening, reload the page.'}
        </p>
        <button
          type="button"
          onClick={recover}
          style={{
            minHeight: 48,
            padding: '0 28px',
            borderRadius: 999,
            border: 0,
            background: '#ec4899',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {stale ? 'Reload' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
