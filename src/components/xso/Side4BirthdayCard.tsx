'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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
  /** Drop the paper, tilt and shadow when the host card is the paper. */
  bare?: boolean;
}

export function Side4BirthdayCard({ data, bare = false }: Side4BirthdayCardProps) {
  const stamp = data.timestamp.split(/[\s/]/)[0] || '03.15';
  const voice = (
    <VoiceNotePlayer label={`${data.billerName} voice note`} src={data.voiceNoteUrl} />
  );
  const scratch = (
    <div className="relative z-10">
      <p className={`font-hand text-[13px] text-[#2a4a7a]/75 ${bare ? 'mb-1' : 'mb-2'}`}>
        scratch the silver — a little secret
      </p>
      <ScratchReveal key={data.scratchOffReward} reward={data.scratchOffReward} compact={bare} />
    </div>
  );

  return (
    <article
      className={
        bare
          ? 'relative mx-auto w-full max-w-[340px] p-3'
          : 'relative mx-auto w-full max-w-[340px] overflow-hidden rounded-sm border border-[#e0d8c8] p-5 shadow-2xl'
      }
      style={
        bare
          ? undefined
          : {
              background: '#fcfaf2',
              boxShadow:
                '0 28px 50px rgba(0,0,0,0.28), 0 12px 22px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.7)',
              transform: 'rotate(2deg)',
            }
      }
      aria-label="Birthday letter and scratch-off"
    >
      {bare ? null : <PaperGrain opacity={0.32} />}
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

      <header
        className={`relative z-10 border-b border-[#e0d8c8] ${bare ? 'mb-2.5 pb-2' : 'mb-4 pb-3'}`}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8a7e6e]">
          Warm letter · side 4
        </p>
        <h2
          className={`mt-1 font-display font-extrabold tracking-tight text-ink ${bare ? 'text-lg' : 'text-xl'}`}
        >
          Birthday Letter
        </h2>
        <p className="text-sm text-ink/60">
          From {data.billerName} → {data.customerName}
        </p>
      </header>

      <p
        className={`paper-fade-in relative z-10 whitespace-pre-wrap font-sans text-ink ${
          bare ? 'mb-3 text-[14px] leading-snug' : 'mb-5 text-[15px] leading-relaxed'
        }`}
      >
        {data.birthdayMessage}
      </p>

      {/* In the deck the foil comes first so it is visible without scrolling. */}
      {bare ? (
        <>
          {scratch}
          <div className="relative z-10 mt-3">{voice}</div>
        </>
      ) : (
        <>
          <div className="relative z-10 mb-5">{voice}</div>
          {scratch}
        </>
      )}
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
        <div
          className={`vn-bars mt-1 flex h-8 items-end gap-[3px] ${playing ? 'is-playing' : ''}`}
          aria-hidden
        >
          {bars.map((h, i) => (
            <span
              key={i}
              className="vn-bar w-[3px] rounded-full bg-hotpink/80"
              style={
                {
                  height: h,
                  '--vn-dur': `${700 + (i % 4) * 80}ms`,
                  '--vn-delay': `${i * 40}ms`,
                } as CSSProperties
              }
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
