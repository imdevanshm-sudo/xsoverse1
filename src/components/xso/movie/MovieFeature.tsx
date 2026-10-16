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

/** How long each scene holds before the film moves on; longer copy and more photos get more time. */
function sceneMs(
  scene: number,
  data: XsoData,
  movie: MovieLayers,
  photos: number,
): number | null {
  const caption = movie.scenes[scene]?.caption?.length ?? 0;
  if (scene === 0) {
    const lines = data.lineItems
      .slice(0, 5)
      .reduce((n, item) => n + item.description.length + item.price.length, 0);
    return Math.min(14000, Math.max(6500, 4500 + lines * 28 + caption * 18));
  }
  if (scene === 1) {
    const rows = Object.keys(data.auditMetrics).length;
    return Math.min(13000, Math.max(7500, 5200 + rows * 950 + caption * 15));
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
  const replayMusic = music.replay;
  const replay = useCallback(() => {
    playSound('movie.start');
    replayMusic(MUSIC_AFTER_MS);
    goTo(0);
  }, [goTo, replayMusic]);
  const finish = useCallback(() => setFinished(true), []);

  /** Plays on by itself like a film; pause stops it, and reduced motion leaves it to the viewer. */
  const [paused, setPaused] = useState(false);
  const photoCount =
    montagePhotos(data, movie).length || montageFallback(data).length || 1;
  useEffect(() => {
    if (!started || finished || paused || reduce || focusIndex !== undefined) return;
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
    goTo(focusIndex);
  }, [focusIndex, goTo]);

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowRight') {
        goTo(index + 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        goTo(index - 1);
        e.preventDefault();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (started && !finished) setPaused((p) => !p);
        e.preventDefault();
      }
    },
    [finished, goTo, index, started],
  );

  const downX = useRef<number | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, [data-chrome]')) {
      downX.current = null;
      return;
    }
    downX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (downX.current === null) return;
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
      {/* Desktop: a blurred, dimmed copy of the scene fills the room behind the framed stage. */}
      {stage.width && !stage.flush && started && !finished ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-[-12%] scale-110 opacity-45 blur-3xl saturate-75">
            <SceneBody {...props} />
          </div>
          <div className="absolute inset-0 bg-[#050203]/6" />
        </div>
      ) : null}
      {stage.width ? (
        <div
          className={`movie-stage relative overflow-hidden bg-[#0b0507] ${stage.flush ? '' : 'shadow-[0_40px_120px_-20px_rgba(0,0,0,0.85)] ring-1 ring-[#fffaf0]/10'}`}
          style={{ width: stage.width, height: stage.height }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {!started ? (
            <OpeningSlate data={data} stage={stage} reduce={reduce} onPlay={play} />
          ) : finished ? (
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
                  className="absolute inset-0 pb-[7.5rem]"
                  initial={reduce ? false : { opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    reduce
                      ? { opacity: 0, transition: { duration: 0 } }
                      : { opacity: 0, scale: 0.985 }
                  }
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SceneBody {...props} />
                </motion.article>
              </AnimatePresence>
              {reduce ? null : (
                <motion.span
                  key={`flash-${index}`}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[12] bg-[#fff4e0]"
                  initial={{ opacity: index === 0 ? 0 : 0.14 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              )}

              {/* Photo scene carries its own per-slide captions so they don't repeat. */}
              {frame.scene !== 2 && frame.scene !== 3 && caption ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-[4.25rem] z-10 px-6 pb-[env(safe-area-inset-bottom,0px)]">
                  <Subtitle big={stage.big}>{caption}</Subtitle>
                </div>
              ) : null}

              <nav
                aria-label="Scenes"
                className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              >
                {reduce ? null : (
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-pressed={paused}
                    aria-label={paused ? 'Resume' : 'Pause'}
                    className="movie-control absolute left-4"
                  >
                    {paused ? (
                      <Play className="h-6 w-6 translate-x-px" aria-hidden />
                    ) : (
                      <Pause className="h-6 w-6" aria-hidden />
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
                <ol className="flex items-center gap-1.5" aria-label="Scene progress">
                  {frames.map((f, i) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`Scene ${i + 1}: ${f.label}`}
                        aria-current={i === index ? 'step' : undefined}
                        className="grid h-11 w-7 place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
                      >
                        <span
                          className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                            i === index ? 'w-6 bg-[#fdba74]' : 'w-2.5 bg-[#fffaf0]/35'
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
          <span aria-hidden className="film-grain" style={{ zIndex: 25, opacity: 0.05 }} />
          <span aria-hidden className="movie-vignette" />
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
        <SoundtrackCredit song={props.data.song} big={props.stage.big} />
      ) : null;
    default:
      return <LetterScene {...props} />;
  }
}
