'use client';

import dynamic from 'next/dynamic';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { MovieLayers, XsoData } from '@/types/xso';
import type { StageSize } from '@/components/xso/movie/useStage';
import type { KeepsakeTarget, PaperLayout, PaperText } from '@/components/xso/movie/KeepsakeBox';
import { montagePhotos } from '@/components/xso/movie/scenes';
import { supportsWebGL } from '@/lib/deviceQuality';
import { isLite } from '@/lib/liteMode';

type BoxProps = ComponentProps<typeof import('@/components/xso/movie/KeepsakeBox').KeepsakeBox>;

/** A box whose code didn't arrive (offline, a failed chunk) gives way to the plain card. */
function Unavailable({ onFail }: BoxProps) {
  useEffect(() => onFail(), [onFail]);
  return null;
}

const KeepsakeBox = dynamic<BoxProps>(
  () =>
    import('@/components/xso/movie/KeepsakeBox')
      .then((m) => m.KeepsakeBox)
      .catch(() => Unavailable),
  { ssr: false, loading: () => null },
);

/**
 * The box's opening runs over the first scene, which starts underneath as it always has: the lid
 * opens, the view settles on the receipt in the tray, and the card dissolves onto the film's own.
 */
const DISSOLVE_AT = 1650;
const OPEN_MS = 2200;
/** The film's receipt has mounted under the card by now, so the push knows where to land. */
const MEASURE_AT = [480, 640];
/** Without the box the card simply gives way as the first scene comes up. */
const PLAIN_DISSOLVE_AT = 450;
const PLAIN_MS = 900;
/** A box that hasn't drawn by now (slow device, slow network) isn't worth waiting for. */
const BOX_PATIENCE_MS = 8000;

/**
 * Reads the film's receipt as laid out (untransformed CSS px from the paper's corner), so the
 * slip in the box can be printed to match it line for line.
 */
function paperLayout(paper: HTMLElement): PaperLayout | undefined {
  const offset = (el: HTMLElement) => {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== paper) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return node === paper ? { x, y } : null;
  };
  const texts: PaperText[] = [];
  const rules: number[] = [];
  for (const el of Array.from(paper.querySelectorAll<HTMLElement>('*'))) {
    const style = getComputedStyle(el);
    const at = offset(el);
    if (!at) return undefined;
    if (style.borderTopStyle === 'dashed') rules.push(at.y);
    const text = el.textContent?.trim();
    if (!text || el.children.length) continue;
    const size = parseFloat(style.fontSize);
    const align = style.textAlign;
    texts.push({
      text: style.textTransform === 'uppercase' ? text.toUpperCase() : text,
      x: at.x,
      y: at.y,
      w: el.offsetWidth,
      h: el.offsetHeight,
      font: `${style.fontWeight} ${size}px ${style.fontFamily}`,
      lineHeight: parseFloat(style.lineHeight) || size * 1.2,
      spacing: style.letterSpacing === 'normal' ? '0px' : style.letterSpacing,
      align: align === 'center' ? 'center' : align === 'right' || align === 'end' ? 'right' : 'left',
      color: style.color,
    });
  }
  return { w: paper.offsetWidth, h: paper.offsetHeight, texts, rules };
}

/**
 * The title card before the film. Where WebGL is welcome it's the keepsake box itself, closed,
 * under the recipient's name, with Play laid over its clasp; Play opens the lid. Lite mode, no
 * WebGL, or a box that fails keep the plain title card.
 */
