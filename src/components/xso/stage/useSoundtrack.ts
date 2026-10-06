'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME = 0.6;
/** A track that plays once fades out over its last few seconds instead of stopping dead. */
const END_FADE_SECONDS = 3;

/**
 * A gift's score. Nothing is fetched until `start()` (or `toggle()`) runs inside a tap, which is
 * also what lets the browser play audio. Fades in, pauses with the tab, and fades out on
 * `finish()`, or near the end when `loop` is off.
 */
export function useSoundtrack(src: string | null, { loop = true }: { loop?: boolean } = {}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef<number | null>(null);
  const ending = useRef(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  const ramp = useCallback((to: number, ms: number, done?: () => void) => {
    const node = audio.current;
    if (!node) return;
    if (fade.current) window.clearInterval(fade.current);
    const from = node.volume;
    const started = performance.now();
    fade.current = window.setInterval(() => {
      const t = ms > 0 ? Math.min(1, (performance.now() - started) / ms) : 1;
      node.volume = from + (to - from) * t;
      if (t >= 1) {
        if (fade.current) window.clearInterval(fade.current);
        fade.current = null;
        done?.();
      }
    }, 50);
  }, []);

  const fadeIn = useCallback(
    (node: HTMLAudioElement) => {
      node.volume = 0;
      ending.current = false;
      return node.play().then(() => {
        setPlaying(true);
        ramp(VOLUME, 1500);
      });
    },
    [ramp],
  );

  const start = useCallback(() => {
    if (!src || audio.current) return;
    const node = new Audio(src);
    node.loop = loop;
    node.preload = 'auto';
    node.muted = muted;
    audio.current = node;
    node.ontimeupdate = () => {
      const duration = node.duration;
      if (!duration || !Number.isFinite(duration)) return;
      setProgress(node.currentTime / duration);
      const left = duration - node.currentTime;
      if (!loop && !ending.current && left <= END_FADE_SECONDS) {
        ending.current = true;
        ramp(0, left * 1000);
      }
    };
    node.onended = () => {
      setPlaying(false);
      setProgress(1);
    };
    setFailed(false);
    fadeIn(node).catch(() => {
      audio.current = null;
      setFailed(true);
    });
  }, [fadeIn, loop, muted, ramp, src]);

  const finish = useCallback(() => {
    ramp(0, 2500, () => {
      audio.current?.pause();
      setPlaying(false);
    });
  }, [ramp]);

  /** Back to the top, fading in like the first time. */
  const replay = useCallback(() => {
    const node = audio.current;
    if (!node) return;
    node.currentTime = 0;
    void fadeIn(node).catch(() => {});
  }, [fadeIn]);

  /** Play/pause for a visible control; the first press starts the track. */
  const toggle = useCallback(() => {
    const node = audio.current;
    if (!node) return start();
    if (node.paused) {
      if (node.ended) node.currentTime = 0;
      void fadeIn(node).catch(() => setFailed(true));
      return;
    }
    setPlaying(false);
    ramp(0, 250, () => node.pause());
  }, [fadeIn, ramp, start]);

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

  return {
    start,
    finish,
    replay,
    toggle,
    muted,
    toggleMute,
    playing,
    progress,
    failed,
    available: Boolean(src),
  };
}
