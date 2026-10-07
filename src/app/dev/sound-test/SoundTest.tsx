'use client';

import { useMemo, useRef, useState } from 'react';
import { GiftUnboxing } from '@/components/xso/GiftUnboxing';
import { SoundToggle } from '@/components/xso/stage/SoundToggle';
import { wrapperOf } from '@/lib/giftWrapper';
import {
  DUCK_DB,
  LEVELS,
  REFERENCE_LUFS,
  SOUND_EVENTS,
  attachMedia,
  inspectSound,
  mediaElement,
  optIn,
  playSound,
  texture,
  useSoundSurface,
  type MediaHandle,
  type SoundEvent,
  type SoundFormat,
  type SoundReport,
  type Texture,
} from '@/lib/sound';
import { MIXTAPE_TRACKS, SOUNDTRACKS } from '@/lib/soundtracks';
import { getMockXsoData, type GiftStyle, type XsoData } from '@/types/xso';

const SECTIONS: { format: SoundFormat; title: string }[] = [
  { format: 'shared', title: 'Shared (unwrap, photos, scratch-off, audit, letters)' },
  { format: 'loop', title: 'Loop' },
  { format: 'rewind', title: 'Rewind' },
  { format: 'scrapbook', title: 'Scrapbook' },
  { format: 'accordion', title: 'Accordion' },
  { format: 'moviebox', title: 'Movie Box' },
  { format: 'wizard', title: 'Wizard' },
];

const EVENTS = Object.keys(SOUND_EVENTS) as SoundEvent[];
const fmt = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

export function SoundTest({ viewer, voice }: { viewer?: GiftStyle; voice: boolean }) {
  useSoundSurface();
  if (viewer) return <ViewerHarness style={viewer} voice={voice} />;
  return <EventBoard />;
}

/** One format's real recipient flow on sample data, plus a way to close it. */
function ViewerHarness({ style, voice }: { style: GiftStyle; voice: boolean }) {
  const [open, setOpen] = useState(true);
  const data = useMemo<XsoData>(() => {
    const mock = getMockXsoData();
    return {
      ...mock,
      id: 'sound-test',
      giftStyle: style,
      rewind: {
        sideA: 'Side A',
        sideB: 'The ones we replay',
        tapeDate: '2026',
        review: 'Five stars, would rewind again.',
        soundtrack: voice ? 'track:slow-jam' : 'track:cassette-summer',
        voice,
        transcript: voice ? 'Happy birthday!' : '',
      },
    };
  }, [style, voice]);
  return (
    <main className="fixed inset-0 bg-black">
      {open ? (
        <GiftUnboxing giftId="sound-test" wrapper={wrapperOf('sound-test', data)} draft={data} />
      ) : (
        <p className="p-6 font-receipt text-white/70">Viewer closed.</p>
      )}
      <button
        type="button"
        data-testid="close-viewer"
        onClick={() => setOpen((on) => !on)}
        className="fixed bottom-2 left-2 z-[90] rounded bg-white/10 px-2 py-1 font-receipt text-[10px] uppercase tracking-widest text-white/60"
      >
        {open ? 'Close viewer' : 'Reopen viewer'}
      </button>
    </main>
  );
}

