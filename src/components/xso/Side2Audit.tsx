'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { AuditMetrics, XsoData } from '@/types/xso';
import { auditLabel, overallStars } from '@/lib/formats';
import { InkStamp, PaperGrain } from '@/components/xso/paper/PaperCraft';

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

export { overallStars };

function polarPoint(cx: number, cy: number, radius: number, angleIndex: number, total: number) {
  const angle = -Math.PI / 2 + (angleIndex * (2 * Math.PI)) / total;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function radarPolygon(metrics: AuditMetrics, cx: number, cy: number, maxR: number) {
  return AXES.map(({ key }, i) => {
    const r = (clampScore(metrics[key]) / 100) * maxR;
    return polarPoint(cx, cy, r, i, AXES.length);
  })
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

export const Side2Audit = memo(function Side2Audit({ data }: Side2AuditProps) {
  const stars = overallStars(data.auditMetrics);
  const fullStars = Math.floor(stars);
  const hasHalf = stars - fullStars >= 0.4;
  const stamp = data.certifiedStampText || 'CERTIFIED BESTIE';
  const labels = useMemo(() => AXES.map(({ key, label }) => auditLabel(data, key, label)), [data]);

  return (
    <article
      className="relative mx-auto w-full max-w-[340px] overflow-hidden border-2 border-black p-4 shadow-2xl"
      style={{
        background: `linear-gradient(160deg, ${YELLOW} 0%, ${YELLOW_DEEP} 100%)`,
        transform: 'rotate(3deg)',
        boxShadow: '6px 6px 0 0 #000, 0 28px 50px rgba(0,0,0,0.28), 0 12px 22px rgba(0,0,0,0.16)',
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
      <PaperGrain opacity={0.22} />

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
              <span
                key={i}
                className="star-pop inline-flex"
                style={{ '--i': i } as CSSProperties}
                aria-hidden
              >
                <StarIcon filled={isFull} half={isHalf} gradId={`star-half-${i}`} />
              </span>
            );
          })}
        </div>
        <p className="mt-1 font-mono text-[11px] font-bold text-black">
          {stars.toFixed(1)} / 5.0 OVERALL
        </p>
      </header>

      <div className="relative z-10 mb-4 flex justify-center">
        <RadarChart metrics={data.auditMetrics} labels={labels} />
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-2">
        <FlagColumn title="Green Flags" emoji="🟢" items={data.greenFlags} accent="#0f7a3a" />
        <FlagColumn title="Red Flags" emoji="🔴" items={data.redFlags} accent="#c11a1a" />
      </div>

      {/* Signed off at the foot of the report, clear of the chart and the flags. */}
      <div className="pointer-events-none relative z-20 mt-4 flex justify-center" aria-hidden>
        <InkStamp rotate={-8} thunk delayMs={450}>
          {stamp}
        </InkStamp>
      </div>
    </article>
  );
});

const StarIcon = memo(function StarIcon({
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
});

/** Wide enough that labels sit beside the chart's points instead of running off the card. */
const RADAR = { width: 300, height: 236, cx: 150, cy: 120, r: 70, gap: 13 };
const LABEL_SIZE = 10;
/** Characters of a label line at full size; longer words shrink to fit. */
const LABEL_FIT = 11;

/** One line, or two split at the space nearest the middle. */
function labelLines(label: string): string[] {
  const text = label.toUpperCase().trim();
  if (text.length <= LABEL_FIT || !text.includes(' ')) return [text];
  const spaces = text.split('').flatMap((char, at) => (char === ' ' ? [at] : []));
  const split = spaces.reduce((best, at) =>
    Math.abs(at - text.length / 2) < Math.abs(best - text.length / 2) ? at : best,
  );
  return [text.slice(0, split), text.slice(split + 1)];
}

const RadarChart = memo(function RadarChart({
  metrics,
  labels,
}: {
  metrics: AuditMetrics;
  labels: string[];
}) {
  const { width, height, cx, cy, r: maxR, gap } = RADAR;
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-[300px]"
      role="img"
      aria-label={`Audit radar: ${AXES.map(({ key }, i) => `${labels[i]} ${clampScore(metrics[key])}`).join(', ')}`}
    >
      {rings.map((t) => {
        const pts = AXES.map((_, i) => polarPoint(cx, cy, maxR * t, i, AXES.length))
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

      <polygon
        className="radar-in"
        points={radarPolygon(metrics, cx, cy, maxR)}
        fill="rgba(0,0,0,0.18)"
        stroke="#000"
        strokeWidth="2"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {AXES.map(({ key }, i) => {
        const lines = labelLines(labels[i]);
        const longest = Math.max(...lines.map((line) => line.length));
        const size = longest > LABEL_FIT ? (LABEL_SIZE * LABEL_FIT) / longest : LABEL_SIZE;
        const lineHeight = size * 1.15;
        const tip = polarPoint(cx, cy, maxR + gap, i, AXES.length);
        const dx = tip.x - cx;
        const dy = tip.y - cy;
        /** Labels grow away from the chart: up above it, down below it, outwards at the sides. */
        const anchor = Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end';
        const block = lines.length * lineHeight + 10;
        const top =
          dy < -20
            ? tip.y - block + lineHeight * 0.8
            : dy > 20
              ? tip.y + lineHeight * 0.6
              : tip.y - block / 2 + lineHeight * 0.8;
        return (
          <text
            key={key}
            x={tip.x}
            y={top}
            textAnchor={anchor}
            fill={INK}
            style={{ fontFamily: 'ui-monospace, monospace' }}
            aria-hidden
          >
            {lines.map((line, n) => (
              <tspan
                key={n}
                x={tip.x}
                dy={n === 0 ? 0 : lineHeight}
                style={{ fontSize: size, fontWeight: 700 }}
              >
                {line}
              </tspan>
            ))}
            <tspan x={tip.x} dy={lineHeight} opacity={0.7} style={{ fontSize: 9 }}>
              {clampScore(metrics[key])}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
});

const FlagColumn = memo(function FlagColumn({
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
          <li key={item} className="flex gap-1.5 font-mono text-[10px] leading-snug text-black/85">
            <span aria-hidden className="mt-0.5 shrink-0">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
});
