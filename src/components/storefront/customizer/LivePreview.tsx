'use client';

import { memo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CRAFT_TONES, type CraftTone, type Relationship } from '@/lib/aiCraft';
import { displayTitle, getCartridge } from '@/lib/cartridges';
import { AUDIT_KEYS } from '@/lib/formats';
import { FORMAT_CARDS, type CardId } from '@/lib/formatCards';
import { resolveScrapbook } from '@/lib/scrapbook';
import { FormatThumb } from '@/components/storefront/customizer/FormatThumb';
import type { GiftStyle, XsoData } from '@/types/xso';

function PaneLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 font-receipt text-[10px] uppercase tracking-[0.2em] text-[#fdba74]">
      <span aria-hidden className="led-peach" />
      {children}
    </p>
  );
}

/** Step 1: the selected format, rendered for real and flipped in on every change. */
export const FormatShowcase = memo(function FormatShowcase({
  data,
  style,
}: {
  data: XsoData;
  style: GiftStyle;
}) {
  const reduce = useReducedMotion();
  const cart = getCartridge(style);
  return (
    <div>
      <PaneLabel>Live preview · {displayTitle(cart)}</PaneLabel>
      <div className="[perspective:1200px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={style}
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -28, scale: 0.94 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 28, scale: 0.94 }}
            transition={{ duration: reduce ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]"
            style={{ boxShadow: `0 0 0 1px ${cart.accentSoft}, 0 24px 60px -20px rgba(0,0,0,.8)` }}
          >
            <FormatThumb data={data} style={style} fit interactive />
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center font-serif text-[15px] font-semibold text-[#fed7aa]">
        {cart.tagline}
      </p>
    </div>
  );
});

const CARD_W = 128;
const CARD_H = 172;
/** Room the fan may spread across; matches the pane's mobile width. */
const FAN_W = 290;

