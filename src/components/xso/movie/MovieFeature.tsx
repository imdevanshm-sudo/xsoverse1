'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { soundtrackSrc } from '@/lib/soundtracks';
import { readingMs } from '@/lib/pacing';
import { optIn, playSound } from '@/lib/sound';
import { useSoundtrack } from '@/components/xso/stage/useSoundtrack';
import type { MovieLayers, XsoData } from '@/types/xso';
import { useStage } from '@/components/xso/movie/useStage';
import { OpeningSlate } from '@/components/xso/movie/OpeningSlate';
import { EndScreen } from '@/components/xso/movie/EndScreen';
import { SoundtrackCredit } from '@/components/xso/song/OurSong';
import {
  AuditScene,
  LetterScene,
  PhotoScene,
  ReceiptScene,
  Subtitle,
  montageFallback,
  montagePhotos,
  type SceneProps,
} from '@/components/xso/movie/scenes';

export interface MovieFrame {
  id: string;
  label: string;
  /** Which scene it plays: 0–3 are receipt, audit, photos, letter; then the soundtrack credit. */
  scene: number;
}

/** "Our Song": a credit scene that holds until the viewer moves on, so the song isn't cut off. */
export const SOUNDTRACK_SCENE = 4;

const SWIPE_PX = 40;
/** The projector's flutter plays out before the score fades in under it. */
const MUSIC_AFTER_MS = 600;
/** The score fades out over this long once "Fin" comes up. */
const MUSIC_OUT_MS = 2000;

/**
 * How long each scene holds before the film moves on: the receipt's lines and the scene's caption
 * at a comfortable reading pace, more photos get more time, and the letter waits for its reader.
 */
function sceneMs(
  scene: number,
  data: XsoData,
  movie: MovieLayers,
  photos: number,
): number | null {
  const caption = readingMs(movie.scenes[scene]?.caption ?? '');
  if (scene === 0) {
    const lines = readingMs(
      data.lineItems
        .slice(0, 5)
        .map((item) => `${item.description} ${item.price}`)
        .join(' '),
    );
    return Math.min(16000, Math.max(7000, 3000 + lines + caption));
  }
  if (scene === 1) {
    const rows = Object.keys(data.auditMetrics).length;
    return Math.min(15000, Math.max(7500, 4500 + rows * 950 + caption));
  }
  if (scene === 2) {
    const slides = Math.max(photos, 1);
    return Math.min(32000, Math.max(8000, slides * 5200));
  }
  return null;
}

