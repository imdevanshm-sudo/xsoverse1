'use client';

import { memo, useId, useState } from 'react';
import { Captions, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { RewindLayers } from '@/types/xso';

export interface TapeTrack {
  id: string;
  title: string;
}

/** Track titles as they'd be written on the J-card. */
export const TRACK_TITLES: Record<string, string> = {
  receipt: 'The receipt',
  audit: 'Friendship audit',
  photos: 'Photo booth',
  letter: 'The letter',
  liner: 'Liner notes',
  end: 'Your turn',
};

/** The first half of the tape is Side A, the rest Side B. */
export function sideOf(index: number, count: number): 'A' | 'B' {
  return index < Math.ceil(count / 2) ? 'A' : 'B';
}

/**
 * The cassette's J-card as a little deck: the side and track in play, a progress strip with one
 * segment per track, and the transport. The reels turn while the soundtrack plays.
 */
export const TapePlayer = memo(function TapePlayer({
  tape,
  tracks,
  current,
  playing = false,
  progress = 0,
  available = false,
  muted = false,
  voice = false,
  transcript = '',
  failed = false,
  onToggle,
  onMute,
}: {
  tape: RewindLayers;
  tracks: TapeTrack[];
  /** Index into `tracks` of the card on top. */
  current: number;
  playing?: boolean;
  /** How far through the soundtrack, 0–1. */
  progress?: number;
  /** Whether this tape has a soundtrack at all. */
  available?: boolean;
  muted?: boolean;
  /** The soundtrack is the sender's voice note. */
  voice?: boolean;
  transcript?: string;
  /** The audio couldn't be loaded or played. */
  failed?: boolean;
  onToggle?: () => void;
  onMute?: () => void;
}) {
  const count = tracks.filter((t) => t.id !== 'end').length;
  const bonus = tracks[current]?.id === 'end';
  const side = bonus ? 'B' : sideOf(current, count);
  const sideTitle = side === 'A' ? tape.sideA || 'Side A' : tape.sideB || 'Side B';
  const track = tracks[current];
  const number = bonus ? 'Bonus' : `${String(current + 1).padStart(2, '0')}`;
  const Icon = playing ? Pause : Play;
  const what = voice ? 'voice note' : 'tape';
  const [reading, setReading] = useState(false);
  const transcriptId = useId();

  return (
    <div className="tape-player relative z-20 mb-2 w-full" role="group" aria-label="Mixtape">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!available}
          aria-label={available ? `${playing ? 'Pause' : 'Play'} the ${what}` : 'No soundtrack'}
          title={available ? undefined : 'This tape has no soundtrack'}
          className="tape-player__play grid h-12 w-12 shrink-0 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdba74] disabled:opacity-40"
        >
          <Icon className={`h-5 w-5 ${playing ? '' : 'translate-x-[1px]'}`} aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-receipt text-[11px] uppercase tracking-[0.2em] text-[#7a4a2c]">
            <span className="tape-player__side" aria-label={`Side ${side}`}>
              {side}
            </span>
            <span className="truncate">
              {sideTitle}
              {tape.tapeDate ? ` · ${tape.tapeDate}` : ''}
            </span>
          </p>
          <p className="mt-0.5 truncate font-hand text-[22px] leading-none text-[#2d1b22]">
            <span className="mr-1.5 font-receipt text-[12px] tracking-[0.1em] text-[#b45309]">
              {number}
            </span>
            {track?.title}
          </p>
        </div>

        <span
          aria-hidden
          className={`tape-player__reels ${playing ? 'is-playing' : ''} ${transcript ? 'max-[399px]:hidden' : ''}`}
        >
          <i />
          <i />
        </span>

        {transcript ? (
          <button
            type="button"
            onClick={() => setReading((r) => !r)}
            aria-expanded={reading}
            aria-controls={transcriptId}
            aria-label="Read along"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b45309] ${reading ? 'bg-[#7a4a2c] text-[#fbf1dc]' : 'text-[#7a4a2c] hover:bg-black/5'}`}
          >
            <Captions className="h-5 w-5" aria-hidden />
          </button>
        ) : null}

        {available ? (
          <button
            type="button"
            onClick={onMute}
            aria-pressed={muted}
            aria-label={`${muted ? 'Unmute' : 'Mute'} the ${what}`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#7a4a2c] transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b45309]"
          >
            {muted ? (
              <VolumeX className="h-5 w-5" aria-hidden />
            ) : (
              <Volume2 className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <div
        className="mt-2 flex gap-1"
        role="progressbar"
        aria-label="Tracks"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={Math.min(current + 1, count)}
        aria-valuetext={bonus ? 'Bonus track' : `Track ${current + 1} of ${count}`}
      >
        {tracks
          .filter((t) => t.id !== 'end')
          .map((t, i) => (
            <span
              key={t.id}
              className={`tape-player__seg ${i < current || bonus ? 'is-done' : ''} ${
                i === current && !bonus ? 'is-current' : ''
              }`}
            />
          ))}
      </div>
      {available ? (
        <div aria-hidden className="tape-player__time">
          <i style={{ transform: `scaleX(${progress})` }} />
        </div>
      ) : null}
      {failed ? (
        <p
          role="status"
          className="mt-1.5 font-receipt text-[11px] tracking-[0.06em] text-[#9a3412]"
        >
          The {what} won&apos;t play right now. The cards still work without it.
        </p>
      ) : null}
      {transcript && reading ? (
        <div
          id={transcriptId}
          className="tape-player__transcript"
          role="region"
          aria-label="Transcript"
        >
          <p className="font-receipt text-[10px] uppercase tracking-[0.2em] text-[#9a6a4c]">
            Read along
          </p>
          <p className="mt-1 whitespace-pre-line font-hand text-[22px] leading-[1.15] text-[#2d1b22]">
            {transcript}
          </p>
        </div>
      ) : null}
    </div>
  );
});