export const OpeningSlate = memo(function OpeningSlate({
  data,
  movie,
  stage,
  reduce,
  onPlay,
  onDone,
}: {
  data: XsoData;
  movie: MovieLayers;
  stage: StageSize;
  reduce: boolean;
  /** Called synchronously inside the tap, so audio can start in the same gesture. */
  onPlay: () => void;
  /** The card has finished giving way to the film and can be removed. */
  onDone: () => void;
}) {
  const { big, compact, landscape } = stage;
  const [box, setBox] = useState<'loading' | 'ready' | 'off'>(() =>
    supportsWebGL() ? 'loading' : 'off',
  );
  /** Reduced motion keeps the box closed; lite mode still opens it, drawn more cheaply. */
  const still = reduce;
  const [lite] = useState(isLite);
  const [played, setPlayed] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [anchor, setAnchor] = useState(() => (landscape ? { x: 0.7, y: 0.58 } : { x: 0.5, y: 0.66 }));
  const [target, setTarget] = useState<KeepsakeTarget | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    if (box !== 'loading' || played) return;
    const timer = window.setTimeout(() => setBox('off'), BOX_PATIENCE_MS);
    return () => window.clearTimeout(timer);
  }, [box, played]);

  /** Finds the film's receipt under the card, in the card's own fractions. */
  const measure = useCallback(() => {
    const card = root.current;
    const paper = card?.parentElement?.querySelector<HTMLElement>('article .movie-prop');
    if (!card || !paper) return;
    const frame = card.getBoundingClientRect();
    const r = paper.getBoundingClientRect();
    if (!frame.width || !frame.height || !paper.offsetWidth) return;
    setTarget({
      cx: (r.left + r.width / 2 - frame.left) / frame.width,
      cy: (r.top + r.height / 2 - frame.top) / frame.height,
      w: paper.offsetWidth / frame.width,
      paper: paperLayout(paper),
    });
  }, []);

  const play = () => {
    if (played) return;
    setPlayed(true);
    onPlay();
    const opens = box === 'ready' && !still;
    const dissolveAt = still ? 0 : opens ? DISSOLVE_AT : PLAIN_DISSOLVE_AT;
    const doneAt = still ? 450 : opens ? OPEN_MS : PLAIN_MS;
    timers.current.push(
      window.setTimeout(() => setDissolving(true), dissolveAt),
      window.setTimeout(onDone, doneAt),
    );
    if (opens) MEASURE_AT.forEach((at) => timers.current.push(window.setTimeout(measure, at)));
  };

  /** The card mounts after the unwrap has handed out focus, so it claims it itself. */
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const focused = document.activeElement;
    if (!focused || focused === document.body) button.current?.focus({ preventScroll: true });
  }, []);

  const contents = useMemo(
    () => ({
      store: data.merchantName,
      lines: data.lineItems.slice(0, 5).map((item) => ({
        text: `${item.qty ? `${item.qty} ` : ''}${item.description}`,
        price: item.price,
      })),
      total: data.total,
      photo: montagePhotos(data, movie)[0],
    }),
    [data, movie],
  );
  const ready = useCallback(() => setBox('ready'), []);
  const fail = useCallback(() => setBox('off'), []);
  const place = useCallback((x: number, y: number) => {
    setAnchor((a) => (Math.abs(a.x - x) < 0.002 && Math.abs(a.y - y) < 0.002 ? a : { x, y }));
  }, []);

  const withBox = box !== 'off';
  const titleSize = withBox
    ? big
      ? 'text-[56px]'
      : compact
        ? 'text-[32px]'
        : 'text-[42px]'
    : big
      ? 'text-[64px]'
      : compact
        ? 'text-[36px]'
        : 'text-[46px]';
  const titles = (
    <motion.div
      className={`relative w-full text-center ${big ? 'max-w-[520px]' : 'max-w-[340px]'}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={played && withBox ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
      transition={{ duration: played ? 0.4 : 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <p
        className={`font-receipt uppercase tracking-[0.36em] text-[#fdba74] ${big ? 'text-[14px]' : 'text-[13px]'}`}
      >
        Scene 01
      </p>
      <h1
        className={`mt-3 text-balance font-serif font-semibold leading-[1.02] tracking-[-0.02em] text-[#fffaf0] [text-shadow:0_2px_24px_rgba(0,0,0,0.6)] ${titleSize}`}
      >
        {data.customerName || 'For you'}
      </h1>
      {data.occasion || data.billerName ? (
        <span aria-hidden className="mx-auto mt-4 block h-px w-12 bg-[#fdba74]/50" />
      ) : null}
      {data.occasion ? (
        <p
          className={`mt-4 text-balance font-receipt uppercase tracking-[0.2em] text-[#fffaf0]/75 ${big ? 'text-[15px]' : 'text-[13px]'}`}
        >
          {data.occasion}
        </p>
      ) : null}
      {data.billerName ? (
        <p
          className={`mt-2 font-hand leading-none text-[#fdba74] ${big ? 'text-[30px]' : 'text-[24px]'}`}
        >
          Directed by {data.billerName}
        </p>
      ) : null}
    </motion.div>
  );

  /** Over the clasp it's a small brass press; on the plain card, the large white Play. */
  const playButton = (
    <motion.button
      ref={button}
      type="button"
      onClick={play}
      data-autofocus
      aria-label="Play"
      className={
        withBox
          ? 'keepsake-clasp absolute z-10 -ml-7 -mt-7 grid h-14 w-14 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fdba74]'
          : `movie-play group relative grid shrink-0 place-items-center rounded-full bg-[#fffaf0] text-[#0b0507] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fdba74] ${big ? 'h-28 w-28' : 'h-24 w-24'}`
      }
      style={withBox ? { left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` } : undefined}
      initial={reduce ? false : { opacity: 0, scale: 0.94 }}
      animate={
        withBox && (played || box !== 'ready') ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }
      }
      transition={{
        duration: played ? 0.25 : 0.6,
        delay: reduce || played ? 0 : withBox ? 0.6 : 0.25,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Play
        className={`translate-x-0.5 fill-current ${withBox ? 'h-6 w-6' : big ? 'h-12 w-12' : 'h-10 w-10'}`}
        aria-hidden
      />
    </motion.button>
  );

  return (
    <motion.div
      ref={root}
      data-keepsake={box}
      className={`movie-slate absolute inset-0 z-40 ${withBox ? '' : `flex items-center justify-center px-6 ${compact ? 'flex-row gap-10' : 'flex-col gap-10'}`}`}
      animate={{ opacity: dissolving ? 0 : 1 }}
      transition={{ duration: reduce ? 0.45 : 0.55, ease: 'easeInOut' }}
      /* The film's tap-to-skip lives on the stage underneath; the card keeps its taps to itself. */
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* The lamp warming up: light falls onto the scene from above. */}
      <motion.span
        aria-hidden
        className="movie-projector pointer-events-none absolute inset-0"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      {withBox ? (
        <>
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={box === 'ready' ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <KeepsakeBox
              contents={contents}
              landscape={landscape}
              opening={played}
              reduce={still}
              lite={lite}
              target={target}
              onReady={ready}
              onFail={fail}
              onAnchor={place}
            />
          </motion.div>
          <div
            className={`pointer-events-none absolute flex justify-center px-6 ${
              landscape ? 'inset-y-0 left-0 w-[46%] items-center' : 'inset-x-0 top-[13%]'
            }`}
          >
            {titles}
          </div>
          {playButton}
        </>
      ) : (
        <>
          {titles}
          {playButton}
        </>
      )}
    </motion.div>
  );
});
