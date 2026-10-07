'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Pause, Play, Upload } from 'lucide-react';
import type { Tone } from '@/components/xso/editors/kit';
import { VoiceRecorder } from '@/components/xso/editors/VoiceRecorder';
import { playableAudio, uploadAudio } from '@/lib/audioUpload';
import { readAudio } from '@/lib/media';
import { attachMedia, mediaElement, optIn, type MediaHandle } from '@/lib/sound';
import { trackLoudness } from '@/lib/soundtracks';
import { FORMAT_LIMITS } from '@/lib/formats';
import {
  SOUNDTRACKS,
  SOUNDTRACK_UPLOAD_MAX_BYTES,
  STORED_AUDIO_MAX_BYTES,
  soundtrackSrc,
  type Soundtrack,
} from '@/lib/soundtracks';

const STORED_ACCEPT = 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/webm,audio/ogg';

/**
 * Pick a score: a bundled track, the sender's own upload, or silence. With `stored`, uploads go to
 * private audio storage (up to 10 MB) and the sender can record a voice note with a transcript.
 */
export function SoundtrackField({
  t,
  value,
  onChange,
  tracks = SOUNDTRACKS,
  stored = false,
  voice = false,
  transcript = '',
  onTranscript,
}: {
  t: Tone;
  value: string;
  onChange: (value: string, voice?: boolean) => void;
  tracks?: Soundtrack[];
  stored?: boolean;
  voice?: boolean;
  transcript?: string;
  onTranscript?: (transcript: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useRef<{ node: HTMLAudioElement; mix: MediaHandle } | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const own = value.startsWith('data:audio/') || value.startsWith('storage:');
  const maxBytes = stored ? STORED_AUDIO_MAX_BYTES : SOUNDTRACK_UPLOAD_MAX_BYTES;
  const MB = (maxBytes / 1_000_000).toFixed(0);

  const stopPreview = () => {
    preview.current?.mix.release();
    preview.current = null;
    setPreviewing(null);
  };
  useEffect(() => stopPreview, []);

  const togglePreview = async (id: string, option: string, direct: string | null) => {
    if (previewing === id) return stopPreview();
    stopPreview();
    const src = await playableAudio(option, direct);
    if (!src) {
      setError('That track isn’t available yet.');
      return;
    }
    optIn();
    const node = mediaElement(src);
    preview.current = { node, mix: attachMedia(node, 'music', trackLoudness(src)) };
    node.onended = stopPreview;
    node
      .play()
      .then(() => setPreviewing(id))
      .catch(() => {
        setError('That track isn’t available yet.');
        stopPreview();
      });
  };

  const save = async (clip: Blob, isVoice: boolean) => {
    setError(null);
    if (clip.size > maxBytes) {
      throw new Error(`Audio must be under ${MB} MB. Try a shorter clip or a lower bitrate.`);
    }
    setBusy(true);
    try {
      stopPreview();
      onChange(stored ? await uploadAudio(clip) : await readAudio(clip as File), isVoice);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      await save(file, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const options = [
    ...tracks.map((track) => ({
      value: `track:${track.id}`,
      label: track.name,
      detail: track.mood,
      src: track.src as string | null,
    })),
    ...(own
      ? [
          {
            value,
            label: voice ? 'Your voice note' : 'Your track',
            detail: voice ? 'Recorded' : 'Uploaded',
            src: soundtrackSrc(value, tracks),
          },
        ]
      : []),
    { value: '', label: 'No music', detail: 'Let the cards speak', src: null },
  ];

  return (
    <div className="grid gap-2">
      <div role="radiogroup" aria-label="Soundtrack" className="grid gap-2">
        {options.map((option) => {
          const on = option.value === value;
          const playable = option.src || option.value.startsWith('storage:');
          return (
            <div
              key={option.label}
              className={`flex min-h-[3.25rem] items-center gap-3 rounded-2xl border px-3 py-2 ${on ? t.rowOn : t.row}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(option.value, on && voice)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f9a8d4]"
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${on ? t.boxOn : t.box}`}
                >
                  {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[14.5px] font-semibold leading-tight ${t.label}`}>
                    {option.label}
                  </span>
                  <span className={`block text-[12.5px] leading-snug ${t.detail}`}>
                    {option.detail}
                  </span>
                </span>
              </button>
              {playable ? (
                <button
                  type="button"
                  onClick={() => void togglePreview(option.label, option.value, option.src)}
                  aria-label={`${previewing === option.label ? 'Stop' : 'Preview'} ${option.label}`}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border focus-visible:outline focus-visible:outline-2 ${t.button}`}
                >
                  {previewing === option.label ? (
                    <Pause className="h-4 w-4" aria-hidden />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 disabled:opacity-60 ${t.button}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-4 w-4" aria-hidden />
        )}
        {busy ? 'Uploading…' : `Upload your own · MP3 or M4A, up to ${MB} MB`}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={stored ? STORED_ACCEPT : 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac'}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {stored ? <VoiceRecorder t={t} onRecorded={(clip) => save(clip, true)} /> : null}
      {error ? (
        <p role="alert" className={`text-[12.5px] ${t.error}`}>
          {error}
        </p>
      ) : null}
      {voice && own && onTranscript ? (
        <label className="grid gap-1.5">
          <span className={t.field}>What you said (optional, shown as a transcript)</span>
          <textarea
            value={transcript}
            maxLength={FORMAT_LIMITS.transcript}
            rows={3}
            onChange={(e) => onTranscript(e.target.value)}
            placeholder="Happy birthday, you menace…"
            className={`${t.input} resize-none`}
          />
        </label>
      ) : null}
    </div>
  );
}
