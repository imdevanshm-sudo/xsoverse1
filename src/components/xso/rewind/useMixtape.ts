'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RewindLayers } from '@/types/xso';
import { useSoundtrack } from '@/components/xso/stage/useSoundtrack';
import { playableAudio } from '@/lib/audioUpload';
import { MIXTAPE_TRACKS, soundtrackSrc } from '@/lib/soundtracks';

/**
 * The Rewind's soundtrack, played once through with a fade at the end. Recipients get a signed URL
 * with the gift; a sender previewing a stored upload asks for one on the first press. Nothing is
 * fetched before a tap.
 */
export function useMixtape(rewind: RewindLayers | undefined) {
  const ref = rewind?.soundtrack ?? '';
  const direct = rewind?.soundtrackUrl ?? soundtrackSrc(ref, MIXTAPE_TRACKS);
  const stored = !direct && ref.startsWith('storage:');
  const [signed, setSigned] = useState<string | null>(null);
  const music = useSoundtrack(direct ?? signed, {
    loop: false,
    kind: rewind?.voice ? 'voice' : 'music',
  });
  const waiting = useRef(false);
  const { start, toggle: toggleMusic } = music;

  useEffect(() => {
    if (!signed || !waiting.current) return;
    waiting.current = false;
    start();
  }, [signed, start]);

  const toggle = useCallback(() => {
    if (!stored || signed) return toggleMusic();
    if (waiting.current) return;
    waiting.current = true;
    void playableAudio(ref, null).then((url) => {
      if (url) setSigned(url);
      else waiting.current = false;
    });
  }, [ref, signed, stored, toggleMusic]);

  return {
    ...music,
    toggle,
    available: Boolean(direct) || stored,
    voice: Boolean(rewind?.voice),
    transcript: rewind?.voice ? (rewind.transcript ?? '').trim() : '',
  };
}
