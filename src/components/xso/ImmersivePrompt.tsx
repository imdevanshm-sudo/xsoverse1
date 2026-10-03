'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { Maximize2 } from 'lucide-react';

/** `checking` paints plain black until the client knows which prompt (if any) applies. */
type Mode = 'checking' | 'fullscreen' | 'toolbars' | 'done';
type Exit = 'cinematic' | 'quick' | 'instant';

type FullscreenDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function canFullscreen() {
  const doc = document as FullscreenDocument;
  const el = document.documentElement as FullscreenElement;
  return Boolean(
    (doc.fullscreenEnabled && el.requestFullscreen) ||
    (doc.webkitFullscreenEnabled && el.webkitRequestFullscreen),
  );
}

function alreadyImmersive() {
  const doc = document as FullscreenDocument;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
}

/** iPhone Safari has no element fullscreen; iPadOS reports itself as a Mac with touch. */
function isIOS() {
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

async function requestFullscreen() {
  const el = document.documentElement as FullscreenElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
    return true;
  } catch {
    return false;
  }
}

const SHROUD: Variants = {
  shown: { opacity: 1 },
  hidden: (exit: Exit) => ({
    opacity: 0,
    transition:
      exit === 'cinematic'
        ? { duration: 1.5, delay: 0.55, ease: [0.4, 0, 0.2, 1] }
        : exit === 'quick'
          ? { duration: 0.7, delay: 0.15, ease: [0.4, 0, 0.2, 1] }
          : { duration: 0.25 },
  }),
};
const COPY: Variants = {
  shown: { opacity: 1, y: 0, filter: 'blur(0px)' },
  hidden: (exit: Exit) => ({
    opacity: 0,
    y: exit === 'cinematic' ? -4 : 0,
    filter: exit === 'cinematic' ? 'blur(2px)' : 'blur(0px)',
    transition: { duration: exit === 'cinematic' ? 0.7 : 0.3, ease: [0.4, 0, 0.2, 1] },
  }),
};

/**
 * A black interstitial before the unwrap that offers to drop the browser chrome.
 * The gift renders underneath from the start, so the reveal is just the shroud lifting.
 */
export function ImmersivePrompt({ id, children }: { id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>('checking');
  const [exit, setExit] = useState<Exit>('instant');
  const [pending, setPending] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const storageKey = `xso:immersive:${id}`;

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(storageKey) === '1';
    } catch {
      // Private mode without storage: just ask again.
    }
    if (seen || alreadyImmersive()) {
      setMode('done');
      return;
    }
    setIosHint(isIOS());
    setMode(canFullscreen() ? 'fullscreen' : 'toolbars');
  }, [storageKey]);

  useEffect(() => {
    const el = content.current;
    if (!el) return;
    if (mode === 'done') el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [mode]);

  const finish = (style: Exit) => {
    try {
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // Non-essential.
    }
    setExit(reduce ? 'quick' : style);
    setMode('done');
  };

  const enter = async () => {
    if (pending) return;
    if (mode !== 'fullscreen') return finish('cinematic');
    setPending(true);
    await requestFullscreen();
    finish('cinematic');
  };

  const fullscreen = mode === 'fullscreen';

  return (
    <>
      <div ref={content} className="contents">
        {children}
      </div>
      <noscript>
        <style>{'[data-immersive-prompt]{display:none!important}'}</style>
      </noscript>
      <AnimatePresence custom={exit}>
        {mode === 'done' ? null : (
          <motion.div
            key="immersive"
            data-immersive-prompt
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black px-8"
            custom={exit}
            variants={SHROUD}
            initial={false}
            animate="shown"
            exit="hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="immersive-headline"
          >
            {mode === 'checking' ? null : (
              <motion.div
                className="flex flex-col items-center text-center"
                custom={exit}
                variants={COPY}
                initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }}
                animate="shown"
                exit="hidden"
                transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1
                  id="immersive-headline"
                  className="max-w-[18rem] font-display text-[15px] font-light leading-relaxed tracking-[0.06em] text-white/70"
                >
                  {fullscreen
                    ? 'Best experienced without borders.'
                    : 'Hide toolbars for the best experience.'}
                </h1>
                {!fullscreen && iosHint ? (
                  <p className="mt-3 max-w-[16rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-white/35">
                    Tap <span className="normal-case text-white/55">aA</span> in the address bar,
                    then Hide Toolbar
                  </p>
                ) : null}

                <motion.button
                  type="button"
                  onClick={enter}
                  disabled={pending}
                  autoFocus
                  className="immersive-cta mt-10 flex min-h-12 touch-manipulation items-center gap-2.5 rounded-full border border-white/25 px-7 font-mono text-[11px] uppercase tracking-[0.24em] text-white/90 disabled:opacity-60"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {fullscreen ? <Maximize2 className="h-3.5 w-3.5" aria-hidden /> : null}
                  {fullscreen ? 'Enter Full Screen' : 'Continue'}
                </motion.button>

                {fullscreen ? (
                  <button
                    type="button"
                    onClick={() => finish('quick')}
                    className="mt-6 min-h-11 touch-manipulation px-3 text-[12px] tracking-[0.04em] text-white/35 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white/60"
                  >
                    Skip &amp; continue
                  </button>
                ) : null}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
