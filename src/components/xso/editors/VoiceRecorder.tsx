'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import type { Tone } from '@/components/xso/editors/kit';
import { VOICE_NOTE_MAX_SECONDS } from '@/lib/soundtracks';

/** Containers the browsers we support can record, best first (Safari only does MP4). */
const RECORD_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];
/** Speech needs far less than music: a full minute stays around half a megabyte. */
const SPEECH_BITRATE = 64_000;

type Phase = 'idle' | 'asking' | 'recording' | 'saving';

function micProblem(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone access was blocked. Allow it in your browser’s site settings, or upload a voice memo instead.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone found. Plug one in, or upload a voice memo instead.';
  }
  if (name === 'NotReadableError') {
    return 'Your microphone is busy in another app. Close it and try again.';
  }
  return 'Recording didn’t start. Try again, or upload a voice memo instead.';
}

/** Records a short voice note, stopping on its own at the time limit. */
export function VoiceRecorder({
  t,
  onRecorded,
}: {
  t: Tone;
  onRecorded: (clip: Blob) => Promise<void>;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(VOICE_NOTE_MAX_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };
  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
      const active = recorder.current;
      recorder.current = null;
      if (active?.state === 'recording') active.stop();
      active?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const record = async () => {
    setError(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser can’t record audio. Upload a voice memo instead.');
      return;
    }
    setPhase('asking');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      setError(micProblem(err));
      setPhase('idle');
      return;
    }
    const mimeType = RECORD_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const node = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: SPEECH_BITRATE,
    });
    const chunks: Blob[] = [];
    node.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    node.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      if (recorder.current !== node) return;
      recorder.current = null;
      const clip = new Blob(chunks, { type: node.mimeType || mimeType || 'audio/webm' });
      if (!clip.size) {
        setError('Nothing was recorded. Check your microphone and try again.');
        setPhase('idle');
        return;
      }
      setPhase('saving');
      try {
        await onRecorded(clip);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Saving the voice note failed');
      }
      setPhase('idle');
    };
    recorder.current = node;
    node.start();
    setLeft(VOICE_NOTE_MAX_SECONDS);
    setPhase('recording');
    const started = Date.now();
    timer.current = window.setInterval(() => {
      const remaining = VOICE_NOTE_MAX_SECONDS - Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) stop();
    }, 250);
  };

  const recording = phase === 'recording';
  const label =
    phase === 'asking'
      ? 'Waiting for the microphone…'
      : phase === 'saving'
        ? 'Saving your voice note…'
        : recording
          ? `Stop recording · 0:${String(left).padStart(2, '0')} left`
          : `Record a voice note · up to ${VOICE_NOTE_MAX_SECONDS} s`;

  return (
    <div className="grid gap-1.5">
      <button
        type="button"
        onClick={recording ? stop : () => void record()}
        disabled={phase === 'asking' || phase === 'saving'}
        aria-pressed={recording}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 disabled:opacity-60 ${recording ? 'border-[#ef4444] text-[#fca5a5]' : `border-dashed ${t.button}`}`}
      >
        {recording ? (
          <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
        ) : (
          <Mic className="h-4 w-4" aria-hidden />
        )}
        {recording ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#ef4444]" aria-hidden />
        ) : null}
        {label}
      </button>
      <span className="sr-only" aria-live="polite">
        {recording && (left === 10 || left === 5) ? `${left} seconds left` : ''}
      </span>
      {error ? (
        <p role="alert" className={`text-[12.5px] ${t.error}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