/** The recipient's Movie Box: a fitted cinematic stage that plays one scene at a time. */
export const MovieFeature = memo(function MovieFeature({
  data,
  movie,
  frames,
  focusIndex,
  onChange,
  cta = false,
}: {
  data: XsoData;
  movie: MovieLayers;
  frames: MovieFrame[];
  focusIndex?: number;
  onChange?: (index: number, label: string) => void;
  /** The real gift (not a studio draft): the end screen offers Make one back and sharing. */
  cta?: boolean;
}) {
  const reduce = Boolean(useReducedMotion());
  const [room, stage] = useStage<HTMLDivElement>();
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  /** The title card stays over the first scene until its opening has played out. */
  const [slateGone, setSlateGone] = useState(false);
  const [finished, setFinished] = useState(false);
  const startTimer = useRef<number | null>(null);
  const music = useSoundtrack(soundtrackSrc(movie.soundtrack));
  const startMusic = music.start;
  const play = useCallback(() => {
    optIn();
    playSound('movie.start');
    startMusic(MUSIC_AFTER_MS);
    startTimer.current = window.setTimeout(() => setStarted(true), reduce ? 0 : 450);
  }, [reduce, startMusic]);
  useEffect(() => () => window.clearTimeout(startTimer.current ?? undefined), []);
  const hideSlate = useCallback(() => setSlateGone(true), []);
  const count = frames.length;
  const frame = frames[Math.min(index, count - 1)];

  const goTo = useCallback(
    (next: number) => {
      if (next >= count) {
        setFinished(true);
        return;
      }
      setFinished(false);
      const clamped = Math.max(0, next);
      setIndex(clamped);
      onChange?.(clamped, frames[clamped].label);
    },
    [count, frames, onChange],
  );

  const finishMusic = music.finish;
  useEffect(() => {
    if (!finished) return;
    playSound('movie.fin');
    finishMusic(MUSIC_OUT_MS);
  }, [finished, finishMusic]);
  /** A splice tick each time the reel cuts to another scene. */
  const cut = useRef(index);
  useEffect(() => {
    if (cut.current === index) return;
    cut.current = index;
    if (started) playSound('movie.splice');
  }, [index, started]);
  /** Plays on by itself like a film; pause stops it, and reduced motion leaves it to the viewer. */
  const [paused, setPaused] = useState(false);
  /** The tab is in the background: the film holds its place (the sound manager mutes the score). */
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  /** Set when pausing faded the score out, so resuming brings back only what pause stopped. */
  const musicHeld = useRef(false);
  const pausedNow = useRef(false);
  const toggleMusic = music.toggle;
  const musicPlaying = music.playing;
  const togglePause = useCallback(() => {
    const next = !pausedNow.current;
    pausedNow.current = next;
    setPaused(next);
    if (next && musicPlaying) {
      musicHeld.current = true;
      toggleMusic();
    } else if (!next && musicHeld.current) {
      musicHeld.current = false;
      toggleMusic();
    }
  }, [musicPlaying, toggleMusic]);

  const replayMusic = music.replay;
  const replay = useCallback(() => {
    playSound('movie.start');
    musicHeld.current = false;
    pausedNow.current = false;
    setPaused(false);
    replayMusic(MUSIC_AFTER_MS);
    goTo(0);
  }, [goTo, replayMusic]);
  const finish = useCallback(() => setFinished(true), []);

  const photoCount =
    montagePhotos(data, movie).length || montageFallback(data).length || 1;
  useEffect(() => {
    if (!started || finished || paused || hidden || reduce || focusIndex !== undefined) return;
    const ms = sceneMs(frame.scene, data, movie, photoCount);
    if (!ms) return;
    const timer = window.setTimeout(() => goTo(index + 1), ms);
    return () => window.clearTimeout(timer);
  }, [
    data,
    finished,
    focusIndex,
    frame.scene,
    goTo,
    hidden,
    index,
    movie,
    paused,
    photoCount,
    reduce,
    started,
  ]);

  useEffect(() => {
    if (focusIndex === undefined) return;
    setStarted(true);
    setSlateGone(true);
    goTo(focusIndex);
  }, [focusIndex, goTo]);

  /** The reel only moves once Play has started it and until Fin. comes up. */
  const rolling = started && !finished;
  const onKey = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!rolling) return;
      if (e.key === 'ArrowRight') {
        goTo(index + 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        goTo(index - 1);
        e.preventDefault();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        /** A focused button or link keeps Space for itself. */
        if ((e.target as HTMLElement).closest('button, a')) return;
        if (!reduce) togglePause();
        e.preventDefault();
      }
    },
    [goTo, index, reduce, rolling, togglePause],
  );

  const downX = useRef<number | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    /** The Spotify player keeps its taps: its Play button sits in the "next scene" third. */
    if (!rolling || (e.target as HTMLElement).closest('button, a, [data-chrome], [data-spotify]')) {
      downX.current = null;
      return;
    }
    downX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!rolling || downX.current === null) return;
    const startX = downX.current;
    const dx = e.clientX - startX;
    downX.current = null;
    if (Math.abs(dx) >= SWIPE_PX) {
      goTo(index + (dx < 0 ? 1 : -1));
      return;
    }
    /** Tap left / right thirds to step scenes; the centre stays clear for reading. */
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.28) goTo(index - 1);
    else if (x > rect.width * 0.72) goTo(index + 1);
  };

  const props: SceneProps = {
    data,
    movie,
    scene: frame.scene,
    index,
    stage,
    active: !finished,
    paused: paused || hidden,
    reduce,
    onDone: index === count - 1 ? finish : undefined,
  };
  const caption = movie.scenes[frame.scene]?.caption;

  return (
    <section
      ref={room}
      tabIndex={0}
      aria-label="Movie Box"
      aria-roledescription="film"
      onKeyDown={onKey}
      className="movie-feature relative flex h-full w-full touch-pan-y items-center justify-center overflow-hidden bg-[#050203] text-[#fffaf0] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
    >
      {/* Desktop: the framed screen glows faintly into a dark room around it. */}
      {stage.width && !stage.flush ? (
        <div aria-hidden className="movie-room pointer-events-none absolute inset-0" />
      ) : null}
      {stage.width ? (
        <div
          className={`movie-stage relative overflow-hidden bg-[#0b0507] ${stage.flush ? '' : 'shadow-[0_40px_120px_-20px_rgba(0,0,0,0.85)] ring-1 ring-[#fffaf0]/10'}`}
          style={{ width: stage.width, height: stage.height }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {!started ? null : finished ? (
            <EndScreen
              stage={stage}
              reduce={reduce}
              onReplay={replay}
              giftId={data.id}
              recipientName={data.customerName}
              senderName={data.billerName}
              cta={cta}
            />
          ) : (
            <>
              <AnimatePresence initial={false}>
                <motion.article
                  key={index}
                  aria-label={`Scene ${index + 1} of ${count}: ${frame.label}`}
                  className={`absolute inset-0 ${stage.compact ? 'pb-[3.75rem] pt-12' : 'pb-[7.5rem] pt-16'}`}
                  initial={reduce ? false : { opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    reduce
                      ? { opacity: 0, transition: { duration: 0 } }
                      : { opacity: 0, scale: 0.985 }
                  }
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* The sender's still behind the receipt, audit or letter; the photo scene uses its own. */}
                  {frame.scene !== 2 && movie.scenes[frame.scene]?.image ? (
                    <span aria-hidden className="movie-backdrop pointer-events-none absolute inset-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={movie.scenes[frame.scene].image} alt="" className="h-full w-full object-cover" />
                    </span>
                  ) : null}
                  <div className="relative h-full w-full">
                    <SceneBody {...props} />
                  </div>
                </motion.article>
              </AnimatePresence>
              {/* Each cut lets a little warm light leak across the gate; the first scene opens clean. */}
              {reduce || index === 0 ? null : (
                <motion.span
                  key={`cut-${index}`}
                  aria-hidden
                  className="movie-cut pointer-events-none absolute inset-0 z-[12]"
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )}

              {/* Photo scene carries its own per-slide captions so they don't repeat. */}
              {frame.scene !== 2 && frame.scene !== 3 && frame.scene !== SOUNDTRACK_SCENE && caption ? (
                <div
                  className={`pointer-events-none absolute inset-x-0 z-10 px-6 pb-[env(safe-area-inset-bottom,0px)] ${stage.compact ? 'bottom-[3.25rem]' : 'bottom-[4.25rem]'}`}
                >
                  <Subtitle big={stage.big}>{caption}</Subtitle>
                </div>
              ) : null}

              {/* The song credit holds until the viewer moves on, so the song is never cut off. */}
              {frame.scene === SOUNDTRACK_SCENE ? (
                <div
                  className={`absolute inset-x-0 z-[15] flex justify-center px-6 pb-[env(safe-area-inset-bottom,0px)] ${stage.compact ? 'bottom-[3.25rem]' : 'bottom-[4.5rem]'}`}
                >
                  <button
                    type="button"
                    data-movie-hold
                    onClick={() => goTo(index + 1)}
                    className="movie-hold-cue"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : null}

              <nav
                aria-label="Scenes"
                className={`absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 px-3 ${stage.compact ? 'pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]' : 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'}`}
              >
                {reduce ? null : (
                  <button
                    type="button"
                    onClick={togglePause}
                    aria-pressed={paused}
                    aria-label={paused ? 'Resume' : 'Pause'}
                    className="movie-control"
                  >
                    {paused ? (
                      <Play className="h-5 w-5 translate-x-px" aria-hidden />
                    ) : (
                      <Pause className="h-5 w-5" aria-hidden />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  disabled={index === 0}
                  aria-label="Previous scene"
                  className="movie-control"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <ol className="flex items-center gap-1" aria-label="Scene progress">
                  {frames.map((f, i) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`Scene ${i + 1}: ${f.label}`}
                        aria-current={i === index ? 'step' : undefined}
                        className={`grid h-11 place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74] ${count > 5 ? 'w-5' : 'w-6'}`}
                      >
                        <span
                          className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                            i === index ? 'w-4 bg-[#fdba74]' : 'w-1.5 bg-[#fffaf0]/40'
                          }`}
                        />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  aria-label={index === count - 1 ? 'End' : 'Next scene'}
                  className="movie-control"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              </nav>
            </>
          )}
          <span aria-hidden className="movie-key" />
          <span aria-hidden className="film-grain" style={{ zIndex: 25, opacity: 0.05 }} />
          <span aria-hidden className="movie-vignette" />
          <span aria-hidden className="movie-gate" />
          {slateGone ? null : (
            <OpeningSlate
              data={data}
              movie={movie}
              stage={stage}
              reduce={reduce}
              onPlay={play}
              onDone={hideSlate}
            />
          )}
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        Scene {index + 1} of {count}: {frame.label}. {caption}
      </p>
    </section>
  );
});

function SceneBody(props: SceneProps) {
  switch (props.scene) {
    case 0:
      return <ReceiptScene {...props} />;
    case 1:
      return <AuditScene {...props} />;
    case 2:
      return <PhotoScene {...props} />;

    case SOUNDTRACK_SCENE:
      return props.data.song ? (
        <div className="movie-song absolute inset-0 overflow-y-auto">
          <SoundtrackCredit song={props.data.song} big={props.stage.big} />
        </div>
      ) : null;
    default:
      return <LetterScene {...props} />;
  }
}
