'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import { isPlaceholderPhoto, type XsoData } from '@/types/xso';
import { supportsWebGL } from '@/lib/deviceQuality';
import { isLite } from '@/lib/liteMode';
import { playSound } from '@/lib/sound';

type AlbumProps = ComponentProps<
  typeof import('@/components/xso/scrapbook/ScrapbookAlbum').ScrapbookAlbum
>;

/** An album whose code didn't arrive (offline, a failed chunk) gives way to the desk. */
function Unavailable({ onFail }: AlbumProps) {
  useEffect(() => onFail(), [onFail]);
  return null;
}

const ScrapbookAlbum = dynamic<AlbumProps>(
  () =>
    import('@/components/xso/scrapbook/ScrapbookAlbum')
      .then((m) => m.ScrapbookAlbum)
      .catch(() => Unavailable),
  { ssr: false, loading: () => null },
);

/** The cover is over and the view is on page one by the time the card dissolves onto the desk. */
const DISSOLVE_AT = 1650;
const OPEN_MS = 2250;
/** An album that hasn't drawn by now (slow device, slow network) isn't worth waiting for. */
const PATIENCE_MS = 8000;

/** "2026" from the gift's receipt timestamp, for the cover label. */
function yearOf(timestamp: string): string {
  return /\b(19|20)\d{2}\b/.exec(timestamp ?? '')?.[0] ?? '';
}

/**
 * The Scrapbook's cover: the album itself, tied with a ribbon, under the recipient's name. The
 * desk waits underneath; breaking the seal opens the album and the card dissolves onto it. No
 * WebGL, or an album that fails or is slow, simply leaves the desk as it is.
 */
export const AlbumCover = memo(function AlbumCover({
  data,
  reduce,
  onDone,
}: {
  data: XsoData;
  reduce: boolean;
  /** The cover has given way to the desk and can be removed. */
  onDone: () => void;
}) {
  /** A wide stage lays the album beside the titles instead of under them. */
  const root = useRef<HTMLDivElement>(null);
  const [landscape, setLandscape] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => setLandscape(node.clientWidth > node.clientHeight * 1.15);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const [album, setAlbum] = useState<'loading' | 'ready' | 'off'>(() =>
    supportsWebGL() ? 'loading' : 'off',
  );
  const [lite] = useState(isLite);
  const [opened, setOpened] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0.6, y: 0.72 });
  const timers = useRef<number[]>([]);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /** Without the album there's nothing to open: the desk is the gift. */
  useEffect(() => {
    if (album === 'off') done.current();
  }, [album]);
  useEffect(() => {
    if (album !== 'loading') return;
    const timer = window.setTimeout(() => setAlbum('off'), PATIENCE_MS);
    return () => window.clearTimeout(timer);
  }, [album]);

  const open = () => {
    if (opened || album !== 'ready') return;
    setOpened(true);
    playSound('scrap.seal');
    timers.current.push(
      window.setTimeout(() => playSound('scrap.lift.note'), reduce ? 0 : 320),
      window.setTimeout(() => setDissolving(true), reduce ? 0 : DISSOLVE_AT),
      window.setTimeout(() => done.current(), reduce ? 450 : OPEN_MS),
    );
  };

  /** The cover mounts after the unwrap has handed out focus, so the seal claims it. */
  const seal = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (album !== 'ready') return;
    const focused = document.activeElement;
    if (!focused || focused === document.body) seal.current?.focus({ preventScroll: true });
  }, [album]);

  const contents = useMemo(
    () => ({
      store: data.merchantName,
      lines: data.lineItems.slice(0, 5).map((item) => ({
        text: `${item.qty ? `${item.qty} ` : ''}${item.description}`,
        price: item.price,
      })),
      total: data.total,
      photo: data.photos.find((src) => src && !isPlaceholderPhoto(src)),
      year: yearOf(data.timestamp),
      caption: data.occasion?.trim() ?? '',
      date: (data.timestamp ?? '').split(' ')[0] ?? '',
    }),
    [data],
  );
  const ready = useCallback(() => setAlbum('ready'), []);
  const fail = useCallback(() => setAlbum('off'), []);
  const place = useCallback((x: number, y: number) => {
    setAnchor((a) => (Math.abs(a.x - x) < 0.002 && Math.abs(a.y - y) < 0.002 ? a : { x, y }));
  }, []);

  if (album === 'off') return null;

  return (
    <motion.div
      ref={root}
      data-album={album}
      className="scrap-wood absolute inset-0 z-40"
      animate={{ opacity: dissolving ? 0 : 1 }}
      transition={{ duration: reduce ? 0.45 : 0.6, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={album === 'ready' ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <ScrapbookAlbum
          contents={contents}
          landscape={landscape}
          opening={opened}
          reduce={reduce}
          lite={lite}
          onReady={ready}
          onFail={fail}
          onAnchor={place}
        />
      </motion.div>
      <div
        className={`pointer-events-none absolute flex justify-center px-6 ${
          landscape ? 'inset-y-0 left-0 w-[44%] items-center' : 'inset-x-0 top-[7%]'
        }`}
      >
        <motion.div
          className="w-full max-w-[340px] text-center"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={opened ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
          transition={{ duration: opened ? 0.4 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-receipt text-[13px] uppercase tracking-[0.3em] text-[#f4c4b4]">
            A scrapbook for
          </p>
          <h1 className="mt-2 text-balance font-serif text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#fff6ea] [text-shadow:0_2px_20px_rgba(0,0,0,0.55)]">
            {data.customerName || 'you'}
          </h1>
          {data.occasion ? (
            <p className="mt-3 text-balance font-receipt text-[13px] uppercase tracking-[0.2em] text-[#fff6ea]/75">
              {data.occasion}
            </p>
          ) : null}
          {data.billerName ? (
            <p className="mt-1.5 font-hand text-[24px] leading-none text-[#f4c4b4]">
              Kept by {data.billerName}
            </p>
          ) : null}
        </motion.div>
      </div>
      <motion.button
        ref={seal}
        type="button"
        onClick={open}
        data-autofocus
        data-album-seal
        aria-label="Break the seal and open the scrapbook"
        className="album-seal absolute z-10 -ml-7 -mt-7 h-14 w-14 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4c4b4]"
        style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}
        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
        animate={
          opened || album !== 'ready'
            ? { opacity: 0, scale: opened ? 1.25 : 0.9 }
            : { opacity: 1, scale: 1 }
        }
        transition={{ duration: opened ? 0.3 : 0.6, delay: opened || reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.p
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 text-center font-receipt text-[12px] uppercase tracking-[0.22em] text-[#f4c4b4]/85 ${landscape ? 'bottom-5 left-[44%]' : 'bottom-[6%]'}`}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: album === 'ready' && !opened ? 1 : 0 }}
        transition={{ duration: 0.5, delay: opened ? 0 : 1 }}
      >
        Break the seal to open it
      </motion.p>
    </motion.div>
  );
});
