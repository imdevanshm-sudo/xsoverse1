import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SoundTest } from '@/app/dev/sound-test/SoundTest';
import type { GiftStyle } from '@/types/xso';

export const metadata: Metadata = {
  title: 'Sound test',
  robots: { index: false, follow: false },
};

const FORMATS: GiftStyle[] = ['loop', 'rewind', 'scrapbook', 'accordion', 'moviebox'];

/**
 * Every sound event per format, with Play buttons and measured loudness. `?viewer=<format>` opens
 * that format's real viewer on sample data instead (used by scripts/sound-checklist.mjs);
 * `&voice=1` makes the Rewind's tape a voice note; `&silent=1` gives it no soundtrack at all;
 * `&song=1` adds a sample "Our Song".
 */
export default function SoundTestPage({
  searchParams,
}: {
  searchParams: {
    viewer?: string;
    voice?: string;
    silent?: string;
    backdrop?: string;
    song?: string;
  };
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const viewer = FORMATS.find((format) => format === searchParams.viewer);
  return (
    <SoundTest
      viewer={viewer}
      voice={searchParams.voice === '1'}
      silent={searchParams.silent === '1'}
      backdrop={searchParams.backdrop === '1'}
      song={searchParams.song === '1'}
    />
  );
}
