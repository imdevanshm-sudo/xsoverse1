'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PhoneFrame } from '@/components/xso/PhoneFrame';
import {
  AccordionRibbon,
  MemoryDeck,
  MovieBox,
  RewindStack,
  ScrapbookDesk,
  preloadFormat,
} from '@/components/xso/preview/FormatPreview';
import { ImmersivePrompt } from '@/components/xso/ImmersivePrompt';
import { RecipientPreloader } from '@/components/xso/RecipientPreloader';
import {
  TEXTURES,
  collectImageUrls,
  preloadImages,
  useAssetPreloader,
} from '@/hooks/useAssetPreloader';
import { PreviewWatermark } from '@/components/xso/PreviewWatermark';
import { FitStage } from '@/components/xso/stage/FitStage';
import { FirstVisitHint } from '@/components/xso/stage/FirstVisitHint';
import { SoundToggle } from '@/components/xso/stage/SoundToggle';
import { playSfx, preloadSfx } from '@/lib/sfx';
import type { GiftWrapper } from '@/lib/giftWrapper';
import { RECIPIENT_OFFER, recipientOfferPrice } from '@/lib/pricing';
import { track } from '@/lib/analytics';
import type { GiftStyle, XsoData } from '@/types/xso';

type Phase = 'wrapped' | 'opening';

