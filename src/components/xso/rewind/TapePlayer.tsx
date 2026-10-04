'use client';

import { memo } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
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

  return (
    <div className="tape-player relative z-10 mb-2 w-full" role="group" aria-label="Mixtape">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!available}
          aria-label={available ? (playing ? 'Pause the tape' : 'Play the tape') : 'No soundtrack'}
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

        <span aria-hidden className={`tape-player__reels ${playing ? 'is-playing' : ''}`}>
          <i />
          <i />
        </span>

        {available ? (
          <button
            type="button"
            onClick={onMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute the tape' : 'Mute the tape'}
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
    </div>
  );
});
