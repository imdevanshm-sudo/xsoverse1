'use client';

import { memo, useCallback, useEffect, useRef, type PointerEvent } from 'react';
import {
  motion,
  useAnimate,
  useInView,
  useReducedMotion,
  type AnimationPlaybackControls,
  type TargetAndTransition,
} from 'framer-motion';
import { MiniFace } from '@/components/storefront/DeckBox';
import type { BaseStyle } from '@/types/xso';

const REEL: { style: BaseStyle; name: string; caption: string }[] = [
  { style: 'loop', name: 'Loop', caption: 'Flick it, it comes back' },
  { style: 'rewind', name: 'Rewind', caption: 'Call it all back' },
  { style: 'scrapbook', name: 'Scrapbook', caption: 'Spill it on the desk' },
  { style: 'accordion', name: 'Accordion', caption: 'Pull it open' },
  { style: 'moviebox', name: 'Movie Box', caption: 'Crank the reel' },
];

const MARQUEE = { duration: 30, ease: 'linear', repeat: Infinity } as const;
/** Enough copies that the track is always wider than the viewport plus one copy, so it never shows a gap. */
const COPIES = 3;
const LOOP_SHIFT = `${-100 / COPIES}%`;
const BEAT = { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } as const;

type Pose = { animate: TargetAndTransition; kind: number; className?: string };

/** Three paper cards per format, each looping that format's signature move. */
const SCENES: Record<Exclude<BaseStyle, 'moviebox'>, Pose[]> = {
  loop: [
    { kind: 2, animate: { x: 6, y: 8, rotate: 4 } },
    { kind: 1, animate: { x: -4, y: 4, rotate: -3 } },
    {
      kind: 0,
      animate: {
        x: [0, 58, 58, 0],
        y: [0, -8, 10, 0],
        rotate: [0, 16, 6, 0],
        zIndex: [3, 3, 0, 3],
      },
    },
  ],
  rewind: [
    { kind: 3, animate: { x: 5, y: 7, rotate: 3 } },
    {
      kind: 2,
      animate: { x: [0, -54, -54, 0], rotate: [0, -16, -16, 0], opacity: [1, 0.6, 0.6, 1] },
    },
    {
      kind: 0,
      animate: { x: [0, -62, -62, 0], rotate: [0, -22, -22, 0], opacity: [1, 0.55, 0.55, 1] },
    },
  ],
  scrapbook: [
    { kind: 2, animate: { x: [0, -34, -34, 0], y: [0, 14, 14, 0], rotate: [0, -12, -12, 0] } },
    { kind: 3, animate: { x: [0, 34, 34, 0], y: [0, 10, 10, 0], rotate: [0, 10, 10, 0] } },
    { kind: 0, animate: { y: [0, -20, -20, 0], rotate: [0, 4, 4, 0] } },
  ],
  accordion: [
    { kind: 0, animate: { x: [-6, -38, -38, -6], rotateY: [62, 14, 14, 62] } },
    { kind: 1, animate: { x: [0, 0, 0, 0], rotateY: [-62, -14, -14, -62] } },
    { kind: 3, animate: { x: [6, 38, 38, 6], rotateY: [62, 14, 14, 62] } },
  ],
};

