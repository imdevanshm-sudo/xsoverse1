'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import { Side1Receipt } from '@/components/xso/Side1Receipt';
import { Side2Audit } from '@/components/xso/Side2Audit';
import { Side3PhotoStrip } from '@/components/xso/Side3PhotoStrip';
import { Side4BirthdayCard } from '@/components/xso/Side4BirthdayCard';
import type { XsoData } from '@/types/xso';

export const SPRING = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
  mass: 1.2,
};

export const HEAVY_SPRING = {
  type: 'spring' as const,
  stiffness: 140,
  damping: 34,
  mass: 1.5,
};

export interface Artifact {
  id: 'receipt' | 'audit' | 'photos' | 'letter';
  label: string;
  rotation: number;
  contentScale?: number;
  content: ReactNode;
}

export function getArtifacts(data: XsoData): Artifact[] {
  return [
    {
      id: 'receipt',
      label: 'Receipt',
      rotation: -2,
      contentScale: 0.92,
      content: <Side1Receipt data={data} />,
    },
    {
      id: 'audit',
      label: 'Audit',
      rotation: 3,
      contentScale: 0.78,
      content: <Side2Audit data={data} />,
    },
    {
      id: 'photos',
      label: 'Photos',
      rotation: -1.5,
      contentScale: 0.88,
      content: <Side3PhotoStrip data={data} />,
    },
    {
      id: 'letter',
      label: 'Letter',
      rotation: 2.2,
      contentScale: 0.88,
      content: <Side4BirthdayCard data={data} />,
    },
  ];
}

export function rotateFrom<T>(items: T[], start: number): T[] {
  const safe = Math.max(0, Math.min(items.length - 1, Math.round(start)));
  return [...items.slice(safe), ...items.slice(0, safe)];
}

export function seededOffset(seed: string, index: number, amount: number): number {
  let hash = 2166136261;
  const input = `${seed}:${index}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((((hash >>> 0) % 1000) / 999) * 2 - 1) * amount;
}

export function playMechanicalCue(kind: 'click' | 'clack' | 'tack') {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const frequency = kind === 'click' ? 260 : kind === 'clack' ? 110 : 420;
    const duration = kind === 'clack' ? 0.12 : 0.07;

    oscillator.type = kind === 'clack' ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(45, frequency * 0.45),
      now + duration,
    );
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
    oscillator.addEventListener('ended', () => void context.close());
  } catch {
    // Audio feedback is progressive enhancement.
  }
}

export function ArtifactSurface({
  children,
  className = '',
  contentScale = 1,
}: {
  children: ReactNode;
  className?: string;
  contentScale?: number;
}) {
  return (
    <div
      className={`relative h-full w-full rounded-xl p-3 sm:p-4 ${
        contentScale < 1 ? 'overflow-hidden' : 'overflow-y-auto'
      } ${className}`}
    >
      <div
        style={{
          width: `${100 / contentScale}%`,
          transform: `scale(${contentScale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            'radial-gradient(circle at 28% 12%, rgba(255,255,255,.24), transparent 38%)',
          mixBlendMode: 'overlay',
        }}
        aria-hidden
      />
    </div>
  );
}

export function TossCard({
  artifact,
  active,
  depth,
  zIndex,
  onToss,
}: {
  artifact: Artifact;
  active: boolean;
  depth: number;
  zIndex: number;
  onToss: (direction: -1 | 1) => void;
}) {
  const contentScale = artifact.contentScale ?? 1;
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-18, 0, 18]);
  const opacity = useTransform(x, [-300, -180, 0, 180, 300], [0, 1, 1, 1, 0]);
  const [lifted, setLifted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    x.set(0);
    setLifted(false);
    setLeaving(false);
  }, [active, x]);

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const direction: -1 | 1 = info.offset.x >= 0 ? 1 : -1;
    const dismiss =
      Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 550;

    if (!dismiss) {
      setLifted(false);
      await animate(x, 0, SPRING);
      return;
    }

    setLeaving(true);
    await animate(x, direction * (reducedMotion ? 420 : 620), SPRING);
    onToss(direction);
  };

  return (
    <motion.div
      className="absolute inset-0 m-auto h-[540px] w-full max-w-[340px] cursor-grab active:cursor-grabbing"
      style={{
        zIndex,
        x: active ? x : 0,
        rotate: active ? rotate : artifact.rotation,
        opacity: active ? opacity : 1,
        boxShadow: lifted
          ? '0 40px 80px rgba(0,0,0,.55), 0 16px 28px rgba(0,0,0,.28), 0 2px 4px rgba(0,0,0,.15)'
          : `0 ${22 + depth * 6}px ${44 + depth * 10}px rgba(0,0,0,.42), 0 ${6 + depth * 2}px ${14 + depth * 3}px rgba(0,0,0,.28), 0 1px 2px rgba(0,0,0,.12)`,
      }}
      animate={{
        scale: active ? 1 : Math.max(0.88, 0.96 - depth * 0.025),
        y: active ? 0 : depth * 11,
      }}
      transition={SPRING}
      drag={active && !leaving ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.75}
      dragMomentum={false}
      onDragStart={() => setLifted(true)}
      onDragEnd={handleDragEnd}
      aria-label={`${artifact.label} souvenir`}
    >
      <ArtifactSurface contentScale={contentScale}>
        {artifact.content}
      </ArtifactSurface>
    </motion.div>
  );
}
