'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

const BRUSH = 26;
const REVEAL_RATIO = 0.48;
const SAMPLE_INTERVAL_MS = 300;
const SPARK_POOL = 6;
const MAX_DPR = 1.5;

type Point = { x: number; y: number };

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
  const sparkEls = useRef<(HTMLSpanElement | null)[]>([]);
  const sparkCursor = useRef(0);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const rect = canvas.getBoundingClientRect();
    rectRef.current = rect;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    brushRef.current = createBrush(dpr);

    const w = rect.width;
    const h = rect.height;

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
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(40,35,30,0.16)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }

    ctx.fillStyle = 'rgba(35,30,28,0.55)';
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), w / 2, h / 2 - 8);
    ctx.font = '600 9px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(35,30,28,0.4)';
    ctx.fillText('DRAG · WIPE · REVEAL', w / 2, h / 2 + 10);
    ctx.globalCompositeOperation = 'destination-out';
  }, [label, variant]);

  useEffect(() => {
    paintFoil();
    let resizeFrame: number | null = null;
    const onResize = () => {
      if (revealedRef.current || resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        paintFoil();
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    };
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

    if (performance.now() - lastSample.current >= SAMPLE_INTERVAL_MS) {
      checkProgress();
    }
  }, [checkProgress, emitSpark]);

  const queue = (clientX: number, clientY: number) => {
    const rect = rectRef.current;
    if (!rect || revealedRef.current) return;
    pending.current.push({ x: clientX - rect.left, y: clientY - rect.top });
    if (frame.current === null) {
      frame.current = requestAnimationFrame(flush);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    rectRef.current = e.currentTarget.getBoundingClientRect();
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
        unstyled ? '' : 'rounded-xl border border-[#c9c0b0] bg-[#fcfaf2]'
      } ${className}`}
      style={
        unstyled
          ? undefined
          : { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 18px rgba(0,0,0,0.12)' }
      }
    >
      <div
        className={`flex items-center justify-center px-4 text-center ${compact ? 'min-h-[80px] py-3' : 'min-h-[108px] py-5'} transition-[opacity,transform] duration-300 ease-out`}
        style={{
          opacity: revealed ? 1 : 0.35 + progress * 0.55,
          transform: `scale(${revealed ? 1 : 0.98 + progress * 0.02})`,
        }}
      >
        {children ?? (
          <p className="font-hand text-[17px] leading-snug text-[#2c241c]">
            {reward}
          </p>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-500 ease-out ${
          revealed ? 'pointer-events-none opacity-0' : 'cursor-crosshair'
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Scratch-off foil — drag to reveal the hidden note"
        aria-hidden={revealed}
      />

      {Array.from({ length: SPARK_POOL }, (_, i) => (
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
