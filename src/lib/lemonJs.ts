'use client';

interface LemonEvent {
  event?: string;
}

interface LemonSqueezyGlobal {
  Setup: (options: { eventHandler: (event: LemonEvent | string) => void }) => void;
  Url: { Open: (url: string) => void; Close: () => void };
  Loader?: { Hide?: () => void };
}

declare global {
  interface Window {
    LemonSqueezy?: LemonSqueezyGlobal;
    createLemonSqueezy?: () => void;
  }
}

const SRC = 'https://app.lemonsqueezy.com/js/lemon.js';
/** Lemon never posts `mounted` → white loader stays forever. Bail to hosted checkout. */
const OVERLAY_MOUNT_MS = 5000;
let loading: Promise<boolean> | null = null;

/** Loads Lemon.js once. Resolves false if it can't load in time, so callers fall back to a redirect. */
export function loadLemonJs(timeoutMs = 4000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.LemonSqueezy) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(false), timeoutMs);
    const script = document.createElement('script');
    script.src = SRC;
    script.defer = true;
    script.onload = () => {
      window.clearTimeout(timer);
      window.createLemonSqueezy?.();
      resolve(Boolean(window.LemonSqueezy));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      loading = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Lemon.js Close() leaves `.lemonsqueezy-loader` up if `mounted` never fired. */
export function scrubLemonOverlay() {
  if (typeof document === 'undefined') return;
  try {
    window.LemonSqueezy?.Url.Close();
  } catch {
    /* ignore */
  }
  try {
    window.LemonSqueezy?.Loader?.Hide?.();
  } catch {
    /* ignore */
  }
  document.querySelectorAll('.lemonsqueezy-loader').forEach((node) => node.remove());
  document.body.classList.remove('lemonsqueezy-open', 'lemonsqueezy-loading');
  document
    .querySelectorAll('body > iframe[src*="lemonsqueezy.com"], body > iframe[src*="store.xsoverse.app"]')
    .forEach((node) => node.remove());
}

/** Hosted checkout URL (no embed) — full-page fall back when the overlay hangs. */
export function hostedCheckoutUrl(url: string): string {
  const next = new URL(url);
  next.searchParams.delete('embed');
  return next.toString();
}

/**
 * Opens the checkout over the page. Resolves `'opened'` once Lemon posts `mounted` (or any
 * Checkout.* event), `'stuck'` if the overlay never mounts, or `false` if Lemon.js is missing.
 */
export function openLemonOverlay(
  url: string,
  onSuccess: () => void,
): Promise<'opened' | 'stuck' | false> {
  const lemon = window.LemonSqueezy;
  if (!lemon) return Promise.resolve(false);

  const withDark = new URL(url);
  // lemon.js picks loader color from ?dark= — without it a hung overlay is a white blank.
  if (!withDark.searchParams.has('dark')) withDark.searchParams.set('dark', '1');

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: 'opened' | 'stuck') => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    };

    lemon.Setup({
      eventHandler: (payload) => {
        if (payload === 'mounted') {
          finish('opened');
          return;
        }
        if (typeof payload !== 'object' || !payload?.event) return;
        if (payload.event === 'Checkout.Success') {
          finish('opened');
          onSuccess();
          return;
        }
        if (payload.event.startsWith('Checkout.') || payload.event.startsWith('GA.')) {
          finish('opened');
        }
      },
    });

    const timer = window.setTimeout(() => {
      const stillLoading = document.body.classList.contains('lemonsqueezy-loading');
      if (stillLoading) finish('stuck');
      else finish('opened');
    }, OVERLAY_MOUNT_MS);

    lemon.Url.Open(withDark.toString());
  });
}
