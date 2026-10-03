'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME = 0.6;

/**
 * The Movie Box score. Nothing is fetched until `start()` runs inside the Play tap, which is also
 * what lets the browser play audio. Fades in, pauses with the tab, and fades out on `finish()`.
 */
export function useSoundtrack(src: string | null) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);

  const ramp = useCallback((to: number, ms: number, done?: () => void) => {
    const node = audio.current;
    if (!node) return;
    if (fade.current) window.clearInterval(fade.current);
    const from = node.volume;
    const started = performance.now();
    fade.current = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / ms);
      node.volume = from + (to - from) * t;
      if (t >= 1) {
        if (fade.current) window.clearInterval(fade.current);
        fade.current = null;
        done?.();
      }
    }, 50);
  }, []);

  const start = useCallback(() => {
    if (!src || audio.current) return;
    const node = new Audio(src);
    node.loop = true;
    node.volume = 0;
    node.preload = 'auto';
    audio.current = node;
    node
      .play()
      .then(() => {
        setPlaying(true);
        ramp(VOLUME, 1500);
      })
      .catch(() => {
        audio.current = null;
      });
  }, [ramp, src]);

  const finish = useCallback(() => {
    ramp(0, 2500, () => {
      audio.current?.pause();
      setPlaying(false);
    });
  }, [ramp]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (audio.current) audio.current.muted = !m;
      return !m;
    });
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const node = audio.current;
      if (!node || !playing) return;
      if (document.hidden) node.pause();
      else void node.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [playing]);

  useEffect(
    () => () => {
      if (fade.current) window.clearInterval(fade.current);
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  return { start, finish, muted, toggleMute, playing, available: Boolean(src) };
}
