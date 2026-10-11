'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Music2 } from 'lucide-react';
import { SONG_LIMITS, isSpotifyShortLink, parseSpotify, type SongAttachment } from '@/lib/spotify';

const TYPE_LABEL: Record<SongAttachment['type'], string> = {
  track: 'Song',
  album: 'Album',
  playlist: 'Playlist',
  episode: 'Podcast episode',
};

type Check = { state: 'idle' | 'checking' } | { state: 'error'; message: string };

/**
 * The "Our Song" add-on's fields: a Spotify link, checked by the server (which also fetches the
 * title, artist and cover for the preview), and an optional one-line dedication.
 */
export function OurSongFields({
  song,
  onSong,
}: {
  song: SongAttachment | undefined;
  onSong: (song: SongAttachment | undefined) => void;
}) {
  const [link, setLink] = useState(song?.url ?? '');
  const [check, setCheck] = useState<Check>({ state: 'idle' });
  const dedication = song?.dedication ?? '';
  const dedicationRef = useRef(dedication);
  dedicationRef.current = dedication;
  const onSongRef = useRef(onSong);
  onSongRef.current = onSong;
  const checkedRef = useRef(song?.url ?? '');

  useEffect(() => {
    const raw = link.trim();
    if (raw === checkedRef.current) return;
    if (!raw) {
      checkedRef.current = '';
      setCheck({ state: 'idle' });
      onSongRef.current(undefined);
      return;
    }
    checkedRef.current = '';
    if (!parseSpotify(raw) && !isSpotifyShortLink(raw)) {
      setCheck({
        state: 'error',
        message: 'That isn’t a Spotify link. Copy it from Share → Copy link in Spotify.',
      });
      onSongRef.current(undefined);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCheck({ state: 'checking' });
      try {
        const response = await fetch('/api/validate-spotify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => ({}))) as {
          song?: SongAttachment;
          error?: string;
        };
        if (!response.ok || !body.song) {
          setCheck({ state: 'error', message: body.error ?? 'We couldn’t check that link.' });
          onSongRef.current(undefined);
          return;
        }
        checkedRef.current = raw;
        setCheck({ state: 'idle' });
        onSongRef.current({ ...body.song, dedication: dedicationRef.current });
      } catch {
        if (controller.signal.aborted) return;
        setCheck({ state: 'error', message: 'We couldn’t reach Spotify. Try again.' });
        onSongRef.current(undefined);
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [link]);

  const input =
    'w-full rounded-xl border border-white/15 bg-[#180e15] px-3 py-2.5 text-[16px] text-[#fdf2f8] placeholder:text-[#7f5466] focus:border-[#ec4899] focus:outline-none';
  const field = 'font-receipt text-[11px] uppercase tracking-[0.14em] text-[#c99aae]';

  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5">
        <span className={field}>Paste a Spotify link</span>
        <input
          className={input}
          value={link}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          maxLength={SONG_LIMITS.input}
          placeholder="https://open.spotify.com/track/..."
          aria-invalid={check.state === 'error'}
          onChange={(e) => setLink(e.target.value)}
        />
      </label>
      {check.state === 'checking' ? (
        <p className="flex items-center gap-2 text-[12.5px] text-[#c99aae]" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Checking with Spotify…
        </p>
      ) : check.state === 'error' ? (
        <p role="alert" className="text-[12.5px] text-[#fda4af]">
          {check.message}
        </p>
      ) : null}
      {song && check.state !== 'error' ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#120a10] p-2.5">
          {song.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.thumbnail}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#1db954]/15 text-[#1db954]">
              <Music2 className="h-6 w-6" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-receipt text-[10px] uppercase tracking-[0.16em] text-[#1db954]">
              ✓ {TYPE_LABEL[song.type]} on Spotify
            </p>
            <p className="truncate text-[14.5px] font-semibold text-[#fdf2f8]">{song.title}</p>
            {song.artist ? (
              <p className="truncate text-[12.5px] text-[#c99aae]">{song.artist}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <label className="grid gap-1.5">
        <span className={`flex justify-between gap-2 ${field}`}>
          <span>Why this song? (optional)</span>
          <span className="tabular-nums">
            {dedication.length}/{SONG_LIMITS.dedication}
          </span>
        </span>
        <input
          className={`${input} font-hand !text-[19px]`}
          value={dedication}
          maxLength={SONG_LIMITS.dedication}
          placeholder="the one we screamed on every road trip"
          disabled={!song}
          onChange={(e) => song && onSong({ ...song, dedication: e.target.value })}
        />
      </label>
    </div>
  );
}
