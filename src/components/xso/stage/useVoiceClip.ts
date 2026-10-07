'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { attachMedia, mediaElement, optIn, type MediaHandle } from '@/lib/sound';

/**
 * A voice note behind a play button, mixed through the sound manager on the voice bus (levelled
 * to −16 LUFS, never ducked). Nothing downloads until the first press, which also opts in to sound.
 */
export function useVoiceClip(src: string | undefined) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const mix = useRef<MediaHandle | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(
    () => () => {
      mix.current?.release();
      mix.current = null;
      audio.current = null;
      setPlaying(false);
    },
    [src],
  );

  const toggle = useCallback(() => {
    if (!src) return setPlaying((on) => !on);
    let clip = audio.current;
    if (!clip) {
      clip = mediaElement(src);
      audio.current = clip;
      mix.current = attachMedia(clip, 'voice');
      clip.addEventListener('pause', () => setPlaying(false));
      clip.addEventListener('play', () => setPlaying(true));
    }
    if (!clip.paused) return clip.pause();
    optIn();
    void clip.play().catch(() => setPlaying(false));
  }, [src]);

  return { audio, playing, toggle, stop: () => audio.current?.pause() };
}
