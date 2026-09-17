'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BRUSH = 26;
const REVEAL_RATIO = 0.48;

export function ScratchReveal({
  reward,
  label = 'Scratch to reveal',
  className = '',
}: {
  reward: string;
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const sampleTick = useRef(0);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [spark, setSpark] = useState<{ x: number; y: number; id: number }[]>(
    [],
  );

  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#d8d4ce');
    base.addColorStop(0.35, '#9a9690');
    base.addColorStop(0.55, '#ece8e2');
    base.addColorStop(0.8, '#7a7670');
    base.addColorStop(1, '#c4bfb7');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // Specular streaks
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = -h; i < w + h; i += 14) {
      ctx.fillRect(i, 0, 3, h);
    }

    // Micro grit — lighter on small / low-DPR canvases
    const grit = Math.min(900, Math.floor((w * h) / 8));
    for (let i = 0; i < grit; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle =
        Math.random() > 0.5
          ? 'rgba(255,255,255,0.18)'
          : 'rgba(40,35,30,0.16)';
      ctx.fillRect(x, y, 1.2, 1.2);
    }

    ctx.fillStyle = 'rgba(35,30,28,0.55)';
    ctx.font = '700 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), w / 2, h / 2 - 8);
    ctx.font = '600 9px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(35,30,28,0.4)';
    ctx.fillText('DRAG · WIPE · REVEAL', w / 2, h / 2 + 10);
  }, [label]);

  useEffect(() => {
    paintFoil();
    const onResize = () => {
      if (!revealed) paintFoil();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [paintFoil, revealed]);

  const measureCleared = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    const step = canvas.width * canvas.height > 180_000 ? 32 : 16;
    for (let i = 3; i < sample.data.length; i += 4 * step) {
      if (sample.data[i] < 24) cleared += 1;
    }
    return cleared / (sample.data.length / (4 * step));
  };

  const scratchStroke = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH * 2;

    const soft = ctx.createRadialGradient(x, y, 2, x, y, BRUSH);
    soft.addColorStop(0, 'rgba(0,0,0,1)');
    soft.addColorStop(0.55, 'rgba(0,0,0,0.75)');
    soft.addColorStop(1, 'rgba(0,0,0,0)');

    if (last.current) {
      ctx.strokeStyle = 'rgba(0,0,0,0.95)';
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.fillStyle = soft;
    ctx.beginPath();
    ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
    ctx.fill();

    last.current = { x, y };

    if (Math.random() > 0.72) {
      const id = Date.now() + Math.random();
      setSpark((prev) => [...prev.slice(-8), { x, y, id }]);
      window.setTimeout(() => {
        setSpark((prev) => prev.filter((s) => s.id !== id));
      }, 420);
    }

    sampleTick.current += 1;
    if (sampleTick.current % 4 !== 0) return;

    const ratio = measureCleared(ctx, canvas);
    setProgress(Math.min(1, ratio / REVEAL_RATIO));

    if (ratio > REVEAL_RATIO) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setRevealed(true);
      setProgress(1);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    drawing.current = true;
    last.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    scratchStroke(e.clientX, e.clientY);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.stopPropagation();
    scratchStroke(e.clientX, e.clientY);
  };

  const onPointerUp = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[#c9c0b0] bg-[#fcfaf2] ${className}`}
      style={{
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 18px rgba(0,0,0,0.12)',
      }}
    >
      <motion.div
        className="flex min-h-[108px] items-center justify-center px-4 py-5 text-center"
        initial={false}
        animate={{
          opacity: revealed ? 1 : 0.35 + progress * 0.55,
          scale: revealed ? 1 : 0.98 + progress * 0.02,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <p className="font-hand text-[17px] leading-snug text-[#2c241c]">
          {reward}
        </p>
      </motion.div>

      <AnimatePresence>
        {!revealed ? (
          <motion.canvas
            key="foil"
            ref={canvasRef}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label="Scratch-off foil — drag to reveal the hidden note"
          />
        ) : null}
      </AnimatePresence>

      {spark.map((s) => (
        <span
          key={s.id}
          className="pointer-events-none absolute z-10 h-1.5 w-1.5 rounded-full bg-white/90"
          style={{
            left: s.x,
            top: s.y,
            boxShadow: '0 0 8px rgba(255,255,255,0.9)',
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden
        />
      ))}

      {!revealed && progress > 0.08 ? (
        <div
          className="pointer-events-none absolute bottom-1.5 left-1/2 z-10 h-1 w-16 -translate-x-1/2 overflow-hidden rounded-full bg-black/15"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-[#2c241c]/55 transition-[width] duration-150"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
