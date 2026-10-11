'use client';

import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Disc3, Music2, X } from 'lucide-react';
import { spotifyEmbedUrl, type SongAttachment } from '@/lib/spotify';

/** Spotify's compact player; the full-size one needs 352px. */
const PLAYER_HEIGHT = 152;

/**
 * The Spotify player, mounted only once it nears the viewport so a keepsake with a song costs
 * nothing until the recipient gets there. A skeleton holds its place while it loads.
 */
export const SpotifyPlayer = memo(function SpotifyPlayer({
  song,
  className = '',
}: {
  song: SongAttachment;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, { once: true, margin: '200px' });
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={box}
      className={`relative w-full overflow-hidden rounded-xl bg-[#121212] ${className}`}
      style={{ height: PLAYER_HEIGHT }}
    >
      {loaded ? null : <PlayerSkeleton song={song} />}
      {near ? (
        <iframe
          title={`Spotify player: ${song.title}`}
          src={spotifyEmbedUrl(song)}
          width="100%"
          height={PLAYER_HEIGHT}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}
    </div>
  );
});

function PlayerSkeleton({ song }: { song: SongAttachment }) {
  return (
    <div aria-hidden className="absolute inset-0 flex animate-pulse items-center gap-3 p-4">
      {song.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={song.thumbnail} alt="" className="h-[88px] w-[88px] rounded-lg object-cover" />
      ) : (
        <span className="h-[88px] w-[88px] rounded-lg bg-white/10" />
      )}
      <span className="grid flex-1 gap-2">
        <span className="h-3.5 w-3/4 rounded bg-white/15" />
        <span className="h-3 w-1/2 rounded bg-white/10" />
        <span className="mt-3 h-8 w-8 rounded-full bg-white/15" />
      </span>
    </div>
  );
}

const credit = (song: SongAttachment) => [song.title, song.artist].filter(Boolean).join(' · ');

/** Loop: an extra card in the pile, the song pressed onto it like a sleeve. */
export const LoopSongCard = memo(function LoopSongCard({ song }: { song: SongAttachment }) {
  return (
    <article className="relative mx-auto w-full max-w-[340px] p-3 text-[#2d1b22]">
      <p className="font-receipt text-[10px] uppercase tracking-[0.22em] text-[#9a6a7e]">
        ♪ Our song
      </p>
      <h3 className="mt-1 font-serif text-[22px] font-semibold leading-tight">{song.title}</h3>
      {song.artist ? <p className="text-[14px] text-[#7a5563]">{song.artist}</p> : null}
      {song.dedication ? (
        <p className="mt-2 font-hand text-[21px] leading-[1.1] text-[#b4234a]">
          “{song.dedication}”
        </p>
      ) : null}
      <SpotifyPlayer song={song} className="mt-3" />
    </article>
  );
});

/** Rewind: a Side A tape label, the dedication written underneath as a liner note. */
export const SideATape = memo(function SideATape({ song }: { song: SongAttachment }) {
  return (
    <article className="relative mx-auto w-full max-w-[340px] p-3 text-[#2d1b22]">
      <div className="rounded-md border border-[#2d1b22]/15 bg-[#fffaf0] px-3 py-2.5 shadow-[inset_0_-6px_0_#f9a8d4]">
        <p className="flex items-baseline justify-between font-receipt text-[10px] uppercase tracking-[0.22em] text-[#9a6a7e]">
          <span>Side A</span>
          <span>Dolby · 90 min</span>
        </p>
        <p className="mt-1 truncate font-hand text-[26px] leading-none">{song.title}</p>
        {song.artist ? (
          <p className="mt-0.5 truncate font-receipt text-[11px] uppercase tracking-[0.14em] text-[#7a5563]">
            {song.artist}
          </p>
        ) : null}
      </div>
      {song.dedication ? (
        <div className="mt-3 border-l-2 border-[#ec4899]/50 pl-3">
          <p className="font-receipt text-[9.5px] uppercase tracking-[0.2em] text-[#9a6a7e]">
            Liner note
          </p>
          <p className="font-hand text-[20px] leading-[1.1] text-[#3a2530]">{song.dedication}</p>
        </div>
      ) : null}
      <SpotifyPlayer song={song} className="mt-3" />
    </article>
  );
});

