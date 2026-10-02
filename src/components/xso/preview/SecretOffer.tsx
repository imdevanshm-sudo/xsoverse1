'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Copy } from 'lucide-react';
import { splitReward } from '@/lib/reward';
import { ScratchReveal } from '@/components/xso/paper/ScratchReveal';

/** Must run synchronously inside the click so the user gesture is still live. */
function execCopy(text: string): boolean {
  const previous = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.opacity = '0';
  area.style.fontSize = '16px';
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  previous?.focus?.({ preventScroll: true });
  return ok;
}

/**
 * execCommand first (works in webviews and unfocused frames), then the
 * async Clipboard API for browsers that have dropped execCommand support.
 */
async function copyText(text: string): Promise<boolean> {
  if (execCopy(text)) return true;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* blocked */
  }
  return false;
}

type CopyState = 'idle' | 'copied' | 'failed';

/** Perforated paper coupon; the code sits under a scratch-off foil until revealed. */
export function SecretOffer({ reward }: { reward: string }) {
  const reduce = useReducedMotion();
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [revealed, setRevealed] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const { code, perk } = splitReward(reward);
  const copyValue = code || perk;
  const copied = copyState === 'copied';

  useEffect(() => setRevealed(false), [reward]);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = async () => {
    const ok = await copyText(copyValue);
    setCopyState(ok ? 'copied' : 'failed');
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1800);
  };

  return (
    <section className="paper-ticket-shadow w-full" aria-label="Secret promise">
      <div className="paper-ticket grid grid-cols-[2.5rem_minmax(0,1fr)]">
        <div className="flex items-center justify-center border-r-2 border-dashed border-[#cdbfa6] bg-[#c85a32]">
          <p className="rotate-180 whitespace-nowrap font-receipt text-[10px] font-bold uppercase tracking-[0.3em] text-[#fbefe2] [writing-mode:vertical-rl]">
            Admit one · No. 0417
          </p>
        </div>

        <div className="min-w-0 px-3.5 pb-3.5 pt-3 sm:px-4">
          <header className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#c85a32] px-2.5 py-1 font-receipt text-[10px] font-bold uppercase tracking-[0.2em] text-[#fbefe2]">
              Secret promise
            </span>
            <span className="truncate font-receipt text-[10px] uppercase tracking-[0.16em] text-[#8a7b66]">
              Tucked inside
            </span>
          </header>

          <ScratchReveal
            key={reward}
            reward={reward}
            label="Scratch to reveal"
            compact
            unstyled
            onReveal={() => setRevealed(true)}
            className="rounded-xl border-2 border-dashed border-[#d3c4aa] bg-[#f3ebdc]"
          >
            <div>
              <p className="font-receipt text-[10px] uppercase tracking-[0.26em] text-[#8a7b66]">
                Redeem with me
              </p>
              <p className="mt-0.5 select-all font-receipt text-[22px] font-bold tracking-[0.1em] text-[#2b2621] sm:text-2xl">
                {code || perk}
              </p>
              {code ? (
                <p className="mt-1 font-serif text-[15px] italic leading-snug text-[#5c4a3a]">
                  {perk}
                </p>
              ) : null}
            </div>
          </ScratchReveal>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p
              className="min-w-0 font-receipt text-[11px] leading-snug text-[#7a6c58]"
              aria-live="polite"
            >
              {!revealed
                ? 'Scratch the foil. Something’s waiting underneath.'
                : copyState === 'copied'
                ? 'Copied to clipboard.'
                : copyState === 'failed'
                  ? 'Copy blocked — long-press the code.'
                  : 'Keep it. Cash it in together.'}
            </p>
            <motion.button
              type="button"
              onClick={() => void copy()}
              disabled={!revealed}
              animate={copied && !reduce ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              transition={{ duration: 0.34, ease: 'easeOut' }}
              aria-label={
                !revealed ? 'Scratch the foil first' : copied ? 'Code copied' : `Copy code ${copyValue}`
              }
              className={`paper-chip inline-flex min-w-[8.25rem] shrink-0 touch-manipulation items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-45 ${
                copied ? 'is-copied' : ''
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={copied ? 'copied' : 'copy'}
                  className="inline-flex items-center gap-1.5"
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                >
                  {copied ? null : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? 'Copied ✓' : 'Copy code'}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
