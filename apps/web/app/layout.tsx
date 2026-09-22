import type { Metadata, Viewport } from 'next';
import { Fraunces, Nunito_Sans } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/features/auth/session';

/**
 * Typefaces.
 *
 * next/font downloads these at build time and serves them from this origin,
 * so no request ever leaves for a font host — which is what the self-hosted
 * assets requirement asks for. It also emits a real CSS variable, replacing
 * the `--font-inter` the stylesheet used to reference and that nothing ever
 * defined: every screen had been silently falling back to the system font.
 */
// Variable font: omitting `weight` pulls the whole axis range in one file,
// which is what lets the headings use several weights without several loads.
// (next/font rejects `axes` alongside an explicit weight list.)
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK'],
});

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  title: {
    default: 'reMEDyo — Talk to a doctor, without the waiting room',
    template: '%s · reMEDyo',
  },
  description:
    'reMEDyo is a telehealth prototype: find a doctor by specialization or symptom, book a consultation, meet online, and keep every note and prescription in one place.',
  applicationName: 'reMEDyo',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'reMEDyo',
    title: 'reMEDyo — Talk to a doctor, without the waiting room',
    description:
      'Find the right doctor for what is actually worrying you, book a consultation, meet online, and keep every note and prescription in one place.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'reMEDyo — telehealth, end to end',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'reMEDyo — Talk to a doctor, without the waiting room',
    description:
      'Find the right doctor for what is actually worrying you, book a consultation, and keep the record.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d7c62',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunitoSans.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
