'use client';

import { motion } from 'framer-motion';
import type { AuditMetrics, XsoData } from '@/types/xso';

export interface Side2AuditProps {
  data: XsoData;
}

const AXES: { key: keyof AuditMetrics; label: string }[] = [
  { key: 'chaos', label: 'Chaos' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'snacking', label: 'Snacking' },
  { key: 'advice', label: 'Bad Advice' },
  { key: 'support', label: 'Emotional Support' },
];

const YELLOW = '#facc15';
const YELLOW_DEEP = '#eab308';
const INK = '#000000';
const GOLD = '#f5c518';

function clampScore(n: number) {
  return Math.min(100, Math.max(0, n));
}

function overallStars(metrics: AuditMetrics): number {
  const values = Object.values(metrics);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round((avg / 100) * 5 * 10) / 10;
}

function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  total: number,
) {
  const angle = -Math.PI / 2 + (angleIndex * (2 * Math.PI)) / total;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function radarPolygon(
  metrics: AuditMetrics,
  cx: number,
  cy: number,
  maxR: number,
) {
  return AXES.map(({ key }, i) => {
    const r = (clampScore(metrics[key]) / 100) * maxR;
    return polarPoint(cx, cy, r, i, AXES.length);
  })
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

export function Side2Audit({ data }: Side2AuditProps) {
  const stars = overallStars(data.auditMetrics);
  const fullStars = Math.floor(stars);
  const hasHalf = stars - fullStars >= 0.4;
  const stamp = data.certifiedStampText || 'CERTIFIED BESTIE';

  return (
    <article
      className="relative mx-auto w-full max-w-[340px] overflow-hidden border-2 border-black p-4 shadow-2xl"
      style={{
        background: `linear-gradient(160deg, ${YELLOW} 0%, ${YELLOW_DEEP} 100%)`,
        transform: 'rotate(3deg)',
        boxShadow:
          '6px 6px 0 0 #000, 0 28px 50px rgba(0,0,0,0.28), 0 12px 22px rgba(0,0,0,0.16)',
      }}
      aria-label="Friendship audit report card"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(0,0,0,0.35) 23px)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-25"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.55'/%3E%3C/svg%3E\")",
          backgroundSize: '180px 180px',
        }}
        aria-hidden
      />
      <p
        className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[10rem] font-hand text-[14px] leading-snug text-[#5a2a2a]/80"
        style={{ transform: 'rotate(-4deg)' }}
        aria-hidden
      >
        never let them navigate
      </p>

      <header className="relative z-10 mb-3 border-b-2 border-black pb-3 text-center">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-black/70">
          Friendship Audit Report
        </p>
        <h2 className="mt-1 font-display text-xl font-extrabold uppercase tracking-tight text-black">
          {data.customerName}
        </h2>
        <p className="font-mono text-[10px] text-black/65">
          Audited by {data.billerName} · {data.occasion}
        </p>

        <div
          className="mt-3 flex items-center justify-center gap-1"
          aria-label={`Overall rating ${stars} out of 5 stars`}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const isFull = i < fullStars;
            const isHalf = i === fullStars && hasHalf;
            return (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 16,
                  delay: 0.12 + i * 0.08,
                }}
                className="inline-flex"
                aria-hidden
              >
                <StarIcon
                  filled={isFull}
                  half={isHalf}
                  gradId={`star-half-${i}`}
                />
              </motion.span>
            );
          })}
        </div>
        <p className="mt-1 font-mono text-[11px] font-bold text-black">
          {stars.toFixed(1)} / 5.0 OVERALL
        </p>
      </header>

      <div className="relative z-10 mb-4 flex justify-center">
        <RadarChart metrics={data.auditMetrics} />
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-2">
        <FlagColumn
          title="Green Flags"
          emoji="🟢"
          items={data.greenFlags}
          accent="#0f7a3a"
        />
        <FlagColumn
          title="Red Flags"
          emoji="🔴"
          items={data.redFlags}
          accent="#c11a1a"
        />
      </div>

      <motion.div
        className="pointer-events-none absolute left-1/2 top-[44%] z-20 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, rotate: -28, opacity: 0 }}
        animate={{ scale: 1, rotate: -12, opacity: 0.88 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.45 }}
        aria-hidden
      >
        <div
          className="select-none border-[3px] border-dashed border-red-600 px-3 py-2 font-display text-[13px] font-extrabold uppercase tracking-[0.14em] text-red-600"
          style={{
            textShadow: '1px 1px 0 rgba(185,28,28,0.25)',
            boxShadow: 'inset 0 0 0 1px rgba(220,38,38,0.35)',
            filter: 'contrast(1.1)',
          }}
        >
          {stamp}
        </div>
      </motion.div>
    </article>
  );
}

function StarIcon({
  filled,
  half,
  gradId,
}: {
  filled: boolean;
  half: boolean;
  gradId: string;
}) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      {half ? (
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor={GOLD} />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M12 2.6l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.6 6.6 19.4l1-6.1L3.2 9l6.1-.9L12 2.6z"
        fill={filled ? GOLD : half ? `url(#${gradId})` : 'transparent'}
        stroke={filled || half ? '#b45309' : '#00000040'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RadarChart({ metrics }: { metrics: AuditMetrics }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 72;
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-[210px] w-full max-w-[240px]"
      role="img"
      aria-label="Audit metrics radar chart"
    >
      {rings.map((t) => {
        const pts = AXES.map((_, i) =>
          polarPoint(cx, cy, maxR * t, i, AXES.length),
        )
          .map((p) => `${p.x},${p.y}`)
          .join(' ');
        return (
          <polygon
            key={t}
            points={pts}
            fill="none"
            stroke={INK}
            strokeOpacity={0.3}
            strokeWidth="1.5"
          />
        );
      })}

      {AXES.map((_, i) => {
        const tip = polarPoint(cx, cy, maxR, i, AXES.length);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={tip.x}
            y2={tip.y}
            stroke={INK}
            strokeOpacity={0.4}
            strokeWidth="1"
          />
        );
      })}

      <motion.polygon
        points={radarPolygon(metrics, cx, cy, maxR)}
        fill="rgba(0,0,0,0.18)"
        stroke="#000"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.2 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {AXES.map(({ key, label }, i) => {
        const tip = polarPoint(cx, cy, maxR + 22, i, AXES.length);
        return (
          <g key={key}>
            <text
              x={tip.x}
              y={tip.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={INK}
              style={{
                fontSize: 9,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 700,
              }}
            >
              {label.toUpperCase()}
            </text>
            <text
              x={tip.x}
              y={tip.y + 11}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={INK}
              opacity={0.7}
              style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace' }}
            >
              {clampScore(metrics[key])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FlagColumn({
  title,
  emoji,
  items,
  accent,
}: {
  title: string;
  emoji: string;
  items: string[];
  accent: string;
}) {
  return (
    <section
      className="border-2 border-black bg-[#fffef5]/95 p-2.5"
      style={{ boxShadow: `3px 3px 0 0 ${accent}` }}
    >
      <h3
        className="mb-2 font-display text-xs font-extrabold uppercase tracking-wide"
        style={{ color: accent }}
      >
        <span aria-hidden>{emoji} </span>
        {title}
      </h3>
      <ul className="m-0 list-none space-y-1.5 p-0">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-1.5 font-mono text-[10px] leading-snug text-black/85"
          >
            <span aria-hidden className="mt-0.5 shrink-0">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
