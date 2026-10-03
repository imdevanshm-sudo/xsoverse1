'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MemoryDeck } from '@/components/xso/preview/MemoryDeck';
import { PhoneFrame } from '@/components/xso/PhoneFrame';
import { RewindStack } from '@/components/xso/preview/RewindStack';
import { AccordionRibbon } from '@/components/xso/preview/AccordionRibbon';
import { MovieBox } from '@/components/xso/preview/MovieBox';
import { ScrapbookDesk } from '@/components/xso/preview/ScrapbookDesk';
import { ImmersivePrompt } from '@/components/xso/ImmersivePrompt';
import { RecipientPreloader } from '@/components/xso/RecipientPreloader';
import {
  TEXTURES,
  collectImageUrls,
  preloadImages,
  useAssetPreloader,
} from '@/hooks/useAssetPreloader';
import { PreviewWatermark } from '@/components/xso/PreviewWatermark';
import type { GiftWrapper } from '@/lib/giftWrapper';
import type { XsoData } from '@/types/xso';

type Phase = 'wrapped' | 'opening';

async function fetchContents(giftId: string): Promise<XsoData> {
  const response = await fetch(`/api/gifts/${encodeURIComponent(giftId)}/open`, {
    method: 'POST',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`open failed: ${response.status}`);
  const body = (await response.json()) as { data: XsoData };
  return body.data;
}

/**
 * The unboxing. It starts sealed with nothing but the wrapper: the contents are fetched only when
 * the gift is unwrapped, and the format mounts only once the wrap has fully cleared. There is no
 * URL, hash or stored flag that opens it, so every visit (recipient or sender) goes through the
 * wrap.
 *
 * - Recipient: chromeless black canvas, no branding, codes or utilities.
 * - `watermark`: the sender's full-screen preview of that same flow, stamped as a preview.
 * - `draft` + `framed`: the studio's pre-purchase preview of an unsaved gift, in a phone frame.
 */
export function GiftUnboxing({
  giftId,
  wrapper,
  draft,
  framed = false,
  watermark = false,
}: {
  giftId: string;
  wrapper: GiftWrapper;
  /** Local contents for a gift that isn't stored yet; otherwise they're fetched on unwrap. */
  draft?: XsoData;
  framed?: boolean;
  watermark?: boolean;
}) {
  const reduce = Boolean(useReducedMotion());
  const [phase, setPhase] = useState<Phase>('wrapped');
  const [wrapGone, setWrapGone] = useState(false);
  const [contents, setContents] = useState<XsoData | null>(null);
  const [failed, setFailed] = useState(false);
  const attempt = useRef(0);
  const ready = useAssetPreloader(TEXTURES, { enabled: !framed });

  const unwrap = () => {
    if (phase !== 'wrapped') return;
    playPaperUnwrap();
    setFailed(false);
    setPhase('opening');
    const run = ++attempt.current;
    const load = draft ? Promise.resolve(draft) : fetchContents(giftId);
    load
      .then(async (data) => {
        await preloadImages(collectImageUrls(data));
        if (run === attempt.current) setContents(data);
      })
      .catch(() => {
        if (run !== attempt.current) return;
        setFailed(true);
        setWrapGone(false);
        setPhase('wrapped');
      });
  };

  const content = (
    <>
      <AnimatePresence onExitComplete={() => setWrapGone(true)}>
        {phase === 'wrapped' ? (
          <GiftWrap key="gift-wrap" wrapper={wrapper} failed={failed} onUnwrap={unwrap} />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {wrapGone && contents ? (
          <motion.div
            key="souvenir"
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <Souvenir data={contents} />
          </motion.div>
        ) : wrapGone ? (
          <OpeningDot key="opening" />
        ) : null}
      </AnimatePresence>
    </>
  );

  if (framed) {
    return (
      <div className="mx-auto my-auto flex w-full max-w-md flex-1 flex-col justify-between gap-4 p-4 sm:p-6 md:max-w-sm md:flex-none md:py-8">
        <p className="min-h-8 content-center pr-32 text-left font-mono text-[9px] uppercase tracking-[0.24em] text-white/40 md:pr-0 md:text-center">
          Receiver preview · exactly what they&apos;ll open
        </p>
        <PhoneFrame className="receiver-stage">{content}</PhoneFrame>
        <p className="text-center text-[12px] leading-snug text-white/45">
          Their link opens straight into this, on any phone, no app needed.
        </p>
        {watermark ? <PreviewWatermark /> : null}
      </div>
    );
  }

  return (
    <>
      <ImmersivePrompt id={giftId} hold={!ready}>
        <RecipientCanvas>{content}</RecipientCanvas>
      </ImmersivePrompt>
      <AnimatePresence>{ready ? null : <RecipientPreloader key="preloader" />}</AnimatePresence>
      {watermark ? <PreviewWatermark /> : null}
    </>
  );
}

/** Held between the wrap clearing and the contents arriving, if the network is slower than the animation. */
function OpeningDot() {
  return (
    <motion.div
      className="absolute inset-0 grid place-items-center bg-black"
      role="status"
      aria-label="Opening"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        className="block h-1.5 w-1.5 rounded-full bg-white"
        animate={{ opacity: [0.15, 0.85, 0.15] }}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      />
    </motion.div>
  );
}

/**
 * Every pixel belongs to the gift. Phones are full-bleed; wider screens get a phone-width
 * column on black so the formats keep the proportions they were composed for.
 */
function RecipientCanvas({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 bg-black md:py-6"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="relative mx-auto h-full w-full max-w-[520px] overflow-hidden md:rounded-3xl">
        {children}
      </div>
    </div>
  );
}

/** Card stacks stay vertically centred inside a phone-height band instead of running edge to edge. */
const CARD_STAGE = 'flex h-full max-h-[600px] w-full items-center justify-center max-md:h-[80svh]';

function Souvenir({ data }: { data: XsoData }) {
  switch (data.giftStyle) {
    case 'rewind':
      return (
        <div className="flex h-full items-center justify-center overflow-hidden bg-[#1a0f14] px-4 py-6">
          <div className={CARD_STAGE}>
            <RewindStack data={data} size="fill" />
          </div>
        </div>
      );
    case 'scrapbook':
      return (
        <div className="flex h-full items-center justify-center overflow-hidden bg-[#180e15] px-2 pb-14 pt-3">
          <div className="flex h-full w-full touch-manipulation justify-center max-md:max-h-[65dvh]">
            <ScrapbookDesk data={data} size="fill" />
          </div>
        </div>
      );
    case 'accordion':
      return (
        <div className="flex h-full justify-center overflow-hidden bg-[#180e15] px-4 pb-16 pt-6">
          <AccordionRibbon data={data} size="fill" />
        </div>
      );
    case 'moviebox':
      return (
        <div className="h-full overflow-hidden bg-[#050203]">
          <MovieBox data={data} size="fill" />
        </div>
      );
    default:
      return (
        <div className="flex h-full items-center justify-center overflow-hidden bg-[#1a0f14] px-4 py-6">
          <div className={CARD_STAGE}>
            <MemoryDeck data={data} size="fill" />
          </div>
        </div>
      );
  }
}

function GiftWrap({
  wrapper,
  failed,
  onUnwrap,
}: {
  wrapper: GiftWrapper;
  failed: boolean;
  onUnwrap: () => void;
}) {
  const matte = wrapper.giftStyle === 'moviebox';
  const presentation = wrapper.giftStyle === 'accordion' ? 'booklet' : wrapper.giftStyle;

  return (
    <motion.section
      className={`absolute inset-0 z-40 overflow-hidden md:rounded-3xl md:border ${
        matte ? 'border-rose-200/10 bg-[#180b10]' : 'border-[#c8a97c]/35 bg-[#ad8153]'
      }`}
      style={{ perspective: 1100 }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.035 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Wrapped ${presentation} gift for ${wrapper.customerName}`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 w-[51%] origin-left"
        style={wrapSurface(matte)}
        exit={{ x: '-108%', rotateY: -18, rotateZ: -3 }}
        transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 w-[51%] origin-right"
        style={wrapSurface(matte)}
        exit={{ x: '108%', rotateY: 18, rotateZ: 3 }}
        transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
      />

      {!matte && <CraftFibers />}
      <Postmark matte={matte} occasion={wrapper.occasion} date={wrapper.date} />

      <motion.div
        className={`absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 ${
          matte
            ? 'bg-gradient-to-r from-[#681329] via-[#c53a52] to-[#5b1023]'
            : 'bg-[repeating-linear-gradient(90deg,#765432_0_2px,#b58a58_2px_4px,#7b5937_4px_6px)]'
        } shadow-[0_0_16px_rgba(44,23,12,.35)]`}
        exit={{ y: '-120%', rotate: 8 }}
        transition={{ duration: 0.72, ease: [0.4, 0, 0.2, 1] }}
        aria-hidden
      />
      <motion.div
        className={`absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 ${
          matte
            ? 'bg-gradient-to-b from-[#681329] via-[#c53a52] to-[#5b1023]'
            : 'bg-[repeating-linear-gradient(0deg,#765432_0_2px,#b58a58_2px_4px,#7b5937_4px_6px)]'
        } shadow-[0_0_16px_rgba(44,23,12,.35)]`}
        exit={{ x: '115%', rotate: -3 }}
        transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
        aria-hidden
      />
      <TwineBow matte={matte} />

      <motion.div
        className="absolute left-1/2 top-1/2 w-[min(84%,360px)] -translate-x-1/2 -translate-y-1/2"
        exit={{ y: 120, rotate: 9, opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
      >
        <GiftTag wrapper={wrapper} matte={matte} />
        <motion.button
          type="button"
          onClick={onUnwrap}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ y: 2, scale: 0.97 }}
          className={`mx-auto mt-6 flex min-h-11 touch-manipulation items-center gap-2 rounded-full border px-6 py-3 font-display text-sm font-extrabold tracking-tight shadow-[0_12px_30px_rgba(0,0,0,.28)] ${
            matte
              ? 'border-rose-200/20 bg-[#b52340] text-white'
              : 'border-[#3d352b]/20 bg-[#27312d] text-[#f5eddd]'
          }`}
        >
          <span aria-hidden>✨</span>
          {matte ? 'Break Seal' : 'Unwrap Gift'}
        </motion.button>
        {failed ? (
          <p
            role="alert"
            className={`mt-3 text-center text-[13px] ${matte ? 'text-rose-100/70' : 'text-[#2e2c27]/75'}`}
          >
            It didn&apos;t open. Check your connection and try again.
          </p>
        ) : null}
      </motion.div>
    </motion.section>
  );
}

function GiftTag({ wrapper, matte }: { wrapper: GiftWrapper; matte: boolean }) {
  return (
    <article
      className={`relative rotate-[-1.5deg] border p-5 shadow-[0_4px_8px_rgba(40,24,13,.2),0_20px_50px_rgba(40,24,13,.4)] ${
        matte
          ? 'border-[#916273]/35 bg-[#eadfd5] text-[#251c20]'
          : 'border-[#80694c]/30 bg-[#f0e4ca] text-[#2e2c27]'
      }`}
      style={{
        clipPath:
          'polygon(0 2%,6% 0,13% 2%,20% 0,28% 2%,36% 0,44% 2%,52% 0,60% 2%,68% 0,76% 2%,84% 0,92% 2%,100% 0,100% 98%,94% 100%,87% 98%,79% 100%,71% 98%,63% 100%,55% 98%,47% 100%,39% 98%,31% 100%,23% 98%,15% 100%,7% 98%,0 100%)',
        backgroundImage: 'radial-gradient(rgba(77,57,37,.1) .6px, transparent .8px)',
        backgroundSize: '5px 5px',
      }}
    >
      <span
        className="absolute -right-3 -top-3 h-14 w-5 rotate-12 rounded-full border-[3px] border-slate-500/70 shadow-md"
        aria-hidden
      />
      <p className="font-mono text-[8px] uppercase tracking-[0.23em] opacity-50">
        Private delivery
      </p>
      <div className="mt-4 grid grid-cols-[52px_1fr] gap-y-2 font-receipt text-sm">
        <span className="font-bold uppercase opacity-55">To:</span>
        <strong className="text-base">{wrapper.customerName}</strong>
        <span className="font-bold uppercase opacity-55">From:</span>
        <strong className="text-base">{wrapper.billerName}</strong>
      </div>
      <p
        className="mt-5 border-t border-current/15 pt-4 text-[15px] leading-relaxed"
        style={{ fontFamily: '"Bradley Hand", "Segoe Print", cursive' }}
      >
        “{wrapper.note}”
      </p>
      <p className="mt-4 text-right font-mono text-[8px] uppercase tracking-wider opacity-45">
        {wrapper.occasion} · {wrapper.date}
      </p>
    </article>
  );
}

/** A hand-stamped postmark: the occasion and the day, nothing about the product. */
function Postmark({ matte, occasion, date }: { matte: boolean; occasion: string; date: string }) {
  return (
    <div
      className={`pointer-events-none absolute left-7 top-7 rotate-[-7deg] rounded-md border-2 border-current px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.18em] ${
        matte ? 'text-rose-100/40' : 'text-[#4d3b2d]/45'
      }`}
    >
      {occasion}
      <span className="mt-1 block border-t border-current pt-1 text-center">{date}</span>
    </div>
  );
}

function CraftFibers() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-60"
      style={{
        backgroundImage:
          'radial-gradient(rgba(63,37,18,.28) .65px, transparent .9px), repeating-linear-gradient(16deg, transparent 0 7px, rgba(61,37,20,.07) 8px 9px)',
        backgroundSize: '7px 7px, auto',
      }}
      aria-hidden
    />
  );
}

function TwineBow({ matte }: { matte: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-16 w-24 -translate-x-1/2 -translate-y-1/2"
      exit={{ scale: 1.7, opacity: 0, rotate: 18 }}
      transition={{ duration: 0.55 }}
      aria-hidden
    >
      <span
        className={`absolute left-1 top-4 h-9 w-11 -rotate-[25deg] rounded-[50%] border-[5px] ${
          matte ? 'border-[#a9243d]' : 'border-[#8c6842]'
        }`}
      />
      <span
        className={`absolute right-1 top-4 h-9 w-11 rotate-[25deg] rounded-[50%] border-[5px] ${
          matte ? 'border-[#a9243d]' : 'border-[#8c6842]'
        }`}
      />
      <span
        className={`absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          matte ? 'bg-[#c33a51]' : 'bg-[#8c6842]'
        } shadow-md`}
      />
    </motion.div>
  );
}

function wrapSurface(matte: boolean): CSSProperties {
  if (matte) {
    return {
      background:
        'radial-gradient(circle at 28% 16%, rgba(255,255,255,.1), transparent 26%), linear-gradient(145deg, #31131d 0%, #170b10 58%, #090507 100%)',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,.65)',
    };
  }

  return {
    background: 'linear-gradient(145deg, rgba(255,255,255,.1), transparent 32%), #ad8153',
    boxShadow: 'inset 0 0 42px rgba(66,39,18,.25)',
  };
}

function playPaperUnwrap() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const duration = 0.9;
    const buffer = context.createBuffer(
      1,
      Math.floor(context.sampleRate * duration),
      context.sampleRate,
    );
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      const envelope = Math.sin((index / channel.length) * Math.PI);
      channel[index] = (Math.random() * 2 - 1) * envelope;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;

    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + duration);
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + duration);
    source.addEventListener('ended', () => void context.close());
  } catch {
    // Sound is progressive enhancement.
  }
}
