'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { attachMedia, mediaElement, optIn, type MediaHandle, type MediaKind } from '@/lib/sound';
import { trackLoudness } from '@/lib/soundtracks';

/** A track that plays once fades out over its last few seconds instead of stopping dead. */
const END_FADE_SECONDS = 3;
const FADE_IN_MS = 1500;

/**
 * A gift's score (or voice note), played through the sound manager. Nothing is fetched until
 * `start()` (or `toggle()`) runs inside a tap, which also counts as opting in to sound. Fades in,
 * stops with the tab, and fades out on `finish()`, or near the end when `loop` is off.
 */
export function useSoundtrack(
  src: string | null,
  { loop = true, kind = 'music' }: { loop?: boolean; kind?: MediaKind } = {},
) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const mix = useRef<MediaHandle | null>(null);
  const ending = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  const fadeIn = useCallback((node: HTMLAudioElement, delayMs = 0) => {
    mix.current?.fade(0, 0);
    ending.current = false;
    return node.play().then(() => {
      setPlaying(true);
      window.setTimeout(() => mix.current?.fade(1, FADE_IN_MS), delayMs);
    });
  }, []);

  /** `delayMs` holds the music under a cue (the projector starting) before it fades in. */
  const start = useCallback(
    (delayMs = 0) => {
      if (!src || audio.current) return;
      optIn();
      const node = mediaElement(src);
      node.loop = loop;
      node.preload = 'auto';
      audio.current = node;
      mix.current = attachMedia(node, kind, trackLoudness(src));
      node.ontimeupdate = () => {
        const duration = node.duration;
        if (!duration || !Number.isFinite(duration)) return;
        setProgress(node.currentTime / duration);
        const left = duration - node.currentTime;
        if (!loop && !ending.current && left <= END_FADE_SECONDS) {
          ending.current = true;
          mix.current?.fade(0, left * 1000);
        }
      };
      node.onended = () => {
        setPlaying(false);
        setProgress(1);
      };
      setFailed(false);
      fadeIn(node, delayMs).catch(() => {
        mix.current?.release();
        mix.current = null;
        audio.current = null;
        setFailed(true);
      });
    },
    [fadeIn, kind, loop, src],
  );

  const finish = useCallback((ms = 2000) => {
    mix.current?.fade(0, ms, () => {
      audio.current?.pause();
      setPlaying(false);
    });
  }, []);

  /** Back to the top, fading in like the first time. */
  const replay = useCallback(
    (delayMs = 0) => {
      const node = audio.current;
      if (!node) return;
      node.currentTime = 0;
      void fadeIn(node, delayMs).catch(() => {});
    },
    [fadeIn],
  );

  /** Play/pause for a visible control; the first press starts the track. */
  const toggle = useCallback(() => {
    const node = audio.current;
    if (!node) return start();
    if (node.paused) {
      optIn();
      if (node.ended) node.currentTime = 0;
      void fadeIn(node).catch(() => setFailed(true));
      return;
    }
    setPlaying(false);
    mix.current?.fade(0, 250, () => node.pause());
  }, [fadeIn, start]);

  useEffect(() => {
    const node = audio.current;
    if (!node) return;
    const sync = () => setPlaying(!node.paused);
    node.addEventListener('pause', sync);
    node.addEventListener('play', sync);
    return () => {
      node.removeEventListener('pause', sync);
      node.removeEventListener('play', sync);
    };
  }, [playing]);

  useEffect(
    () => () => {
      mix.current?.release();
      mix.current = null;
      audio.current = null;
    },
    [],
  );

  return {
    start,
    finish,
    replay,
    toggle,
    playing,
    progress,
    failed,
    available: Boolean(src),
  };
}
