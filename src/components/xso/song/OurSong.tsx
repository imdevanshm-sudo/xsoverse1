'use client';

import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Disc3, Music2, X } from 'lucide-react';
import { hush } from '@/lib/sound';
import { spotifyEmbedUrl, type SongAttachment } from '@/lib/spotify';
import { useActive } from '@/components/xso/stage/ActiveScope';

/** Spotify's compact player; the full-size one needs 352px. */
const PLAYER_HEIGHT = 152;
/** Past this, a player that hasn't loaded (offline, blocked, Spotify down) gives way to a card. */
const EMBED_TIMEOUT_MS = 12_000;

/**
 * The Spotify player, mounted only once it nears the viewport so a keepsake with a song costs
 * nothing until the recipient gets there. A skeleton holds its place while it loads; if it never
 * does, a plain card with the cover and a link takes over. While it's in front and on screen the
 * app's own music and effects step aside, since the mixer can't reach into Spotify's frame.
 */
export const SpotifyPlayer = memo(function SpotifyPlayer({
  song,
  className = '',
  guard = true,
}: {
  song: SongAttachment;
  className?: string;
  /**
   * Spotify's frame swallows every touch, so a swipe that starts on it never reaches the deck.
   * A clear cover keeps swipes with the deck until a tap hands the player over.
   */
  guard?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, { once: true, margin: '200px' });
  const onScreen = useInView(box, { amount: 0.5 });
  const active = useActive();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [unlocked, setUnlocked] = useState(!guard);
  const press = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (guard && !active) setUnlocked(false);
  }, [guard, active]);
  /** Spotify's player is heavy; a card waiting in the stack shouldn't load it during the unwrap. */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (near && active) setArmed(true);
  }, [near, active]);
  const covered = guard && !unlocked && armed && state !== 'failed';

  useEffect(() => {
    if (!armed || state !== 'loading') return;
    const timer = window.setTimeout(() => setState('failed'), EMBED_TIMEOUT_MS);
    /** A frame "loads" even when it couldn't reach Spotify; offline, that's the browser's error page. */
    const offline = () => setState('failed');
    if (!navigator.onLine) offline();
    window.addEventListener('offline', offline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('offline', offline);
    };
  }, [armed, state]);

  /**
   * Spotify's frame doesn't say when it's playing. Once the recipient has reached into it (turned
   * it on, or clicked inside, which moves focus to the frame), assume the song may be playing and
   * keep the app quiet for as long as the player exists, even after its card goes back in the pile.
   */
  const frame = useRef<HTMLIFrameElement>(null);
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    if (guard && unlocked) setEngaged(true);
  }, [guard, unlocked]);
  useEffect(() => {
    if (engaged || !armed) return;
    const onBlur = () =>
      window.setTimeout(() => {
        if (document.activeElement === frame.current) setEngaged(true);
      }, 0);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [armed, engaged]);

  const hushing = state !== 'failed' && (engaged || (onScreen && active));
  useEffect(() => {
    if (!hushing) return;
    hush(true);
    return () => hush(false);
  }, [hushing]);

  /**
   * The cover's one tap does what the recipient meant: turn the player on and start the song, by
   * the toggle message Spotify's embed listens for. If a browser won't let it start, the player is
   * on now and their next tap on Spotify's own Play does.
   */
  const turnOn = () => {
    setUnlocked(true);
    if (state === 'ready') {
      frame.current?.contentWindow?.postMessage({ command: 'toggle' }, 'https://open.spotify.com');
    }
  };

  return (
    <div className={className} data-spotify>
      {state === 'failed' ? (
        <SongFallback song={song} />
      ) : (
        <div
          ref={box}
          className="relative w-full overflow-hidden rounded-xl bg-[#121212]"
          style={{ height: PLAYER_HEIGHT }}
        >
          {state === 'ready' ? null : <PlayerSkeleton song={song} />}
          {armed ? (
            <iframe
              ref={frame}
              title={`Spotify player: ${song.title}`}
              src={spotifyEmbedUrl(song)}
              width="100%"
              height={PLAYER_HEIGHT}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() =>
                setState((s) => (s === 'loading' ? (navigator.onLine ? 'ready' : 'failed') : s))
              }
              onError={() => setState('failed')}
              className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : null}
          {covered ? (
            // A div, not a button: the decks ignore drags that start on buttons.
            <div
              role="button"
              tabIndex={0}
              aria-label={`Play ${credit(song)} on Spotify`}
              className="absolute inset-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1db954]"
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                e.stopPropagation();
                turnOn();
              }}
              onPointerDown={(e) => {
                press.current = { x: e.clientX, y: e.clientY };
              }}
              onClick={(e) => {
                const start = press.current;
                press.current = null;
                const moved = start
                  ? Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10
                  : false;
                if (moved) return;
                e.stopPropagation();
                turnOn();
              }}
            />
          ) : null}
        </div>
      )}
      {state === 'failed' ? null : (
        <p className="mt-1.5 text-[11.5px] leading-snug opacity-70">
          Tap play. Full songs need a Spotify login; otherwise you&apos;ll hear a preview.
        </p>
      )}
      <OpenInSpotify song={song} />
    </div>
  );
});

function OpenInSpotify({ song }: { song: SongAttachment }) {
  return (
    <a
      href={song.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#1db954] px-4 text-[13px] font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1db954]"
    >
      <Music2 className="h-4 w-4" aria-hidden /> Open in Spotify
    </a>
  );
}

/** When the player can't load: the cover, the title and artist, and the link still work. */
function SongFallback({ song }: { song: SongAttachment }) {
  /** Offline, the cover can't load either; the music tile stands in rather than a broken image. */
  const [coverFailed, setCoverFailed] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#121212] p-3 text-white">
      {song.thumbnail && !coverFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={song.thumbnail}
          alt={`Cover of ${song.title}`}
          onError={() => setCoverFailed(true)}
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[#1db954]/20 text-[#1db954]">
          <Music2 className="h-7 w-7" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold">{song.title}</p>
        {song.artist ? <p className="truncate text-[13px] text-white/70">{song.artist}</p> : null}
        <p className="mt-0.5 text-[11.5px] text-white/60">
          The player didn&apos;t load. Open it in Spotify instead.
        </p>
      </div>
    </div>
  );
}

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
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain" data-no-drag>
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
        Dedicated to you
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
            <SpotifyPlayer song={song} className="mt-3" guard={false} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
