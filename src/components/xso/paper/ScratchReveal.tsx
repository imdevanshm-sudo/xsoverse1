'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { playFoley } from '@/lib/foley';

const BRUSH = 26;
/** Share of the foil that has to come off before the rest falls away. */
const REVEAL_RATIO = 0.6;
const SAMPLE_INTERVAL_MS = 300;
const SPARK_POOL = 6;
const FOIL_FADE_MS = 500;
const MAX_DPR = 1.5;

type Point = { x: number; y: number };

const CONFETTI_COLORS = ['#ec4899', '#fdba74', '#e8ff4a', '#7dd3fc', '#f9a8d4', '#fff7fb'];
/** A small burst from the middle of the strip; fixed spread so it looks the same every time. */
const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const reach = 46 + (i % 4) * 14;
  return {
    '--dx': `${Math.round(Math.cos(angle) * reach * 1.6)}px`,
    '--dy': `${Math.round(Math.sin(angle) * reach)}px`,
    '--spin': `${(i % 2 ? 1 : -1) * (180 + i * 25)}deg`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDelay: `${(i % 3) * 30}ms`,
  } as CSSProperties;
});

/** Soft round brush, rendered once and stamped with drawImage. */
function createBrush(dpr: number): HTMLCanvasElement {
  const size = Math.ceil(BRUSH * 2 * dpr);
  const brush = document.createElement('canvas');
  brush.width = size;
  brush.height = size;
  const ctx = brush.getContext('2d');
  if (ctx) {
    const r = size / 2;
    const soft = ctx.createRadialGradient(r, r, 2 * dpr, r, r, r);
    soft.addColorStop(0, 'rgba(0,0,0,1)');
    soft.addColorStop(0.55, 'rgba(0,0,0,0.75)');
    soft.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = soft;
    ctx.fillRect(0, 0, size, size);
  }
  return brush;
}

const FOIL_STOPS: Record<'silver' | 'holo', [number, string][]> = {
  silver: [
    [0, '#d8d4ce'],
    [0.35, '#9a9690'],
    [0.55, '#ece8e2'],
    [0.8, '#7a7670'],
    [1, '#c4bfb7'],
  ],
  holo: [
    [0, '#c9cfe6'],
    [0.18, '#e6c9f2'],
    [0.36, '#bff0de'],
    [0.52, '#f4f1e6'],
    [0.68, '#f6e1b8'],
    [0.84, '#c4dcf6'],
    [1, '#a9a6c4'],
  ],
};

