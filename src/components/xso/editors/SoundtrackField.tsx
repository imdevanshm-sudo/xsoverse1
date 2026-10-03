'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, Upload } from 'lucide-react';
import type { Tone } from '@/components/xso/editors/kit';
import { readAudio } from '@/lib/media';
import { SOUNDTRACKS, SOUNDTRACK_UPLOAD_MAX_BYTES, soundtrackSrc } from '@/lib/soundtracks';

const MB = (SOUNDTRACK_UPLOAD_MAX_BYTES / 1_000_000).toFixed(0);

/** Pick the Movie Box score: a bundled track, the sender's own upload, or silence. */
export function SoundtrackField({
  t,
  value,
  onChange,
}: {
  t: Tone;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploaded = value.startsWith('data:audio/');

  const stopPreview = () => {
    preview.current?.pause();
    preview.current = null;
    setPreviewing(null);
  };
  useEffect(() => stopPreview, []);

  const togglePreview = (id: string, src: string) => {
    if (previewing === id) return stopPreview();
    stopPreview();
    const node = new Audio(src);
    node.volume = 0.6;
    preview.current = node;
    node.onended = stopPreview;
    node
      .play()
      .then(() => setPreviewing(id))
      .catch(() => {
        setError('That track isn’t available yet.');
        stopPreview();
      });
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > SOUNDTRACK_UPLOAD_MAX_BYTES) {
      setError(`Your track must be under ${MB} MB. Try a shorter clip or a lower bitrate.`);
      return;
    }
    try {
      onChange(await readAudio(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const options = [
    ...SOUNDTRACKS.map((track) => ({
      value: `track:${track.id}`,
      label: track.name,
      detail: track.mood,
      src: track.src,
    })),
    ...(uploaded
      ? [{ value, label: 'Your track', detail: 'Uploaded', src: soundtrackSrc(value) ?? '' }]
      : []),
    { value: '', label: 'No music', detail: 'Let the scenes speak', src: '' },
  ];

  return (
    <div className="grid gap-2">
      <div role="radiogroup" aria-label="Soundtrack" className="grid gap-2">
        {options.map((option) => {
          const on = option.value === value;
          return (
            <div
              key={option.label}
              className={`flex min-h-[3.25rem] items-center gap-3 rounded-2xl border px-3 py-2 ${on ? t.rowOn : t.row}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(option.value)}
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
              {option.src ? (
                <button
                  type="button"
                  onClick={() => togglePreview(option.label, option.src)}
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
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 font-receipt text-[11px] font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 ${t.button}`}
      >
        <Upload className="h-4 w-4" aria-hidden />
        Upload your own · MP3 or M4A, up to {MB} MB
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error ? (
        <p role="alert" className={`text-[12.5px] ${t.error}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
