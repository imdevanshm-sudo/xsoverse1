'use client';

import { motion } from 'framer-motion';
import type { XsoData } from '@/types/xso';
import type { Artifact } from './shared';
import { SPRING } from './shared';

const MEMORY_IDS = ['receipt', 'audit', 'photos', 'letter'] as const;
const MEMORY_LABELS = ['Receipt', 'Audit', 'Photos', 'Letter'] as const;

function photoAt(data: XsoData, index: number) {
  return data.photos[index % Math.max(1, data.photos.length)] ?? '';
}

export function getScrapbookArtifacts(data: XsoData): Artifact[] {
  return MEMORY_IDS.map((id, index) => ({
    id,
    label: MEMORY_LABELS[index],
    rotation: [-3, 2, -1, 3][index],
    content: <ScrapbookMemory data={data} index={index} />,
  }));
}

export function getCorkboardArtifacts(data: XsoData): Artifact[] {
  return MEMORY_IDS.map((id, index) => ({
    id,
    label: MEMORY_LABELS[index],
    rotation: [-2, 2, -3, 1][index],
    content: <CorkboardMemory data={data} index={index} />,
  }));
}

export function ScrapbookMemory({
  data,
  index,
}: {
  data: XsoData;
  index: number;
}) {
  if (index === 0 || index === 2) {
    const caption =
      index === 0
        ? `${data.customerName} + ${data.billerName}`
        : `${data.greenFlags[0] ?? 'core memory'} ♡`;

    return (
      <article className="relative mx-auto w-[250px] rounded-[2px] border border-black/[0.06] bg-[#fffefa] p-3 pb-14 text-ink shadow-[0_2px_3px_rgba(44,28,17,.22),0_9px_18px_rgba(44,28,17,.25),0_26px_52px_rgba(44,28,17,.3)]">
        <WashiTape
          className="-left-5 -top-2 rotate-[-35deg]"
          tone="sage"
        />
        <WashiTape
          className="-right-5 -top-2 rotate-[32deg]"
          tone={index === 0 ? 'cream' : 'slate'}
        />
        <div className="relative overflow-hidden border border-black/10 bg-[#e8e1d6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoAt(data, index)}
            alt=""
            className="aspect-[4/5] w-full object-cover saturate-110 contrast-110"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-amber-200/15"
            aria-hidden
          />
        </div>
        <p
          className="mt-3 rotate-[-1deg] text-center text-sm font-bold leading-tight"
          style={{ fontFamily: '"Bradley Hand", "Segoe Print", cursive' }}
        >
          {caption}
        </p>
        <FoilStar className="bottom-2 right-4" />
      </article>
    );
  }

  if (index === 1) {
    return (
      <article className="relative mx-auto w-[270px] bg-[#e8eddd] px-5 pb-7 pt-8 text-[#26302a] shadow-[0_3px_5px_rgba(44,28,17,.22),0_14px_30px_rgba(44,28,17,.32),0_28px_50px_rgba(44,28,17,.2)]">
        <TornEdge edge="top" color="#e8eddd" />
        <TornEdge edge="bottom" color="#e8eddd" />
        <WashiTape className="-left-7 top-10 rotate-[-82deg]" tone="cream" />
        <Paperclip className="-right-1 -top-3 rotate-[13deg]" />
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-slate-600">
          Field note · friendship dept.
        </p>
        <h3
          className="mt-2 text-xl font-bold"
          style={{ fontFamily: '"Bradley Hand", "Segoe Print", cursive' }}
        >
          Extremely official audit
        </h3>
        <div className="mt-4 space-y-2 font-mono text-[10px] uppercase">
          {Object.entries(data.auditMetrics).map(([label, score]) => (
            <p key={label} className="flex items-center gap-2">
              <span className="w-20">{label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/10">
                <span
                  className="block h-full rounded-full bg-[#67776a]"
                  style={{ width: `${score}%` }}
                />
              </span>
              <strong>{score}</strong>
            </p>
          ))}
        </div>
        <PostalStamp className="-bottom-3 right-4 rotate-[-11deg]" />
      </article>
    );
  }

  return (
    <article className="relative mx-auto flex w-[282px] overflow-hidden bg-[#e7d8b8] text-[#273039] shadow-[0_3px_5px_rgba(44,28,17,.25),0_15px_30px_rgba(44,28,17,.35),0_30px_55px_rgba(44,28,17,.24)]">
      <WashiTape className="-right-7 top-8 rotate-[78deg]" tone="slate" />
      <div className="w-[72%] p-5">
        <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-slate-600">
          Admit one · memory archive
        </p>
        <h3 className="mt-2 font-display text-lg font-extrabold">
          {data.occasion}
        </h3>
        <p
          className="mt-3 line-clamp-4 text-xs leading-relaxed"
          style={{ fontFamily: '"Bradley Hand", "Segoe Print", cursive' }}
        >
          {data.birthdayMessage}
        </p>
        <p className="mt-4 font-mono text-[8px] uppercase tracking-wider">
          No expiry · No refunds
        </p>
      </div>
      <div className="relative flex w-[28%] items-center justify-center border-l border-dashed border-slate-700/40 bg-[#cf7862]">
        <span className="-rotate-90 whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#3a2522]">
          {data.id}
        </span>
      </div>
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-2"
        style={{
          background:
            'radial-gradient(circle at 5px -1px, transparent 5px, #e7d8b8 5.5px) 0 0/12px 8px repeat-x',
        }}
        aria-hidden
      />
    </article>
  );
}

export function AccordionPanel({
  data,
  index,
}: {
  data: XsoData;
  index: number;
}) {
  const headings = ['The Receipt', 'Friendship Report', 'Snapshots', 'A Letter'];
  return (
    <article
      className={`relative h-full overflow-hidden border-x-2 border-[#4a3828]/45 bg-[#eee0c5] px-8 text-[#33281f] ${
        index === 0 ? 'pb-7 pt-12' : 'py-7'
      }`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(45,31,20,.24) 0, transparent 2.5%, transparent 47.8%, rgba(45,31,20,.12) 48.6%, rgba(45,31,20,.44) 49.65%, rgba(255,255,255,.48) 50.3%, rgba(45,31,20,.12) 51.2%, transparent 52.2%, transparent 97.5%, rgba(45,31,20,.24) 100%), radial-gradient(ellipse at 22% 18%, rgba(255,255,255,.25), transparent 33%), radial-gradient(rgba(72,48,28,.12) .65px, transparent .85px)',
        backgroundSize: 'auto, auto, 5px 6px',
      }}
    >
      {index === 0 && <Grommets />}
      <p className="font-mono text-[9px] uppercase tracking-[0.24em] opacity-55">
        Panel {index + 1} · fold-out keepsake
      </p>
      <h3 className="mt-2 font-display text-2xl font-extrabold">{headings[index]}</h3>

      {index === 0 && (
        <div className="mt-5 font-receipt text-xs leading-relaxed">
          <p>{data.merchantName}</p>
          <div className="my-3 border-t border-dashed border-current/50" />
          {data.lineItems.slice(0, 5).map((item) => (
            <p key={item.id} className="flex justify-between gap-3">
              <span>{item.qty} {item.description}</span>
              <span>{item.price}</span>
            </p>
          ))}
          <p className="mt-4 flex justify-between text-base font-bold">
            <span>Total</span><span>{data.total}</span>
          </p>
        </div>
      )}
      {index === 1 && (
        <div className="mt-5 space-y-3">
          {Object.entries(data.auditMetrics).map(([label, score]) => (
            <div key={label}>
              <p className="flex justify-between font-mono text-[10px] uppercase">
                <span>{label}</span><strong>{score}</strong>
              </p>
              <div className="mt-1 h-2 border border-current/50">
                <div className="h-full bg-current" style={{ width: `${score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {index === 2 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {data.photos.slice(0, 4).map((photo, photoIndex) => (
            <div key={photoIndex} className="rotate-[-1deg] bg-white p-1.5 pb-5 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="aspect-square w-full object-cover" />
            </div>
          ))}
        </div>
      )}
      {index === 3 && (
        <div className="mt-5">
          <p className="font-receipt text-sm leading-relaxed">{data.birthdayMessage}</p>
          <p className="mt-6 font-receipt font-bold">Always, {data.billerName}</p>
          <p className="mt-8 border-2 border-dashed border-rose-700 px-3 py-2 text-center font-display text-xs font-bold text-rose-700">
            {data.certifiedStampText}
          </p>
        </div>
      )}
    </article>
  );
}

export function ViewMasterDisc({
  data,
  turn,
}: {
  data: XsoData;
  turn: number;
}) {
  const photos = data.photos.length > 0 ? data.photos : [''];

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 h-[410px] w-[410px] rounded-full border-[12px] border-[#090708] bg-[#151214] shadow-[inset_0_0_0_5px_#32292d,0_14px_40px_rgba(0,0,0,.65)]"
      animate={{ x: '-50%', y: '-50%', rotate: turn * 90 }}
      transition={SPRING}
      aria-hidden
    >
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = index * 45;
        return (
          <div
            key={index}
            className="absolute left-1/2 top-1/2 h-20 w-28 overflow-hidden rounded-md border-4 border-[#e4d4b8] bg-black"
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-146px) rotate(${-angle}deg)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[index % photos.length]}
              alt=""
              className="h-full w-full object-cover saturate-125"
            />
          </div>
        );
      })}
      <div className="absolute inset-[145px] rounded-full border-8 border-[#766d68] bg-[#1b1719] shadow-[inset_0_0_8px_#000]" />
    </motion.div>
  );
}

export function ViewMasterLenses({ data, turn }: { data: XsoData; turn: number }) {
  const photos = data.photos.length > 0 ? data.photos : [''];
  const current = turn % photos.length;

  return (
    <div className="pointer-events-none absolute inset-x-8 top-[190px] z-20 flex justify-between">
      {[current, (current + 1) % photos.length].map((photoIndex, index) => (
        <div
          key={`${photoIndex}-${index}`}
          className="h-28 w-32 overflow-hidden rounded-[45%] border-[7px] border-[#21050c] bg-black shadow-[inset_0_0_18px_#000,0_4px_8px_rgba(0,0,0,.4)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[photoIndex]}
            alt=""
            className="h-full w-full object-cover brightness-110 contrast-110"
          />
        </div>
      ))}
    </div>
  );
}

export function CorkboardMemory({
  data,
  index,
}: {
  data: XsoData;
  index: number;
}) {
  if (index === 2) {
    return (
      <article className="mx-auto w-[290px] rotate-[-1deg] bg-white p-3 pb-11 text-ink shadow-[0_4px_8px_rgba(60,32,15,.2),0_16px_28px_rgba(60,32,15,.38)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoAt(data, 0)} alt="" className="aspect-[4/5] w-full object-cover" />
        <p
          className="mt-3 text-center text-sm font-bold"
          style={{ fontFamily: '"Bradley Hand", "Segoe Print", cursive' }}
        >
          Us, obviously ♡
        </p>
      </article>
    );
  }

  return (
    <article
      className={`mx-auto w-[300px] border border-[#c9b98f] p-5 text-[#28313a] shadow-[0_12px_24px_rgba(60,32,15,.3)] ${
        index === 0 ? 'bg-[#fffdf1]' : index === 1 ? 'bg-[#fff4a8]' : 'bg-[#ffdfe9]'
      }`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent 0 27px, rgba(74,104,135,.2) 28px)',
      }}
    >
      <p className="font-mono text-[9px] uppercase tracking-widest opacity-55">
        {index === 0 ? 'Receipt index' : index === 1 ? 'Bestie scores' : 'Pinned note'}
      </p>
      <h3 className="mt-2 font-display text-xl font-extrabold">
        {index === 0
          ? data.merchantName
          : index === 1
            ? 'Friendship Audit'
            : `Dear ${data.customerName}`}
      </h3>
      {index === 0 && (
        <div className="mt-4 font-receipt text-xs">
          {data.lineItems.slice(0, 5).map((item) => (
            <p key={item.id} className="flex justify-between">
              <span>{item.description}</span><span>{item.price}</span>
            </p>
          ))}
          <p className="mt-4 font-bold">TOTAL: {data.total}</p>
        </div>
      )}
      {index === 1 && (
        <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
          {Object.entries(data.auditMetrics).map(([key, value]) => (
            <p key={key}>{key}: <strong>{value}</strong></p>
          ))}
        </div>
      )}
      {index === 3 && (
        <p
          className="mt-4 text-sm leading-relaxed"
          style={{ fontFamily: '"Bradley Hand", "Segoe Print", cursive' }}
        >
          {data.birthdayMessage}
        </p>
      )}
    </article>
  );
}

export function MovieMemoryFrame({
  data,
  index,
}: {
  data: XsoData;
  index: number;
}) {
  const titles = ['THE RECEIPT', 'THE AUDIT', 'THE SNAPSHOTS', 'THE LETTER'];

  return (
    <article className="relative flex h-full w-full items-center overflow-hidden bg-[#0b0909] px-5 py-12 text-[#f2dfb9]">
      <FrameSprockets side="top" />
      <FrameSprockets side="bottom" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, transparent 0 40%, #000 85%), repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.04) 4px)',
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full">
        <p className="font-receipt text-[9px] tracking-[0.3em] opacity-55">
          REEL {String(index + 1).padStart(2, '0')} · {data.id}
        </p>
        <h3 className="mt-2 font-display text-2xl font-extrabold">{titles[index]}</h3>
        {index === 0 && (
          <div className="mt-5 font-receipt text-xs">
            {data.lineItems.slice(0, 4).map((item) => (
              <p key={item.id} className="flex justify-between border-b border-white/10 py-1">
                <span>{item.description}</span><span>{item.price}</span>
              </p>
            ))}
            <p className="mt-4 text-lg font-bold">{data.total}</p>
          </div>
        )}
        {index === 1 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(data.auditMetrics).map(([key, value]) => (
              <span key={key} className="border border-current/40 px-2 py-1 font-mono text-[10px]">
                {key.toUpperCase()} {value}
              </span>
            ))}
          </div>
        )}
        {index === 2 && (
          <div className="mt-5 flex gap-3 overflow-hidden">
            {data.photos.slice(0, 3).map((photo, photoIndex) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photoIndex}
                src={photo}
                alt=""
                className="aspect-video min-w-0 flex-1 object-cover sepia-[.25] contrast-125"
              />
            ))}
          </div>
        )}
        {index === 3 && (
          <p className="mt-5 max-w-md font-receipt text-sm leading-relaxed">
            {data.birthdayMessage}
          </p>
        )}
      </div>
    </article>
  );
}

function WashiTape({
  className,
  tone,
}: {
  className: string;
  tone: 'cream' | 'sage' | 'slate';
}) {
  const colors = {
    cream: {
      base: 'rgba(232,218,178,.84)',
      stripe: 'rgba(255,255,255,.22)',
      glow: 'rgba(255,252,240,.35)',
    },
    sage: {
      base: 'rgba(160,177,151,.8)',
      stripe: 'rgba(255,255,255,.18)',
      glow: 'rgba(240,255,245,.3)',
    },
    slate: {
      base: 'rgba(106,122,132,.76)',
      stripe: 'rgba(255,255,255,.14)',
      glow: 'rgba(230,240,255,.28)',
    },
  }[tone];

  return (
    <span
      className={`pointer-events-none absolute z-20 h-8 w-28 shadow-[0_3px_6px_rgba(38,27,18,.22),0_1px_0_rgba(255,255,255,.35)_inset] ${className}`}
      style={{
        clipPath:
          'polygon(2% 14%, 8% 2%, 18% 10%, 28% 0, 40% 9%, 52% 1%, 64% 11%, 76% 0, 88% 10%, 97% 3%, 100% 82%, 94% 100%, 82% 90%, 70% 100%, 58% 91%, 46% 100%, 34% 89%, 22% 100%, 10% 88%, 0 96%)',
        backgroundColor: colors.base,
        backgroundImage: `
          linear-gradient(180deg, ${colors.glow} 0%, transparent 42%),
          repeating-linear-gradient(48deg, transparent 0 7px, ${colors.stripe} 7px 9px)
        `,
      }}
      aria-hidden
    />
  );
}

function TornEdge({
  edge,
  color,
}: {
  edge: 'top' | 'bottom';
  color: string;
}) {
  return (
    <svg
      className={`pointer-events-none absolute left-0 h-4 w-full ${
        edge === 'top' ? '-top-3' : '-bottom-3 rotate-180'
      }`}
      viewBox="0 0 270 16"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0 16V8L8 11 16 4 25 10 35 2 45 9 57 3 69 11 80 5 92 12 104 2 116 9 128 4 140 12 151 3 164 10 176 5 188 12 201 2 214 9 226 4 238 11 250 3 261 9 270 5V16Z"
        fill={color}
      />
    </svg>
  );
}

function Paperclip({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute z-30 h-14 w-5 rounded-full border-[3px] border-slate-500/80 shadow-[2px_3px_4px_rgba(30,30,30,.2)] ${className}`}
      aria-hidden
    >
      <span className="absolute inset-[3px] rounded-full border border-slate-400/80" />
    </span>
  );
}

function FoilStar({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute text-xl drop-shadow-[1px_3px_3px_rgba(62,45,17,.35)] ${className}`}
      style={{ color: '#b99545' }}
      aria-hidden
    >
      ✦
    </span>
  );
}

function PostalStamp({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute z-20 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#8b4b45]/60 font-mono text-[7px] font-bold uppercase leading-tight text-[#8b4b45]/70 ${className}`}
      aria-hidden
    >
      archived
      <span className="absolute -right-8 top-5 h-px w-12 bg-[#8b4b45]/50 shadow-[0_4px_0_rgba(139,75,69,.35),0_8px_0_rgba(139,75,69,.25)]" />
    </span>
  );
}

function Grommets() {
  return (
    <>
      {[30, 70].map((left) => (
        <span
          key={left}
          className="absolute top-3 h-5 w-5 rounded-full border-[5px] border-[#746451] bg-[#332a22] shadow-[inset_0_1px_3px_#000,0_2px_2px_rgba(255,255,255,.4)]"
          style={{ left: `${left}%` }}
          aria-hidden
        />
      ))}
    </>
  );
}

function FrameSprockets({ side }: { side: 'top' | 'bottom' }) {
  return (
    <div
      className={`absolute inset-x-2 z-20 flex justify-around ${
        side === 'top' ? 'top-2' : 'bottom-2'
      }`}
      aria-hidden
    >
      {Array.from({ length: 12 }).map((_, index) => (
        <span
          key={index}
          className="h-3 w-5 rounded-[2px] border border-[#8e7652]/40 bg-[#c0a576]"
        />
      ))}
    </div>
  );
}