export function ScratchReveal({
  reward,
  label = 'Scratch to reveal',
  className = '',
  variant = 'silver',
  compact = false,
  unstyled = false,
  onReveal,
  children,
}: {
  reward: string;
  label?: string;
  className?: string;
  variant?: 'silver' | 'holo';
  /** Shorter foil for tight hosts like the Loop deck card. */
  compact?: boolean;
  /** Skip the default paper box so the host can style the frame. */
  unstyled?: boolean;
  onReveal?: () => void;
  /** Custom content under the foil; defaults to the reward in handwriting. */
  children?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const brushRef = useRef<HTMLCanvasElement | null>(null);
  const sampleRef = useRef<HTMLCanvasElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const drawing = useRef(false);
  const last = useRef<Point | null>(null);
  const pending = useRef<Point[]>([]);
  const frame = useRef<number | null>(null);
  const lastSample = useRef(0);
  const revealedRef = useRef(false);
  const paintedSize = useRef('');
  const scratched = useRef(false);
  const lastGrain = useRef(0);
  const sparkEls = useRef<(HTMLSpanElement | null)[]>([]);
  const sparkCursor = useRef(0);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  /** Once the foil has faded, its canvas and sparks leave the DOM rather than sit at opacity 0. */
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    const id = window.setTimeout(() => setCleared(true), FOIL_FADE_MS + 100);
    return () => window.clearTimeout(id);
  }, [revealed]);

  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // Layout size, not the on-screen box: hosts may be scaled, tilted or hidden.
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w === 0 || h === 0) return;
    rectRef.current = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    brushRef.current = createBrush(dpr);
    paintedSize.current = `${w}x${h}`;

    ctx.globalCompositeOperation = 'source-over';
    const base = ctx.createLinearGradient(0, 0, w, h);
    for (const [offset, color] of FOIL_STOPS[variant]) {
      base.addColorStop(offset, color);
    }
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = -h; i < w + h; i += 14) {
      ctx.fillRect(i, 0, 3, h);
    }

    const grit = Math.min(900, Math.floor((w * h) / 8));
    for (let i = 0; i < grit; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(40,35,30,0.16)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }

    ctx.fillStyle = 'rgba(35,30,28,0.72)';
    ctx.font = '700 16px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), w / 2, h / 2 - 10);
    ctx.font = '600 12px ui-monospace, Menlo, monospace';
    ctx.fillStyle = 'rgba(35,30,28,0.5)';
    ctx.fillText('DRAG · WIPE · REVEAL', w / 2, h / 2 + 12);
    ctx.globalCompositeOperation = 'destination-out';
  }, [label, variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    paintFoil();
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    // Repaint when the foil first gets a real size (e.g. a hidden tab is shown)
    // or resizes before anyone has scratched it.
    const observer = new ResizeObserver(() => {
      if (revealedRef.current) return;
      const size = `${canvas.offsetWidth}x${canvas.offsetHeight}`;
      if (size === paintedSize.current) return;
      if (scratched.current && paintedSize.current !== '') return;
      paintFoil();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paintFoil]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  /** Share of foil cleared, read from a quarter-size copy of the canvas. */
  const measureCleared = useCallback((): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const w = Math.max(1, Math.floor(canvas.width / 4));
    const h = Math.max(1, Math.floor(canvas.height / 4));
    let sample = sampleRef.current;
    if (!sample) {
      sample = document.createElement('canvas');
      sampleRef.current = sample;
    }
    if (sample.width !== w || sample.height !== h) {
      sample.width = w;
      sample.height = h;
    }
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    if (!sctx) return 0;
    sctx.clearRect(0, 0, w, h);
    sctx.drawImage(canvas, 0, 0, w, h);
    const { data } = sctx.getImageData(0, 0, w, h);
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 24) cleared += 1;
    }
    return cleared / (w * h);
  }, []);

  const checkProgress = useCallback(() => {
    if (revealedRef.current) return;
    lastSample.current = performance.now();
    const ratio = measureCleared();
    if (ratio > REVEAL_RATIO) {
      revealedRef.current = true;
      setRevealed(true);
      setProgress(1);
      playFoley('chime', 0.8);
      onReveal?.();
      return;
    }
    setProgress(Math.min(1, ratio / REVEAL_RATIO));
  }, [measureCleared, onReveal]);

  const emitSpark = useCallback((point: Point) => {
    const el = sparkEls.current[sparkCursor.current];
    sparkCursor.current = (sparkCursor.current + 1) % SPARK_POOL;
    if (!el || typeof el.animate !== 'function') return;
    el.animate(
      [
        { transform: `translate(${point.x}px, ${point.y}px) scale(1)`, opacity: 1 },
        {
          transform: `translate(${point.x}px, ${point.y - 12}px) scale(0.3)`,
          opacity: 0,
        },
      ],
      { duration: 420, easing: 'ease-out' },
    );
  }, []);

  const flush = useCallback(() => {
    frame.current = null;
    const ctx = ctxRef.current;
    const brush = brushRef.current;
    const points = pending.current;
    pending.current = [];
    if (!ctx || !brush || points.length === 0 || revealedRef.current) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH * 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.beginPath();
    let prev = last.current;
    for (const point of points) {
      if (prev) {
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x, point.y);
      }
      prev = point;
    }
    ctx.stroke();
    for (const point of points) {
      ctx.drawImage(brush, point.x - BRUSH, point.y - BRUSH, BRUSH * 2, BRUSH * 2);
    }
    last.current = prev;

    const tail = points[points.length - 1];
    if (tail && Math.random() > 0.6) emitSpark(tail);
    const now = performance.now();
    if (now - lastGrain.current > 70) {
      lastGrain.current = now;
      playFoley('scratch', 0.9);
    }

    if (performance.now() - lastSample.current >= SAMPLE_INTERVAL_MS) {
      checkProgress();
    }
  }, [checkProgress, emitSpark]);

  const queue = (clientX: number, clientY: number) => {
    const rect = rectRef.current;
    const canvas = canvasRef.current;
    if (!rect || !canvas || revealedRef.current || rect.width === 0) return;
    // Map screen coordinates back to layout space when the host is scaled.
    const sx = canvas.offsetWidth / rect.width;
    const sy = canvas.offsetHeight / rect.height;
    pending.current.push({ x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy });
    if (frame.current === null) {
      frame.current = requestAnimationFrame(flush);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!paintedSize.current) paintFoil();
    rectRef.current = e.currentTarget.getBoundingClientRect();
    scratched.current = true;
    drawing.current = true;
    last.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    queue(e.clientX, e.clientY);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.stopPropagation();
    queue(e.clientX, e.clientY);
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      flush();
    }
    last.current = null;
    checkProgress();
  };

  return (
    <div
      className={`relative overflow-hidden ${
        unstyled ? '' : 'rounded-xl border border-[#c9c0b0] bg-[#fff7fb]'
      } ${revealed ? 'scratch--revealed' : ''} ${className}`}
      style={
        unstyled
          ? undefined
          : { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 18px rgba(0,0,0,0.12)' }
      }
    >
      <div
        className={`flex items-center justify-center px-4 text-center ${compact ? 'min-h-[112px] py-4' : 'min-h-[132px] py-5'} transition-[opacity,transform] duration-300 ease-out`}
        style={{
          opacity: revealed ? 1 : 0.35 + progress * 0.55,
          transform: `scale(${revealed ? 1 : 0.98 + progress * 0.02})`,
        }}
      >
        {children ?? (
          <p
            className={`font-hand leading-snug text-[#2c241c] ${compact ? 'text-[21px]' : 'text-[22px]'}`}
          >
            {reward}
          </p>
        )}
      </div>

      {cleared ? null : (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none transition-opacity ease-out ${
            revealed ? 'pointer-events-none opacity-0' : 'cursor-crosshair'
          }`}
          style={{ transitionDuration: `${FOIL_FADE_MS}ms` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Scratch-off foil — drag to reveal the hidden note"
          aria-hidden={revealed}
        />
      )}
      {revealed || scratched.current ? null : <span aria-hidden className="scratch-shimmer" />}
      {revealed ? (
        <span aria-hidden className="scratch-burst">
          {CONFETTI.map((style, i) => (
            <i key={i} style={style} />
          ))}
        </span>
      ) : null}

      {(cleared ? [] : Array.from({ length: SPARK_POOL })).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            sparkEls.current[i] = el;
          }}
          className="pointer-events-none absolute left-0 top-0 z-10 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-white/90 opacity-0"
          style={{ boxShadow: '0 0 8px rgba(255,255,255,0.9)' }}
          aria-hidden
        />
      ))}

      {!revealed && progress > 0.08 ? (
        <div
          className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 h-1 w-16 -translate-x-1/2 overflow-hidden rounded-full bg-black/15"
          aria-hidden
        >
          <div
            className="h-full origin-left rounded-full bg-[#2c241c]/55 transition-transform duration-150"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      ) : null}
    </div>
  );
}
