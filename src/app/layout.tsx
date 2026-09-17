import type { Metadata } from 'next';
import {
  Courier_Prime,
  Caveat,
  Press_Start_2P,
  Space_Grotesk,
  Space_Mono,
} from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-press-start',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier-prime',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'XSO · Retro Souvenir Console',
  description:
    'Choose your cartridge and build a one-of-one XSO souvenir — Loop, Rewind, Scrapbook, Accordion, or Movie Box.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${pressStart.variable} ${spaceMono.variable} ${courierPrime.variable} ${caveat.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
