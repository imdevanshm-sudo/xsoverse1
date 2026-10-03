'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { toggleSound, useSoundOn } from '@/lib/sound';

/** Top-left of the recipient stage, opposite Make one back. */
export function SoundToggle() {
  const on = useSoundOn();
  return (
    <button
      type="button"
      onClick={toggleSound}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      title={on ? 'Sound on' : 'Sound off'}
      className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-40 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/45 text-white/80 backdrop-blur-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
    >
      {on ? (
        <Volume2 className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <VolumeX className="h-[18px] w-[18px]" aria-hidden />
      )}
    </button>
  );
}
