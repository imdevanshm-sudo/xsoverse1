'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XsoViewer } from '@/components/xso/XsoViewer';
import { PhoneFrame } from '@/components/xso/PhoneFrame';
import {
  getMockXsoData,
  type GiftStyle,
  type XsoData,
} from '@/types/xso';
import { GIFT_STYLES } from '@/lib/xsoPayload';

export function GiftUnboxing({ giftId }: { giftId: string }) {
  const [data, setData] = useState<XsoData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUnwrapped, setIsUnwrapped] = useState(false);
  const note = useMemo(
    () => (data ? giftTagNote(data, giftId) : ''),
    [data, giftId],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/gifts/${giftId}`);
        if (response.ok) {
          const json = (await response.json()) as { data: XsoData };
          if (!cancelled) {
            setData(json.data);
            setLoadError(null);
          }
          return;
        }

        if (response.status === 402) {
          if (!cancelled) {
            setLoadError('Payment confirmed pending — refreshing…');
            window.setTimeout(() => {
              void load();
            }, 1200);
          }
          return;
        }

        if (response.status === 404 && giftId.startsWith('xso_')) {
          if (!cancelled) {
            setLoadError('Gift not found. Complete checkout to generate this link.');
          }
          return;
        }
      } catch {
        // Fall through to personalized mock for demo ids.
      }

      if (!cancelled) {
        setData(personalizeGift(giftId));
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [giftId]);

  if (loadError && !data) {
    return (
      <div className="mx-auto w-full max-w-sm px-3 py-16 text-center">
        <p className="font-mono text-sm text-amber-200/85">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-sm px-3 py-16 text-center font-mono text-sm text-white/50">
        Loading gift…
      </div>
    );
  }

  const unwrap = () => {
    if (isUnwrapped) return;
    playPaperUnwrap();
    setIsUnwrapped(true);
  };

  return (
    <div className="mx-auto w-full max-w-sm px-3 py-5 sm:py-8">
      <p className="mb-5 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
        One-of-one souvenir · {shortCode(giftId)}
      </p>
      {loadError && (
        <p className="mb-4 text-center font-mono text-[11px] text-amber-200/80">
          {loadError}
        </p>
      )}

      <PhoneFrame>
        <AnimatePresence>
          {isUnwrapped ? (
            <motion.div
              key="souvenir"
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            >
              <XsoViewer data={data} contained={false} />
              <motion.p
                className="pointer-events-none absolute bottom-16 left-4 z-30 rounded-full border border-white/10 bg-black/80 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/60"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Handcrafted for {data.customerName} · {shortCode(giftId)}
              </motion.p>
            </motion.div>
          ) : (
            <GiftWrap
              key="gift-wrap"
              data={data}
              giftId={giftId}
              note={note}
              onUnwrap={unwrap}
            />
          )}
        </AnimatePresence>
      </PhoneFrame>
    </div>
  );
}

function GiftWrap({
  data,
  giftId,
  note,
  onUnwrap,
}: {
  data: XsoData;
  giftId: string;
  note: string;
  onUnwrap: () => void;
}) {
  const matte = data.giftStyle === 'moviebox';
  const presentation = data.giftStyle === 'accordion' ? 'booklet' : data.giftStyle;

  return (
    <motion.section
      className={`absolute inset-0 z-40 overflow-hidden rounded-3xl border ${
        matte
          ? 'border-rose-200/10 bg-[#180b10]'
          : 'border-[#c8a97c]/35 bg-[#ad8153]'
      }`}
      style={{ perspective: 1100 }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.035 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Wrapped ${presentation} gift for ${data.customerName}`}
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
      <StyleStamp style={data.giftStyle} date={data.timestamp.split(' ')[0]} />

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
        <GiftTag data={data} giftId={giftId} note={note} matte={matte} />
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
      </motion.div>
    </motion.section>
  );
}

function GiftTag({
  data,
  giftId,
  note,
  matte,
}: {
  data: XsoData;
  giftId: string;
  note: string;
  matte: boolean;
}) {
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
        backgroundImage:
          'radial-gradient(rgba(77,57,37,.1) .6px, transparent .8px)',
        backgroundSize: '5px 5px',
      }}
    >
      <span
        className="absolute -right-3 -top-3 h-14 w-5 rotate-12 rounded-full border-[3px] border-slate-500/70 shadow-md"
        aria-hidden
      />
      <p className="font-mono text-[8px] uppercase tracking-[0.23em] opacity-50">
        Private delivery · {shortCode(giftId)}
      </p>
      <div className="mt-4 grid grid-cols-[52px_1fr] gap-y-2 font-receipt text-sm">
        <span className="font-bold uppercase opacity-55">To:</span>
        <strong className="text-base">{data.customerName}</strong>
        <span className="font-bold uppercase opacity-55">From:</span>
        <strong className="text-base">{data.billerName}</strong>
      </div>
      <p
        className="mt-5 border-t border-current/15 pt-4 text-[15px] leading-relaxed"
        style={{ fontFamily: '"Bradley Hand", "Segoe Print", cursive' }}
      >
        “{note}”
      </p>
      <p className="mt-4 text-right font-mono text-[8px] uppercase tracking-wider opacity-45">
        {data.occasion} · {data.timestamp.split(' ')[0]}
      </p>
    </article>
  );
}

function StyleStamp({ style, date }: { style: GiftStyle; date: string }) {
  const darkWrapper = style === 'moviebox';

  return (
    <div
      className={`pointer-events-none absolute left-7 top-7 rotate-[-7deg] rounded-md border-2 border-current px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.18em] ${
        darkWrapper ? 'text-rose-100/40' : 'text-[#4d3b2d]/45'
      }`}
    >
      {style} edition
      <span className="mt-1 block border-t border-current pt-1 text-center">
        {date}
      </span>
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
    background:
      'linear-gradient(145deg, rgba(255,255,255,.1), transparent 32%), #ad8153',
    boxShadow: 'inset 0 0 42px rgba(66,39,18,.25)',
  };
}

function personalizeGift(giftId: string): XsoData {
  const mock = getMockXsoData();
  const hash = hashString(giftId || mock.id);
  const explicitStyle = GIFT_STYLES.find((style) =>
    giftId.toLowerCase().includes(style),
  );
  const giftStyle = explicitStyle ?? GIFT_STYLES[hash % GIFT_STYLES.length];
  const code = shortCode(giftId);

  return {
    ...mock,
    id: giftId || mock.id,
    giftStyle,
    occasion: `${mock.occasion} · ${code}`,
    certifiedStampText: `${mock.certifiedStampText} · ${code}`,
    birthdayMessage: `${mock.birthdayMessage}\n\nP.S. ${mock.greenFlags[
      hash % mock.greenFlags.length
    ].toLowerCase()} — still undefeated.`,
  };
}

function giftTagNote(data: XsoData, giftId: string) {
  const index = hashString(giftId) % data.lineItems.length;
  const memory = data.lineItems[index].description.toLowerCase();
  return `Open this when you miss our ${memory}. — ${data.billerName.charAt(0)}`;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shortCode(value: string) {
  return (value || 'xso-gift').replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
}

function playPaperUnwrap() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
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