function EventBoard() {
  const [reports, setReports] = useState<Partial<Record<SoundEvent, SoundReport>>>({});
  const loops = useRef<Partial<Record<SoundEvent, Texture>>>({});
  const [running, setRunning] = useState<Partial<Record<SoundEvent, boolean>>>({});
  const music = useRef<{ src: string; node: HTMLAudioElement; mix: MediaHandle } | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const measure = async (events: SoundEvent[]) => {
    optIn();
    for (const event of events) {
      const report = await inspectSound(event);
      if (report) setReports((current) => ({ ...current, [event]: report }));
    }
  };

  const play = (event: SoundEvent) => {
    optIn();
    void measure([event]);
    if (!SOUND_EVENTS[event].loop) return playSound(event);
    const handle = (loops.current[event] ??= texture(event));
    if (running[event]) {
      handle.stop();
      setRunning((r) => ({ ...r, [event]: false }));
    } else {
      handle.touch();
      setRunning((r) => ({ ...r, [event]: true }));
    }
  };

  const playTrack = (src: string, lufs: number) => {
    optIn();
    const current = music.current;
    current?.mix.release();
    music.current = null;
    if (current?.src === src) return setPlayingTrack(null);
    const node = mediaElement(src);
    music.current = { src, node, mix: attachMedia(node, 'music', lufs) };
    void node.play();
    setPlayingTrack(src);
  };

  return (
    <main className="min-h-screen bg-[#140b10] px-4 pb-24 pt-20 font-sans text-[#fdf2f8] sm:px-8">
      <SoundToggle labeled />
      <h1 className="font-serif text-3xl font-semibold">Sound test</h1>
      <p className="mt-2 max-w-3xl text-sm text-[#e9c9b4]">
        Every named event in <code>lib/sound.ts</code>. Loudness is BS.1770 K-weighted: momentary
        maximum (400 ms) for effects, gated integrated for loops and music. Effects are levelled to
        a {REFERENCE_LUFS} LUFS reference: ticks {LEVELS.tick} dB, paper {LEVELS.paper} dB, impacts
        and chimes at reference, music {fmt(LEVELS.music)} dB (ducked {DUCK_DB} dB under effects and
        voice), voice notes {fmt(LEVELS.voice)} dB and never ducked. &ldquo;Source&rdquo; shows
        whether a recorded file or the synthesized placeholder is playing.
      </p>
      <button
        type="button"
        data-testid="measure-all"
        onClick={() => void measure(EVENTS)}
        className="mt-4 rounded-full bg-[#fdba74] px-4 py-2 text-sm font-bold text-[#2a1408]"
      >
        Measure all
      </button>

      {SECTIONS.map(({ format, title }) => (
        <section key={format} className="mt-10" aria-labelledby={`sound-${format}`}>
          <h2 id={`sound-${format}`} className="font-serif text-xl font-semibold">
            {title}
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <thead className="font-receipt text-[11px] uppercase tracking-widest text-[#c99aae]">
                <tr>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Sounds like</th>
                  <th className="py-2 pr-3">Length</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Measured</th>
                  <th className="py-2 pr-3">Gain</th>
                  <th className="py-2 pr-3">Peak</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {EVENTS.filter((event) => SOUND_EVENTS[event].format === format).map((event) => {
                  const spec = SOUND_EVENTS[event];
                  const report = reports[event];
                  return (
                    <tr key={event} className="border-t border-white/10" data-event={event}>
                      <td className="py-2 pr-3 font-mono">{event}</td>
                      <td className="py-2 pr-3 text-[#e9c9b4]">{spec.style}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {spec.ms} ms{'loop' in spec && spec.loop ? ' loop' : ''}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {report ? report.targetLufs.toFixed(1) : '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums" data-measured>
                        {report ? `${report.outLufs.toFixed(1)} LUFS` : '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {report ? `${fmt(report.gainDb)} dB` : '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {report ? `${report.peakDb.toFixed(1)} dBFS` : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {report
                          ? report.source === 'file'
                            ? spec.file
                            : 'synth placeholder'
                          : '—'}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => play(event)}
                          className="rounded-full border border-white/20 px-3 py-1 text-[12px] hover:bg-white/10"
                        >
                          {'loop' in spec && spec.loop
                            ? running[event]
                              ? 'Stop'
                              : 'Loop'
                            : 'Play'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-10" aria-labelledby="sound-music">
        <h2 id="sound-music" className="font-serif text-xl font-semibold">
          Music (Movie Box and Rewind)
        </h2>
        <p className="mt-1 text-sm text-[#e9c9b4]">
          Target {REFERENCE_LUFS + LEVELS.music} LUFS integrated; each track&apos;s measured
          loudness lives in <code>lib/soundtracks.ts</code>.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[...SOUNDTRACKS, ...MIXTAPE_TRACKS].map((track) => (
            <li
              key={track.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-[13px]"
            >
              <span>
                {track.name} · {track.mood} ·{' '}
                <span className="tabular-nums">{track.lufs.toFixed(1)} LUFS</span>
              </span>
              <button
                type="button"
                onClick={() => playTrack(track.src, track.lufs)}
                className="rounded-full border border-white/20 px-3 py-1 text-[12px] hover:bg-white/10"
              >
                {playingTrack === track.src ? 'Stop' : 'Play'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
