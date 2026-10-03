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
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { soundtrackSrc } from '@/lib/soundtracks';
import { useSoundtrack } from '@/components/xso/movie/useSoundtrack';
import type { MovieLayers, XsoData } from '@/types/xso';
import { useStage } from '@/components/xso/movie/useStage';
import { OpeningSlate } from '@/components/xso/movie/OpeningSlate';
import { EndScreen } from '@/components/xso/movie/EndScreen';
import {
  AuditScene,
  LetterScene,
  PhotoScene,
  ReceiptScene,
  Subtitle,
  TitleCards,
  montagePhotos,
  type SceneProps,
} from '@/components/xso/movie/scenes';

export interface MovieFrame {
  id: string;
  label: string;
  /** Which of the four scenes it plays (receipt, audit, photos, letter). */
  scene: number;
}

const SWIPE_PX = 40;

/** How long each scene holds before the film moves on; the letter ends itself. */
function sceneMs(scene: number, photos: number): number | null {
  if (scene === 0) return 8000;
  if (scene === 1) return 9000;
  if (scene === 2) return Math.min(30000, Math.max(10000, photos * 5000));
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
    startMusic();
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
    if (finished) finishMusic();
  }, [finished, finishMusic]);
  const replayMusic = music.replay;
  const replay = useCallback(() => {
    replayMusic();
    goTo(0);
  }, [goTo, replayMusic]);
  const finish = useCallback(() => setFinished(true), []);

  /** Plays on by itself like a film; pause stops it, and reduced motion leaves it to the viewer. */
  const [paused, setPaused] = useState(false);
  const photoCount = montagePhotos(data, movie).length;
  useEffect(() => {
    if (!started || finished || paused || reduce || focusIndex !== undefined) return;
    const ms = sceneMs(frame.scene, photoCount);
    if (!ms) return;
    const timer = window.setTimeout(() => goTo(index + 1), ms);
    return () => window.clearTimeout(timer);
  }, [finished, focusIndex, frame.scene, goTo, index, paused, photoCount, reduce, started]);

  useEffect(() => {
    if (focusIndex === undefined) return;
    setStarted(true);
    goTo(focusIndex);
  }, [focusIndex, goTo]);

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else return;
      e.preventDefault();
    },
    [goTo, index],
  );

  const downX = useRef<number | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    downX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (downX.current === null) return;
    const dx = e.clientX - downX.current;
    downX.current = null;
    if (Math.abs(dx) >= SWIPE_PX) goTo(index + (dx < 0 ? 1 : -1));
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
      aria-label="Movie Box"
      aria-roledescription="film"
      onKeyDown={onKey}
      className="movie-feature relative flex h-full w-full touch-pan-y items-center justify-center overflow-hidden bg-[#050203] text-[#fffaf0]"
    >
      {stage.width ? (
        <div
          className="movie-stage relative overflow-hidden bg-[#0b0507]"
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
              cta={cta}
            />
          ) : (
            <>
              <AnimatePresence initial={false}>
                <motion.article
                  key={index}
                  aria-label={`Scene ${index + 1} of ${count}: ${frame.label}`}
                  className="absolute inset-0"
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
                  {frame.scene !== 3 && caption ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 px-6">
                      <Subtitle big={stage.big}>{caption}</Subtitle>
                    </div>
                  ) : null}
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
                      <Play className="h-5 w-5" aria-hidden />
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
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <ol className="flex items-center gap-1.5">
                  {frames.map((f, i) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`Scene ${i + 1}: ${f.label}`}
                        aria-current={i === index ? 'step' : undefined}
                        className="grid h-8 w-6 place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fdba74]"
                      >
                        <span
                          className={`block h-1 rounded-full transition-[width,background-color] duration-300 ${
                            i === index ? 'w-5 bg-[#fdba74]' : 'w-2 bg-[#fffaf0]/35'
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
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
                {music.available ? (
                  <button
                    type="button"
                    onClick={music.toggleMute}
                    aria-pressed={music.muted}
                    aria-label={music.muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
                    className="movie-control absolute right-4"
                  >
                    {music.muted ? (
                      <VolumeX className="h-5 w-5" aria-hidden />
                    ) : (
                      <Volume2 className="h-5 w-5" aria-hidden />
                    )}
                  </button>
                ) : null}
              </nav>
            </>
          )}
          <span aria-hidden className="film-grain" style={{ zIndex: 25, opacity: 0.07 }} />
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
      return montagePhotos(props.data, props.movie).length ? (
        <PhotoScene {...props} />
      ) : (
        <TitleCards {...props} />
      );
    default:
      return <LetterScene {...props} />;
  }
}
