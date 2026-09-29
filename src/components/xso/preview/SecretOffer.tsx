'use client';

import { useCallback, useState } from 'react';
import { Check, Copy, Lock, Sparkles } from 'lucide-react';
import { ScratchReveal } from '@/components/xso/paper/ScratchReveal';

/** "CODE: BESTIE-4-LIFE • One free emergency pep talk" → code + perk. */
function splitReward(reward: string) {
  const [first, ...rest] = reward.split('•');
  const code = (first ?? '').replace(/^\s*code\s*:\s*/i, '').trim();
  const perk = rest.join('•').trim();
  return perk ? { code, perk } : { code: '', perk: reward.trim() };
}

/** Holo-bordered ticket with a scratch-off foil hiding the reward code. */
export function SecretOffer({ reward }: { reward: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { code, perk } = splitReward(reward);

  const onReveal = useCallback(() => setRevealed(true), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code || perk);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      className={`holo-border w-full rounded-2xl p-[1.5px] ${revealed ? 'is-revealed' : ''}`}
      aria-label="Secret offer"
    >
      <div className="console-panel relative rounded-[15px] px-3.5 pb-3.5 pt-3">
        <header className="mb-2.5 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-pixel text-[8px] uppercase tracking-[0.2em] text-white/80">
            <Sparkles className="h-3 w-3 text-[#00ff66]" aria-hidden />
            Secret offer
          </p>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors duration-300 ${
              revealed
                ? 'border-[#00ff66]/40 bg-[#00ff66]/10 text-[#00ff66]'
                : 'border-white/15 bg-black/30 text-white/50'
            }`}
          >
            {revealed ? (
              <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
            ) : (
              <Lock className="h-2.5 w-2.5" aria-hidden />
            )}
            {revealed ? 'Unlocked' : 'Under foil'}
          </span>
        </header>

        <ScratchReveal
          reward={reward}
          variant="holo"
          label="Scratch the foil"
          onReveal={onReveal}
        >
          <div className="grid gap-1 text-center">
            {code ? (
              <>
                <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#6b6257]">
                  Code
                </p>
                <p className="font-mono text-lg font-bold tracking-[0.12em] text-[#1d1a16] sm:text-xl">
                  {code}
                </p>
              </>
            ) : null}
            <p className="font-hand text-[16px] leading-snug text-[#2c241c]">
              {perk}
            </p>
          </div>
        </ScratchReveal>

        <div className="mt-2.5 flex min-h-8 items-center justify-between gap-3">
          <p className="font-mono text-[10px] leading-snug text-white/45" aria-live="polite">
            {revealed
              ? 'Tucked inside every Loop keep.'
              : 'Drag across the foil to reveal it.'}
          </p>
          {revealed && code ? (
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/80 transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff66]"
            >
              {copied ? (
                <Check className="h-3 w-3 text-[#00ff66]" aria-hidden />
              ) : (
                <Copy className="h-3 w-3" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
