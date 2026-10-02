'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/** Keep in sync with SEGMENT / FADE in scripts/capture-media.mjs. */
const REEL_SEGMENT = 0.72;
const REEL_FADE = 0.15;
const FORMATS = ['Loop', 'Rewind', 'Scrapbook', 'Accordion', 'Movie Box'] as const;

function formatAt(time: number) {
  const step = REEL_SEGMENT - REEL_FADE;
  return Math.min(FORMATS.length - 1, Math.floor((time + REEL_FADE / 2) / step));
}

/** Silent ~3s loop of all five formats in motion; plays only while on screen. */
export const HeroReel = memo(function HeroReel() {
  const reduce = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visible = useInView(frameRef, { margin: '0px 0px -20% 0px' });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible && !reduce) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [visible, reduce]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce) return;
    let raf = 0;
    const tick = () => {
      setIndex(formatAt(video.currentTime));
      raf = video.paused ? 0 : requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    video.addEventListener('playing', start);
    video.addEventListener('seeked', start);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener('playing', start);
      video.removeEventListener('seeked', start);
    };
  }, [reduce]);

  return (
    <div
      ref={frameRef}
      className="relative mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-[#1a0f14] shadow-[0_18px_40px_rgba(0,0,0,.45)]"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster="/reel/poster.webp"
        muted
        loop
        playsInline
        autoPlay={!reduce}
        preload="metadata"
        disablePictureInPicture
        aria-label="Five XSO formats in motion: Loop, Rewind, Scrapbook, Accordion and Movie Box"
      >
        <source src="/reel/xso-reel.webm" type="video/webm" />
        <source src="/reel/xso-reel.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#180e15] via-[#180e15]/70 to-transparent px-4 pb-3 pt-10">
        <p
          className="font-serif text-[1.35rem] font-semibold leading-none text-[#fdf2f8]"
          aria-hidden
        >
          {reduce ? 'Five ways to unfold' : FORMATS[index]}
        </p>
        <ol className="flex gap-1" aria-hidden>
          {FORMATS.map((label, i) => (
            <li
              key={label}
              className={`h-1.5 w-1.5 rounded-full ${i === index && !reduce ? 'bg-[#f9a8d4]' : 'bg-white/25'}`}
            />
          ))}
        </ol>
      </div>
    </div>
  );
});