function CardFace({ id, data }: { id: CardId; data: XsoData }) {
  const scrap = resolveScrapbook(data);
  switch (id) {
    case 'receipt':
      return (
        <div className="flex h-full flex-col bg-[#fffaf3] p-3 font-receipt text-[8px] uppercase leading-tight text-[#2d1b22]">
          <p className="text-center text-[9.5px] font-bold">{data.merchantName}</p>
          <p className="mt-1 text-center text-[#9a6b7b]">Customer: {data.customerName}</p>
          <div className="mt-2 grid gap-1 border-t border-dashed border-[#e8bfd0] pt-2">
            {data.lineItems.slice(0, 4).map((item) => (
              <p key={item.id} className="flex justify-between gap-1">
                <span className="truncate">{item.description}</span>
                <span className="shrink-0">{item.price}</span>
              </p>
            ))}
          </div>
          <p className="mt-auto flex justify-between border-t border-[#2d1b22] pt-1 text-[9px] font-bold">
            <span>Total</span>
            <span>{data.total}</span>
          </p>
        </div>
      );
    case 'audit':
      return (
        <div className="flex h-full flex-col bg-[#fdf2f8] p-3 font-receipt text-[8px] uppercase text-[#2d1b22]">
          <p className="text-[9px] font-bold tracking-[0.12em]">Friendship audit</p>
          <div className="mt-2 grid gap-1.5">
            {AUDIT_KEYS.map((key) => (
              <div key={key}>
                <p className="truncate text-[#9a6b7b]">{data.auditLabels?.[key] ?? key}</p>
                <span className="mt-0.5 block h-1.5 rounded-full bg-[#f3d3e0]">
                  <span
                    className="block h-full rounded-full bg-[#ec4899]"
                    style={{ width: `${Math.min(100, data.auditMetrics[key])}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
          <p className="mt-auto -rotate-6 self-center rounded border-2 border-[#be185d] px-1.5 py-0.5 text-[8px] font-bold text-[#be185d]">
            {data.certifiedStampText}
          </p>
        </div>
      );
    case 'photos':
    case 'polaroids':
      return (
        <div className="flex h-full flex-col gap-1.5 bg-[#1f1418] p-2.5">
          {data.photos.slice(0, id === 'polaroids' ? 1 : 3).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="min-h-0 w-full flex-1 rounded-sm bg-white object-cover p-0.5"
            />
          ))}
          {id === 'polaroids' ? (
            <p className="truncate text-center font-hand text-[13px] text-[#fdf2f8]">
              {scrap.polaroidCaption}
            </p>
          ) : null}
        </div>
      );
    case 'letter':
      return (
        <div className="flex h-full flex-col bg-[#fbf3e4] p-3 text-[#4a2430]">
          <p className="font-hand text-[15px] leading-none">Dear {data.customerName},</p>
          <p className="mt-1.5 line-clamp-6 whitespace-pre-line font-hand text-[12px] leading-[1.15]">
            {data.birthdayMessage.replace(/^[^\n]*,\s*\n+/, '')}
          </p>
          <p className="mt-auto text-right font-hand text-[13px]">— {data.billerName}</p>
        </div>
      );
    case 'liner':
      return (
        <div className="flex h-full flex-col bg-[#2a1d12] p-3 font-receipt text-[8px] uppercase text-[#ffe9b8]">
          <p className="text-[9px] font-bold tracking-[0.12em]">Liner notes</p>
          <p className="mt-1 text-[#ffc857]">{data.rewind?.sideA}</p>
          <p className="mt-2 line-clamp-[9] normal-case leading-snug">{data.rewind?.review}</p>
        </div>
      );
    case 'sticky':
      return (
        <div className="flex h-full items-center bg-[#fde68a] p-4">
          <p className="font-hand text-[16px] leading-tight text-[#4a2430]">{scrap.secretNote}</p>
        </div>
      );
    case 'ticket':
      return (
        <div className="flex h-full flex-col justify-center border-y-4 border-dashed border-[#be185d] bg-[#fff1f6] p-3 text-center font-receipt uppercase text-[#2d1b22]">
          <p className="text-[8px] tracking-[0.2em] text-[#9a6b7b]">Admit one</p>
          <p className="mt-1 text-[11px] font-bold leading-tight">{scrap.ticketTitle}</p>
          <p className="mt-1.5 text-[8px]">{scrap.ticketPlace}</p>
          <p className="text-[8px]">{scrap.ticketWhen}</p>
        </div>
      );
    default:
      return null;
  }
}

/** Step 2: the cards that will be dealt, fanned out; unchecked ones slide away. */
export const CardStack = memo(function CardStack({
  data,
  style,
  cards,
}: {
  data: XsoData;
  style: GiftStyle;
  cards: CardId[];
}) {
  const reduce = useReducedMotion();
  const meta = FORMAT_CARDS[style];
  const dealt = meta.filter((c) => cards.includes(c.id));
  const spread = Math.min(64, (FAN_W - CARD_W - 16) / Math.max(1, dealt.length - 1));
  const mid = (dealt.length - 1) / 2;
  const [picked, setPicked] = useState<CardId | null>(null);
  const front = picked && cards.includes(picked) ? picked : null;
  return (
    <div>
      <PaneLabel>
        Live preview · {dealt.length} {dealt.length === 1 ? 'card' : 'cards'} in your stack
      </PaneLabel>
      <div
        className="relative mx-auto overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.12),transparent_70%)]"
        style={{ height: CARD_H + 48 }}
        role="group"
        aria-label="Your stack. Tap a card to take a closer look."
        onClick={(e) => e.target === e.currentTarget && setPicked(null)}
      >
        <AnimatePresence initial={false}>
          {dealt.map((card, i) => {
            const offset = i - mid;
            const lifted = front === card.id;
            return (
              <motion.button
                key={card.id}
                type="button"
                aria-pressed={lifted}
                aria-label={`${card.label}${lifted ? ', in front' : ''}`}
                onClick={() => setPicked(lifted ? null : card.id)}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 220, rotate: 18 }}
                animate={
                  lifted
                    ? { opacity: 1, x: 0, y: -6, rotate: 0, scale: 1.12 }
                    : {
                        opacity: front ? 0.55 : 1,
                        x: offset * spread,
                        y: Math.abs(offset) * 6,
                        rotate: offset * 5,
                        scale: 1,
                      }
                }
                whileHover={reduce || lifted ? undefined : { y: Math.abs(offset) * 6 - 10 }}
                whileTap={reduce ? undefined : { scale: lifted ? 1.08 : 0.97 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: 240, y: -20, rotate: 22 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="absolute left-1/2 top-5 cursor-pointer overflow-hidden rounded-xl p-0 text-left shadow-[0_14px_30px_-10px_rgba(0,0,0,.75)] ring-1 ring-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9a8d4]"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: -CARD_W / 2,
                  zIndex: lifted ? 50 : i,
                }}
              >
                <CardFace id={card.id} data={data} />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-semibold text-white">
                  {card.label}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      <p className="mt-2 text-center font-receipt text-[10px] uppercase tracking-[0.18em] text-[#c99aae]">
        👆 {front ? 'Tap again to put it back' : 'Tap a card to pull it out'}
      </p>
    </div>
  );
});

function Live({ value, placeholder }: { value: string; placeholder: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value || placeholder}
        initial={reduce ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className={`inline-block truncate ${value ? 'text-[#be185d]' : 'text-[#c4a3b1]'}`}
      >
        {value || placeholder}
      </motion.span>
    </AnimatePresence>
  );
}

/** Step 3: the receipt being drafted; names fill in live, the story is still blurred. */
export const DraftReceipt = memo(function DraftReceipt({
  data,
  recipient,
  sender,
  relationship,
  tone,
}: {
  data: XsoData;
  recipient: string;
  sender: string;
  relationship: Relationship | null;
  tone: CraftTone | null;
}) {
  const toneLabel = CRAFT_TONES.find((t) => t.id === tone);
  return (
    <div>
      <PaneLabel>Live preview · drafting your receipt</PaneLabel>
      <div className="relative mx-auto w-full max-w-[300px] rotate-[-1deg] overflow-hidden rounded-md bg-[#fffaf3] px-5 pb-5 pt-4 font-receipt text-[11px] uppercase text-[#2d1b22] shadow-[0_20px_50px_-18px_rgba(0,0,0,.8)]">
        <p className="text-center text-[14px] font-bold leading-tight">{data.merchantName}</p>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-dashed border-[#e8bfd0] pb-3">
          <dt className="text-[#9a6b7b]">Customer</dt>
          <dd className="min-w-0 text-right font-bold">
            <Live value={recipient} placeholder="Their name" />
          </dd>
          <dt className="text-[#9a6b7b]">Billed by</dt>
          <dd className="min-w-0 text-right font-bold">
            <Live value={sender} placeholder="Your name" />
          </dd>
          <dt className="text-[#9a6b7b]">Occasion</dt>
          <dd className="min-w-0 text-right">
            <Live value={relationship ? `${relationship} appreciation` : ''} placeholder="—" />
          </dd>
          <dt className="text-[#9a6b7b]">Vibe</dt>
          <dd className="min-w-0 text-right">
            <Live
              value={toneLabel ? `${toneLabel.emoji} ${toneLabel.label}` : ''}
              placeholder="—"
            />
          </dd>
        </dl>
        <div aria-hidden className="mt-3 grid gap-1.5 blur-[3px]">
          {data.lineItems.slice(0, 4).map((item) => (
            <p key={item.id} className="flex justify-between gap-2">
              <span className="truncate">{item.description}</span>
              <span className="shrink-0">{item.price}</span>
            </p>
          ))}
          <p className="mt-1 flex justify-between border-t border-[#2d1b22] pt-1.5 font-bold">
            <span>Total</span>
            <span>{data.total}</span>
          </p>
        </div>
        <p className="absolute inset-x-0 bottom-[30%] text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2d1b22] px-3 py-1 text-[9.5px] font-bold tracking-[0.18em] text-[#fdf2f8] shadow-lg">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f9a8d4]" aria-hidden />
            Drafting…
          </span>
        </p>
      </div>
    </div>
  );
});
