'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Copy } from 'lucide-react';
import { ScratchReveal } from '@/components/xso/paper/ScratchReveal';

/** "CODE: BESTIE-4-LIFE • One free emergency pep talk" → code + perk. */
function splitReward(reward: string) {
  const [first, ...rest] = reward.split('•');
  const code = (first ?? '').replace(/^\s*code\s*:\s*/i, '').trim();
  const perk = rest.join('•').trim();
  return perk ? { code, perk } : { code: '', perk: reward.trim() };
}

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

/** Perforated paper ticket with a copper scratch-off hiding the reward code. */
export function SecretOffer({ reward }: { reward: string }) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [forceReveal, setForceReveal] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const resetTimer = useRef<number | null>(null);
  const { code, perk } = splitReward(reward);
  const copyValue = code || perk;

  const onReveal = useCallback(() => setRevealed(true), []);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = async () => {
    if (!revealed) setForceReveal(true);
    const ok = await copyText(copyValue);
    setCopyState(ok ? 'copied' : 'failed');
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1800);
  };

  const copied = copyState === 'copied';

  return (
    <section className="paper-ticket-shadow w-full" aria-label="Secret offer">
      <div className="paper-ticket grid grid-cols-[2.5rem_minmax(0,1fr)]">
        <div className="relative flex items-center justify-center border-r-2 border-dashed border-[#cdbfa6] bg-[#b8603e]">
          <p className="whitespace-nowrap font-receipt text-[10px] font-bold uppercase tracking-[0.3em] text-[#fbefe2] [writing-mode:vertical-rl] rotate-180">
            Admit one · No. 0417
          </p>
        </div>

        <div className="relative min-w-0 px-3.5 pb-3.5 pt-3 sm:px-4">
          <header className="mb-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-receipt text-[10px] uppercase tracking-[0.22em] text-[#8a7b66]">
                Tucked inside the keep
              </p>
              <h2 className="font-serif text-xl font-semibold italic leading-tight text-[#2b2621]">
                Secret offer
              </h2>
            </div>
            <span
              className={`ink-seal shrink-0 ${revealed ? 'is-open' : ''}`}
              aria-hidden
            >
              {revealed ? 'Opened' : 'Sealed'}
            </span>
          </header>

          <ScratchReveal
            reward={reward}
            variant="copper"
            label="Scratch the foil"
            onReveal={onReveal}
            forceReveal={forceReveal}
          >
            <div className="grid gap-1 text-center">
              {code ? (
                <>
                  <p className="font-receipt text-[10px] uppercase tracking-[0.26em] text-[#8a7b66]">
                    Code
                  </p>
                  <p className="select-all font-receipt text-xl font-bold tracking-[0.14em] text-[#2b2621] sm:text-2xl">
                    {code}
                  </p>
                </>
              ) : null}
              <p className="font-hand text-[17px] leading-snug text-[#4a3f33]">
                {perk}
              </p>
            </div>
          </ScratchReveal>

          <div className="mt-3 flex min-h-9 items-center justify-between gap-3">
            <p
              className="min-w-0 font-receipt text-[11px] leading-snug text-[#7a6c58]"
              aria-live="polite"
            >
              {copyState === 'copied'
                ? `${copyValue} copied to clipboard.`
                : copyState === 'failed'
                  ? 'Copy blocked — long-press the code instead.'
                  : revealed
                    ? 'Use it at checkout.'
                    : 'Scratch the foil, or peel & copy.'}
            </p>
            <motion.button
              type="button"
              onClick={() => void copy()}
              animate={
                copied && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }
              }
              whileTap={reduce ? undefined : { scale: 0.95 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className={`paper-chip inline-flex shrink-0 touch-manipulation items-center gap-1.5 ${
                copied ? 'is-copied' : ''
              }`}
            >
              {copied ? null : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? 'Copied ✓' : revealed ? 'Copy' : 'Peel & copy'}
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
