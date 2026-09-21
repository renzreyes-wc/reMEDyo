import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SessionProvider } from '@/features/auth/session';

export const metadata: Metadata = {
  title: {
    default: 'reMEDyo — Talk to a doctor, without the waiting room',
    template: '%s · reMEDyo',
  },
  description:
    'reMEDyo is a telehealth prototype: find a doctor by specialization or symptom, book a consultation, meet online, and keep every note and prescription in one place.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#12856e',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
