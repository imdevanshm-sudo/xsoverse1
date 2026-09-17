'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import type { XsoData } from '@/types/xso';
import {
  CoffeeStain,
  DateStamp,
  HandNote,
  PaperGrain,
} from '@/components/xso/paper/PaperCraft';
import { ScratchReveal } from '@/components/xso/paper/ScratchReveal';

export interface Side4BirthdayCardProps {
  data: XsoData;
}

export function Side4BirthdayCard({ data }: Side4BirthdayCardProps) {
  const stamp = data.timestamp.split(/[\s/]/)[0] || '03.15';

  return (
    <article
      className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-sm border border-[#e0d8c8] p-5 shadow-2xl"
      style={{
        background: '#fcfaf2',
        boxShadow:
          '0 28px 50px rgba(0,0,0,0.28), 0 12px 22px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.7)',
        transform: 'rotate(2deg)',
      }}
      aria-label="Birthday letter and scratch-off"
    >
      <PaperGrain opacity={0.32} />
      <CoffeeStain className="right-3 top-6" />
      <DateStamp label={`${stamp} · LOVE`} className="bottom-28 right-3" />
      <HandNote className="right-4 top-[42%]" rotate={8}>
        ps. bring snacks
      </HandNote>

      {/* Dog-ear */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-30 h-5 w-5"
        style={{
          background:
            'linear-gradient(135deg, transparent 49%, rgba(0,0,0,0.08) 50%, #e8e2d4 51%)',
        }}
        aria-hidden
      />

      <header className="relative z-10 mb-4 border-b border-[#e0d8c8] pb-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8a7e6e]">
          Warm letter · side 4
        </p>
        <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink">
          Birthday Letter
        </h2>
        <p className="text-sm text-ink/60">
          From {data.billerName} → {data.customerName}
        </p>
      </header>

      <motion.p
        className="relative z-10 mb-5 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {data.birthdayMessage}
      </motion.p>

      <div className="relative z-10 mb-5">
        <VoiceNotePlayer
          label={`${data.billerName} voice note`}
          src={data.voiceNoteUrl}
        />
      </div>

      <div className="relative z-10">
        <p className="mb-2 font-hand text-[13px] text-[#2a4a7a]/75">
          scratch the silver — a little secret
        </p>
        <ScratchReveal
          key={data.scratchOffReward}
          reward={data.scratchOffReward}
        />
      </div>
    </article>
  );
}

function VoiceNotePlayer({ label, src }: { label: string; src?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const bars = [8, 14, 22, 16, 28, 12, 24, 18, 26, 10, 20, 15, 27, 11, 19];

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audioRef.current = audio;
    const onEnded = () => setPlaying(false);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (audio) {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        try {
          await audio.play();
          setPlaying(true);
        } catch {
          setPlaying(true);
        }
      }
      return;
    }
    setPlaying((prev) => !prev);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e0d8c8] bg-white/70 px-3 py-2.5 shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white"
      >
        {playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[10px] uppercase tracking-wide text-ink/55">
          {label}
        </p>
        <div className="mt-1 flex h-8 items-end gap-[3px]" aria-hidden>
          {bars.map((h, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-hotpink/80"
              animate={
                playing
                  ? {
                      height: [h * 0.45, h, h * 0.6, h * 0.9, h * 0.5],
                    }
                  : { height: h * 0.4 }
              }
              transition={
                playing
                  ? {
                      duration: 0.7 + (i % 4) * 0.08,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.04,
                    }
                  : { duration: 0.2 }
              }
              style={{ height: h * 0.4 }}
            />
          ))}
        </div>
      </div>

      <span className="shrink-0 font-mono text-[10px] text-ink/45">
        {playing ? '0:12' : '0:18'}
      </span>
    </div>
  );
}
