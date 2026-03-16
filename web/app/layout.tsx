import type { Metadata } from 'next';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';

import { ToastProvider } from '@/components/toast';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Sonic Therapy Platform',
  description:
    'Personalized AI-powered music therapy with binaural beat entrainment, Solfeggio frequencies, and cultural healing traditions. Built by Deciwa.',
  metadataBase: new URL('https://sonic.deciwa.com'),
  openGraph: {
    title: 'Sonic Therapy Platform',
    description:
      'Personalized AI music therapy — binaural beats, Solfeggio frequencies, RAG-augmented prompt engineering, multi-model orchestration.',
    siteName: 'Sonic Therapy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonic Therapy Platform',
    description:
      'Personalized AI music therapy — binaural beats, Solfeggio frequencies, RAG-augmented prompt engineering.',
  },
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="ambient">
      <body className={`${display.variable} ${body.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
