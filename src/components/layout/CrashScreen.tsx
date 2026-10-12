'use client';

import { useEffect } from 'react';

/** What a visitor sees instead of a blank page when something breaks; reports the error once. */
export function CrashScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          Tap below to try again. If it keeps happening, reload the page.
        </p>
        <button
          type="button"
          onClick={reset}
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
          Try again
        </button>
      </div>
    </div>
  );
}