const MotionPreview = memo(function MotionPreview({
  style,
  playing,
}: {
  style: BaseStyle;
  playing: boolean;
}) {
  if (style === 'moviebox') {
    return (
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden bg-[#1d1016] py-2">
        <motion.div
          className="flex w-max"
          animate={playing ? { x: ['0%', '-50%'] } : undefined}
          transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
        >
          {[0, 1, 2, 3, 0, 1, 2, 3].map((kind, i) => (
            <div key={i} className="px-1.5">
              <div className="mb-1 flex justify-between">
                {[0, 1, 2, 3].map((h) => (
                  <span key={h} className="h-1 w-1.5 rounded-[1px] bg-[#fce7f3]/70" />
                ))}
              </div>
              <div className="paper-card h-[62px] w-[48px] overflow-hidden !rounded-[3px] p-1">
                <MiniFace kind={kind} />
              </div>
              <div className="mt-1 flex justify-between">
                {[0, 1, 2, 3].map((h) => (
                  <span key={h} className="h-1 w-1.5 rounded-[1px] bg-[#fce7f3]/70" />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid place-items-center" style={{ perspective: 600 }}>
      {SCENES[style].map((pose, i) => {
        const looping = Object.values(pose.animate).some(Array.isArray);
        return (
          <motion.div
            key={i}
            className="paper-card absolute h-[78px] w-[58px] overflow-hidden !rounded-[7px] p-1.5"
            style={{ zIndex: i + 1 }}
            initial={false}
            animate={
              playing || !looping
                ? pose.animate
                : Object.fromEntries(
                    Object.entries(pose.animate).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
                  )
            }
            transition={looping ? BEAT : { duration: 0 }}
          >
            <MiniFace kind={pose.kind} />
          </motion.div>
        );
      })}
    </div>
  );
});

function ReelCard({
  item,
  playing,
  onPick,
  copy,
}: {
  item: (typeof REEL)[number];
  playing: boolean;
  onPick?: (style: BaseStyle) => void;
  copy: boolean;
}) {
  return (
    <button
      type="button"
      tabIndex={copy ? -1 : undefined}
      aria-hidden={copy || undefined}
      onClick={() => onPick?.(item.style)}
      aria-label={`${item.name}: ${item.caption}. Start an express order`}
      className="group relative mr-3 h-[178px] w-[148px] shrink-0 touch-manipulation overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_30%,#3a1a28,#170c12_75%)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4] md:h-[208px] md:w-[196px]"
    >
      <span className="absolute inset-x-0 top-0 h-[128px] md:h-[156px]">
        <MotionPreview style={item.style} playing={playing} />
      </span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#120a0e] via-[#120a0e]/90 to-transparent px-3 pb-2.5 pt-5">
        <span className="block font-serif text-[15px] font-semibold leading-tight text-[#fdf2f8]">
          {item.name}
        </span>
        <span className="block truncate text-[11.5px] text-[#c99aae]">{item.caption}</span>
      </span>
    </button>
  );
}

/**
 * Endless reel of the five formats in motion. Hover or press to pause;
 * tapping a card opens an express order in that format.
 */
export const HeroMarquee = memo(function HeroMarquee({
  onPick,
}: {
  onPick?: (style: BaseStyle) => void;
}) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const visible = useInView(scope, { margin: '80px' });
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const held = useRef({ hover: false, press: false });
  const playing = visible && !reduce;

  const sync = useCallback(() => {
    const c = controls.current;
    if (!c) return;
    if (playing && !held.current.hover && !held.current.press) c.play();
    else c.pause();
  }, [playing]);

  useEffect(() => {
    const track = scope.current?.querySelector<HTMLElement>('[data-marquee-track]');
    if (reduce || !track) return;
    const c = animate(track, { x: ['0%', LOOP_SHIFT] }, MARQUEE);
    controls.current = c;
    return () => {
      c.stop();
      controls.current = null;
    };
  }, [animate, reduce, scope]);

  useEffect(sync, [sync]);

  const hover = (on: boolean) => (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    held.current.hover = on;
    sync();
  };
  const press = (on: boolean) => () => {
    held.current.press = on;
    sync();
  };

  return (
    <div
      ref={scope}
      role="region"
      aria-label="All five XSO formats in motion"
      onPointerEnter={hover(true)}
      onPointerLeave={(e) => {
        hover(false)(e);
        press(false)();
      }}
      onPointerDown={press(true)}
      onPointerUp={press(false)}
      onPointerCancel={press(false)}
      className={`-mx-5 flex py-1 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] sm:-mx-8 ${
        reduce ? 'overflow-x-auto px-5 [scrollbar-width:none]' : 'overflow-hidden'
      }`}
    >
      <div data-marquee-track className="flex w-max shrink-0 will-change-transform">
        {Array.from({ length: reduce ? 1 : COPIES }, (_, copy) => (
          <div key={copy} data-marquee-group className="flex shrink-0">
            {REEL.map((item) => (
              <ReelCard
                key={item.style}
                item={item}
                playing={playing}
                onPick={onPick}
                copy={copy > 0}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
