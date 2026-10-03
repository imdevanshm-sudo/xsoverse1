'use client';

interface LemonEvent {
  event: string;
}

interface LemonSqueezyGlobal {
  Setup: (options: { eventHandler: (event: LemonEvent) => void }) => void;
  Url: { Open: (url: string) => void; Close: () => void };
}

declare global {
  interface Window {
    LemonSqueezy?: LemonSqueezyGlobal;
    createLemonSqueezy?: () => void;
  }
}

const SRC = 'https://app.lemonsqueezy.com/js/lemon.js';
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

/** Opens the checkout over the page; `onSuccess` fires once payment goes through. */
export function openLemonOverlay(url: string, onSuccess: () => void): boolean {
  const lemon = window.LemonSqueezy;
  if (!lemon) return false;
  lemon.Setup({
    eventHandler: ({ event }) => {
      if (event === 'Checkout.Success') onSuccess();
    },
  });
  lemon.Url.Open(url);
  return true;
}
