'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { toggleSound, useSoundOn } from '@/lib/sound';

/**
 * Top-left of the recipient stage, opposite Make one back. `labeled` spells out the state next to
 * the icon in a larger pill, lit when sound is on.
 */
export function SoundToggle({ labeled = false }: { labeled?: boolean }) {
  const on = useSoundOn();
  const Icon = on ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      onClick={toggleSound}
      aria-pressed={on}
      aria-label="Sound"
      title={on ? 'Sound on: tap to mute' : 'Sound off: tap to turn on'}
      className={`absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-40 rounded-full border backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 ${
        labeled
          ? `inline-flex h-12 items-center gap-2 pl-3.5 pr-4 font-receipt text-[13px] uppercase tracking-[0.14em] ${
              on
                ? 'border-[#fdba74]/60 bg-[#fdba74]/15 text-[#ffe7cf] hover:bg-[#fdba74]/25'
                : 'border-white/20 bg-black/50 text-white/70 hover:text-white'
            }`
          : 'grid h-10 w-10 place-items-center border-white/15 bg-black/45 text-white/80 hover:text-white'
      }`}
    >
      <Icon className={labeled ? 'h-[22px] w-[22px]' : 'h-[18px] w-[18px]'} aria-hidden />
      {labeled ? <span>{on ? 'Sound on' : 'Sound off'}</span> : null}
    </button>
  );
}
