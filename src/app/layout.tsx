import type { Metadata, Viewport } from 'next';
import {
  Courier_Prime,
  Caveat,
  Fraunces,
  Press_Start_2P,
  Space_Grotesk,
  Space_Mono,
} from 'next/font/google';
import { OrientationRoot } from '@/components/layout/OrientationRoot';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: true,
});

const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-press-start',
  display: 'swap',
  preload: false,
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
  preload: false,
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier-prime',
  display: 'swap',
  preload: false,
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-caveat',
  display: 'swap',
  preload: false,
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  preload: false,
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'XSO · Keepsakes for unsaid words',
  description:
    'An XSO is an experience turned souvenir: the feelings you couldn’t quite voice, pressed into a receipt, an audit, a photo strip and a letter they can hold.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'XSO',
  },
  formatDetection: {
    telephone: false,
  },
};

/**
 * Portrait-first handheld console, but landscape is allowed and adapted.
 * Works in Instagram / Safari / Chrome / legacy WebViews.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0f12' },
    { media: '(prefers-color-scheme: light)', color: '#0b0f12' },
  ],
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${pressStart.variable} ${spaceMono.variable} ${courierPrime.variable} ${caveat.variable} ${fraunces.variable}`}
    >
      <body className="font-sans xso-safe-shell">
        <OrientationRoot />
        {children}
      </body>
    </html>
  );
}