/** What to do first, per format; the Movie Box has its own Play button instead. */
const HINTS: Partial<Record<GiftStyle, string>> = {
  scrapbook: 'Tap anything to open it',
  loop: 'Tap or swipe the top card',
  rewind: 'Tap or swipe to rewind',
  accordion: 'Scroll to unfold it',
};

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
  const opening = useRef(false);
  const [finished, setFinished] = useState(false);
  const finish = useCallback(() => setFinished(true), []);
  const latest = useRef({ giftId, draft, style: wrapper.giftStyle });
  latest.current = { giftId, draft, style: wrapper.giftStyle };

  /** Contents, their photos and the format's code all load while the wrap tears away. */
  const unwrap = useCallback(() => {
    if (opening.current) return;
    opening.current = true;
    const { giftId: id, draft: local, style } = latest.current;
    playSfx('parcel-unwrap', 0.7);
    setFailed(false);
    setPhase('opening');
    const run = ++attempt.current;
    const code = preloadFormat(style);
    const load = local ? Promise.resolve(local) : fetchContents(id);
    load
      .then(async (data) => {
        await Promise.all([preloadImages(collectImageUrls(data)), code]);
        if (run === attempt.current) setContents(data);
      })
      .catch(() => {
        if (run !== attempt.current) return;
        opening.current = false;
        setFailed(true);
        setWrapGone(false);
        setPhase('wrapped');
      });
  }, []);

  /**
   * The Accordion's lit desk sits under the parcel from the start, and the folded letter mounts
   * beneath the flaps as soon as it arrives, so opening never passes through black.
   */
  const lit = wrapper.giftStyle === 'accordion';
  const content = (
    <>
      {lit ? <AccordionDesk /> : null}
      <AnimatePresence onExitComplete={() => setWrapGone(true)}>
        {phase === 'wrapped' ? (
          <GiftWrap
            key="gift-wrap"
            wrapper={wrapper}
            failed={failed}
            reduce={reduce}
            onUnwrap={unwrap}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {(wrapGone || lit) && contents ? (
          <motion.div
            key="souvenir"
            className="absolute inset-0"
            initial={reduce ? false : lit ? { opacity: 0, y: 48 } : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: lit ? 0.9 : 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <Souvenir data={contents} cta={!framed} held={!wrapGone} onFinish={finish} />
            {!wrapGone || framed || !HINTS[contents.giftStyle] ? null : (
              <FirstVisitHint text={HINTS[contents.giftStyle]!} />
            )}
            {!wrapGone || framed || contents.giftStyle === 'moviebox' ? null : (
              <>
                <SoundToggle />
                {/* The Accordion offers this as its own last fold, below the letter. */}
                <MakeOneBack ended={finished && contents.giftStyle !== 'accordion'} />
              </>
            )}
          </motion.div>
        ) : wrapGone ? (
          <OpeningDot key="opening" lit={lit} />
        ) : null}
      </AnimatePresence>
    </>
  );

  if (framed) {
    return (
      <div className="mx-auto my-auto flex w-full max-w-md flex-1 flex-col justify-center p-4 pt-16 sm:p-6 sm:pt-16 md:max-w-sm md:flex-none md:py-8">
        <PhoneFrame className="receiver-stage">{content}</PhoneFrame>
        {watermark ? <PreviewWatermark /> : null}
      </div>
    );
  }

  return (
    <>
      <ImmersivePrompt id={giftId} hold={!ready}>
        <RecipientCanvas wide={wrapper.giftStyle === 'moviebox'}>{content}</RecipientCanvas>
      </ImmersivePrompt>
      <AnimatePresence>{ready ? null : <RecipientPreloader key="preloader" />}</AnimatePresence>
      {watermark ? <PreviewWatermark /> : null}
    </>
  );
}

/**
 * The way back to the store from a received gift, in two sizes: a quiet pill that stays in the
 * corner once the gift has been open a while, and a clear call to action when the viewer reaches
 * the end of it. Both carry the gift-back price while that offer is live.
 */
const MakeOneBack = memo(function MakeOneBack({ ended }: { ended: boolean }) {
  const reduce = Boolean(useReducedMotion());
  const [pill, setPill] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const offer = recipientOfferPrice();
  const href = `/?ref=${RECIPIENT_OFFER.ref}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setPill(true), 6000);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ended || dismissed) return;
    const timer = window.setTimeout(() => setSheet(true), 1200);
    return () => window.clearTimeout(timer);
  }, [ended, dismissed]);

  const dismiss = () => {
    setSheet(false);
    setDismissed(true);
  };

  return (
    <>
      <AnimatePresence>
        {pill && !sheet ? (
          <motion.a
            key="make-one-back"
            href={href}
            onClick={() => track('make_one_back', { source: 'pill' })}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-40 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 font-receipt text-[12px] uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm transition-colors hover:border-[#fdba74]/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
          >
            Make one back
            {offer ? <span className="text-[#fdba74]">{offer}</span> : null}
          </motion.a>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {sheet ? (
          <motion.aside
            key="make-one-back-sheet"
            aria-label="Make one back"
            className="absolute inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-[70] mx-auto max-w-[420px] rounded-[28px] border border-white/10 bg-[#1b0f15]/95 p-5 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] backdrop-blur-md"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
            transition={
              reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 220, damping: 26 }
            }
          >
            <p className="font-receipt text-[12px] uppercase tracking-[0.2em] text-[#e0b4c6]">
              Your turn
            </p>
            <p className="mt-1 font-serif text-[22px] font-semibold leading-tight text-[#fffaf0]">
              Someone you love deserves one too.
            </p>
            <a
              href={href}
              onClick={() => track('make_one_back', { source: 'end' })}
              className="matte-cta mt-4 flex min-h-[3.75rem] w-full flex-col items-center justify-center rounded-full px-6 font-serif text-[20px] font-semibold leading-tight shadow-[0_14px_40px_rgba(236,72,153,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdba74]"
            >
              Make one back
              {offer ? (
                <span className="mt-0.5 font-receipt text-[12px] font-normal uppercase tracking-[0.16em] opacity-90">
                  Yours for {offer}
                </span>
              ) : null}
            </a>
            <button
              type="button"
              onClick={dismiss}
              className="mt-2 min-h-11 px-4 font-receipt text-[12px] uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
            >
              Keep looking
            </button>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
});

/** The Accordion's desk: the same lamp-lit surface the ribbon unfolds on. */
const AccordionDesk = memo(function AccordionDesk() {
  return (
    <div aria-hidden className="stage-surface absolute inset-0 overflow-hidden bg-[#180e15]">
      <div className="accordion-aura pointer-events-none absolute inset-0" />
    </div>
  );
});

/** Held between the wrap clearing and the contents arriving, if the network is slower than the animation. */
const OpeningDot = memo(function OpeningDot({ lit = false }: { lit?: boolean }) {
  return (
    <motion.div
      className={`absolute inset-0 grid place-items-center ${lit ? '' : 'bg-black'}`}
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
});

/**
 * Every pixel belongs to the gift. Phones are full-bleed; wider screens get one wide canvas
 * (up to 1200px) that the format scales up to fill, on a dim backdrop instead of dead black.
 */
const RecipientCanvas = memo(function RecipientCanvas({
  children,
  wide = false,
}: {
  children: ReactNode;
  /** Full-bleed on every screen, for formats that compose their own stage (the Movie Box). */
  wide?: boolean;
}) {
  return (
    <div
      className={`recipient-stage fixed inset-0 bg-black ${wide ? '' : 'recipient-backdrop md:p-6'}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        className={`relative mx-auto h-full w-full overflow-hidden ${wide ? '' : 'max-w-[1200px] md:rounded-[28px] md:shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)]'}`}
      >
        {children}
      </div>
    </div>
  );
});

/** Card stacks stay vertically centred inside a phone-height band instead of running edge to edge. */
const CARD_STAGE = 'flex h-full max-h-[600px] w-full items-center justify-center max-md:h-[80svh]';
/** The phone-sized box the card formats are composed in; FitStage scales it to the canvas. */
const CARD_DESIGN = { width: 420, height: 600 };

const Souvenir = memo(function Souvenir({
  data,
  cta,
  held,
  onFinish,
}: {
  data: XsoData;
  cta: boolean;
  /** Still under the wrap: formats that animate in wait for it to clear. */
  held: boolean;
  onFinish: () => void;
}) {
  switch (data.giftStyle) {
    case 'rewind':
      return (
        <div className="stage-surface flex h-full items-center justify-center overflow-hidden bg-[#1a0f14] px-4 py-6">
          <FitStage {...CARD_DESIGN}>
            <div className={CARD_STAGE}>
              <RewindStack data={data} size="fill" onFinish={onFinish} />
            </div>
          </FitStage>
        </div>
      );
    case 'scrapbook':
      return (
        <div className="scrap-wood h-full touch-manipulation overflow-hidden">
          <ScrapbookDesk data={data} size="fill" onFinish={onFinish} />
        </div>
      );
    case 'accordion':
      return (
        <div className="stage-surface flex h-full justify-center overflow-hidden bg-[#180e15] px-2 pb-3 pt-14 md:px-6 md:pb-5 md:pt-16">
          <AccordionRibbon data={data} size="fill" held={held} cta={cta} onFinish={onFinish} />
        </div>
      );
    case 'moviebox':
      return (
        <div className="h-full overflow-hidden bg-[#050203]">
          <MovieBox data={data} size="fill" cta={cta} />
        </div>
      );
    default:
      return (
        <div className="stage-surface flex h-full items-center justify-center overflow-hidden bg-[#1a0f14] px-4 py-6">
          <FitStage {...CARD_DESIGN}>
            <div className={CARD_STAGE}>
              <MemoryDeck data={data} size="fill" onFinish={onFinish} />
            </div>
          </FitStage>
        </div>
      );
  }
});

/** Gravity: slow to start, quick to leave. */
const FALL = [0.55, 0, 0.85, 0.35] as const;
/** The flaps swing open on hinges at the outer edges, like a lid lifted off. */
const HINGE = [0.65, 0, 0.3, 1] as const;
/** The twine goes first; the paper only opens once it's free. */
const FLAPS_AT = 0.32;

const GiftWrap = memo(function GiftWrap({
  wrapper,
  failed,
  reduce,
  onUnwrap,
}: {
  wrapper: GiftWrapper;
  failed: boolean;
  reduce: boolean;
  onUnwrap: () => void;
}) {
  const matte = wrapper.giftStyle === 'moviebox';
  const presentation = wrapper.giftStyle === 'accordion' ? 'booklet' : wrapper.giftStyle;
  const backing = matte ? '24, 11, 16' : '173, 129, 83';
  const preload = () => preloadSfx('parcel-unwrap');
  /** With reduced motion the parcel simply fades; nothing inside it moves. */
  const move = <T,>(exit: T) => (reduce ? undefined : exit);

  return (
    <motion.section
      className={`absolute inset-0 z-40 overflow-hidden md:rounded-3xl md:border ${
        matte ? 'border-rose-200/10' : 'border-[#c8a97c]/35'
      }`}
      style={{ perspective: 1100, backgroundColor: `rgba(${backing}, 1)` }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0.35 } }
          : {
              backgroundColor: `rgba(${backing}, 0)`,
              borderColor: 'rgba(0, 0, 0, 0)',
              opacity: 0,
              transition: {
                backgroundColor: { delay: FLAPS_AT, duration: 0.35 },
                borderColor: { delay: FLAPS_AT, duration: 0.35 },
                opacity: { delay: FLAPS_AT + 0.7, duration: 0.3 },
              },
            }
      }
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Wrapped ${presentation} gift for ${wrapper.customerName}`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 w-[51%] origin-left"
        style={wrapSurface(matte)}
        exit={move({ rotateY: -112, x: '-6%', filter: 'brightness(0.7)' })}
        transition={{ delay: FLAPS_AT, duration: 0.95, ease: HINGE }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 w-[51%] origin-right"
        style={wrapSurface(matte)}
        exit={move({ rotateY: 112, x: '6%', filter: 'brightness(0.7)' })}
        transition={{ delay: FLAPS_AT + 0.05, duration: 0.95, ease: HINGE }}
      />

      {!matte && <CraftFibers />}
      <Postmark matte={matte} occasion={wrapper.occasion} date={wrapper.date} />

      <motion.div
        className={`absolute inset-y-0 left-[calc(50%-14px)] w-7 ${
          matte
            ? 'bg-gradient-to-r from-[#681329] via-[#c53a52] to-[#5b1023]'
            : 'bg-[repeating-linear-gradient(90deg,#765432_0_2px,#b58a58_2px_4px,#7b5937_4px_6px)]'
        } shadow-[0_0_16px_rgba(44,23,12,.35)]`}
        exit={move({ y: '115%', rotate: 4, opacity: 0.6 })}
        transition={{ delay: 0.08, duration: 0.6, ease: FALL }}
        aria-hidden
      />
      <motion.div
        className={`absolute inset-x-0 top-[calc(17%-14px)] h-7 ${
          matte
            ? 'bg-gradient-to-b from-[#681329] via-[#c53a52] to-[#5b1023]'
            : 'bg-[repeating-linear-gradient(0deg,#765432_0_2px,#b58a58_2px_4px,#7b5937_4px_6px)]'
        } shadow-[0_0_16px_rgba(44,23,12,.35)]`}
        exit={move({ y: '2400%', rotate: -7, opacity: 0.6 })}
        transition={{ delay: 0.12, duration: 0.7, ease: FALL }}
        aria-hidden
      />
      <TwineBow matte={matte} reduce={reduce} />

      <div className="absolute left-1/2 top-1/2 z-20 w-[min(84%,360px)] -translate-x-1/2 -translate-y-1/2 md:w-[min(84%,420px)]">
        <motion.div
          exit={move({ y: 220, rotate: 11, opacity: 0 })}
          transition={{ duration: 0.6, ease: FALL }}
        >
          <GiftTag
            wrapper={wrapper}
            matte={matte}
            handwritten={wrapper.giftStyle === 'accordion'}
            reduce={reduce}
          />
          <motion.button
            type="button"
            onPointerEnter={preload}
            onPointerDown={preload}
            onFocus={preload}
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
      </div>
    </motion.section>
  );
});

/** Deckled top and bottom edges, as if torn from a sheet. */
const TAG_EDGE =
  'polygon(0 2%,6% 0,13% 2%,20% 0,28% 2%,36% 0,44% 2%,52% 0,60% 2%,68% 0,76% 2%,84% 0,92% 2%,100% 0,100% 98%,94% 100%,87% 98%,79% 100%,71% 98%,63% 100%,55% 98%,47% 100%,39% 98%,31% 100%,23% 98%,15% 100%,7% 98%,0 100%)';

/** Hung from the twine at its top corner, the tag drifts a few degrees either way. */
const SWAY = { rotate: [-2.4, 0.8, -2.4] };
const SWAY_TIME = { duration: 5.5, ease: 'easeInOut', repeat: Infinity } as const;

const GiftTag = memo(function GiftTag({
  wrapper,
  matte,
  handwritten = false,
  reduce = false,
}: {
  wrapper: GiftWrapper;
  matte: boolean;
  /** The Accordion's tag: written by hand at reading size, and swaying on its string. */
  handwritten?: boolean;
  reduce?: boolean;
}) {
  if (handwritten) {
    return (
      <motion.article
        className="relative border border-[#80694c]/30 bg-[#f0e4ca] px-6 pb-5 pt-6 text-[#2e2c27] shadow-[0_4px_8px_rgba(40,24,13,.2),0_20px_50px_rgba(40,24,13,.4)] md:px-8 md:pb-6 md:pt-7"
        style={{
          rotate: -1.5,
          transformOrigin: '92% 0%',
          clipPath: TAG_EDGE,
          backgroundImage: 'radial-gradient(rgba(77,57,37,.1) .6px, transparent .8px)',
          backgroundSize: '5px 5px',
        }}
        animate={reduce ? undefined : SWAY}
        transition={SWAY_TIME}
      >
        <span
          aria-hidden
          className="absolute right-5 top-3 h-3.5 w-3.5 rounded-full border-2 border-[#80694c]/50 bg-[#ad8153]/40 shadow-inner"
        />
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 font-hand">
          <dt className="text-[17px] uppercase tracking-wide opacity-60 md:text-lg">To</dt>
          <dd className="truncate text-[28px] font-bold leading-tight md:text-[34px]">
            {wrapper.customerName}
          </dd>
          <dt className="text-[17px] uppercase tracking-wide opacity-60 md:text-lg">From</dt>
          <dd className="truncate text-[28px] font-bold leading-tight md:text-[34px]">
            {wrapper.billerName}
          </dd>
        </dl>
        <p className="mt-4 border-t border-current/15 pt-3 font-hand text-[21px] leading-snug md:text-2xl">
          “{wrapper.note}”
        </p>
        <p className="mt-3 text-right font-receipt text-[12px] uppercase tracking-wider opacity-55 md:text-[13px]">
          {wrapper.occasion} · {wrapper.date}
        </p>
      </motion.article>
    );
  }
  return (
    <article
      className={`relative rotate-[-1.5deg] border p-5 shadow-[0_4px_8px_rgba(40,24,13,.2),0_20px_50px_rgba(40,24,13,.4)] ${
        matte
          ? 'border-[#916273]/35 bg-[#eadfd5] text-[#251c20]'
          : 'border-[#80694c]/30 bg-[#f0e4ca] text-[#2e2c27]'
      }`}
      style={{
        clipPath: TAG_EDGE,
        backgroundImage: 'radial-gradient(rgba(77,57,37,.1) .6px, transparent .8px)',
        backgroundSize: '5px 5px',
      }}
    >
      <span
        className="absolute -right-3 -top-3 h-14 w-5 rotate-12 rounded-full border-[3px] border-slate-500/70 shadow-md"
        aria-hidden
      />
      <div className="grid grid-cols-[52px_1fr] gap-y-2 font-receipt text-sm">
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
});

/** A hand-stamped postmark: the occasion and the day, nothing about the product. */
const Postmark = memo(function Postmark({
  matte,
  occasion,
  date,
}: {
  matte: boolean;
  occasion: string;
  date: string;
}) {
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
});

const CraftFibers = memo(function CraftFibers() {
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
});

/** On unwrap the loops slacken and spread apart, then the whole knot drops off the parcel. */
const TwineBow = memo(function TwineBow({ matte, reduce }: { matte: boolean; reduce: boolean }) {
  const loop = `absolute top-4 h-9 w-11 rounded-[50%] border-[5px] ${
    matte ? 'border-[#a9243d]' : 'border-[#8c6842]'
  }`;
  return (
    <motion.div
      className="pointer-events-none absolute left-[calc(50%-48px)] top-[calc(17%-32px)] z-10 h-16 w-24"
      exit={reduce ? undefined : { y: 520, rotate: 32, opacity: 0.5 }}
      transition={{ delay: 0.14, duration: 0.65, ease: FALL }}
      aria-hidden
    >
      <motion.span
        className={`${loop} left-1`}
        style={{ rotate: -25 }}
        exit={reduce ? undefined : { rotate: -70, x: -16, scaleY: 0.6 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
      <motion.span
        className={`${loop} right-1`}
        style={{ rotate: 25 }}
        exit={reduce ? undefined : { rotate: 70, x: 16, scaleY: 0.6 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />
      <span
        className={`absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full ${
          matte ? 'bg-[#c33a51]' : 'bg-[#8c6842]'
        } shadow-md`}
      />
    </motion.div>
  );
});

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