/** Accordion: its own fold, just before the note. */
export function SongFold({
  song,
  label,
  wide,
}: {
  song: SongAttachment;
  label: ReactNode;
  wide: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      {label}
      <p
        className={`mt-1.5 truncate font-serif font-semibold leading-tight ${wide ? 'text-[28px]' : 'text-[20px]'}`}
      >
        {song.title}
      </p>
      {song.artist ? (
        <p className={`truncate opacity-70 ${wide ? 'text-[16px]' : 'text-[13px]'}`}>
          {song.artist}
        </p>
      ) : null}
      {song.dedication ? (
        <p
          className={`mt-1.5 line-clamp-2 font-hand leading-[1.1] text-[#b4234a] ${wide ? 'text-[24px]' : 'text-[18px]'}`}
        >
          {song.dedication}
        </p>
      ) : null}
      <div className="mt-auto pt-2">
        <SpotifyPlayer song={song} />
      </div>
    </div>
  );
}

/** Movie Box: the soundtrack credit, rolled just before the last scene. */
export function SoundtrackCredit({ song, big }: { song: SongAttachment; big: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-24 text-center">
      <p className="font-receipt text-[11px] uppercase tracking-[0.34em] text-[#fdba74]">
        Original soundtrack
      </p>
      <p
        className={`mt-3 font-serif font-semibold leading-tight text-[#fffaf0] ${big ? 'text-[40px]' : 'text-[28px]'}`}
      >
        “{song.title}”
      </p>
      {song.artist ? (
        <p className={`mt-1 text-[#fffaf0]/70 ${big ? 'text-[18px]' : 'text-[15px]'}`}>
          performed by {song.artist}
        </p>
      ) : null}
      {song.dedication ? (
        <p className={`mt-3 italic text-[#fffaf0]/85 ${big ? 'text-[18px]' : 'text-[15px]'}`}>
          {song.dedication}
        </p>
      ) : null}
      <SpotifyPlayer song={song} className="mt-5 max-w-[420px]" />
    </div>
  );
}

/** Scrapbook: a record sleeve on the desk; tapping it opens the player in a lightbox. */
export const RecordSleeve = memo(function RecordSleeve({ song }: { song: SongAttachment }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Play our song: ${credit(song)}`}
        className="group relative block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ec4899]"
      >
        <span className="relative block aspect-square w-full overflow-visible">
          <span
            aria-hidden
            className="absolute inset-y-[6%] right-[-14%] aspect-square rounded-full bg-[radial-gradient(circle,#2b2b2b_0_14%,#0d0d0d_15%_33%,#1c1c1c_34%_35%,#0d0d0d_36%_100%)] shadow-md transition-transform duration-500 group-hover:translate-x-[8%]"
          />
          <span className="desk-paper absolute inset-0 overflow-hidden">
            {song.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={song.thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center bg-[#1db954]/20 text-[#1db954]">
                <Music2 className="h-1/3 w-1/3" aria-hidden />
              </span>
            )}
          </span>
        </span>
        <span className="mt-1 block truncate font-hand text-[17px] leading-none text-[#2d1b22]">
          our song ♪
        </span>
      </button>
      <SongLightbox song={song} open={open} onClose={() => setOpen(false)} />
    </>
  );
});

function SongLightbox({
  song,
  open,
  onClose,
}: {
  song: SongAttachment;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Our song"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-[420px] rounded-2xl bg-[#fffaf0] p-4 text-[#2d1b22] shadow-2xl"
            initial={reduce ? false : { y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-[#7a5563] hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ec4899]"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <p className="flex items-center gap-1.5 font-receipt text-[10px] uppercase tracking-[0.22em] text-[#9a6a7e]">
              <Disc3 className="h-3.5 w-3.5" aria-hidden /> Our song
            </p>
            <p className="mt-1 pr-10 font-serif text-[22px] font-semibold leading-tight">
              {song.title}
            </p>
            {song.artist ? <p className="text-[14px] text-[#7a5563]">{song.artist}</p> : null}
            {song.dedication ? (
              <p className="mt-2 font-hand text-[21px] leading-[1.1] text-[#b4234a]">
                “{song.dedication}”
              </p>
            ) : null}
            <SpotifyPlayer song={song} className="mt-3" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
