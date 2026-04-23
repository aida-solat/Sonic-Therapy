import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ToastProvider } from '@/components/toast';
import './globals.css';

const display = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const body = Geist({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-body',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Sonic Therapy — Personalized Music Therapy Powered by AI',
  description:
    'Personalized AI-powered music therapy with binaural beat entrainment, Solfeggio frequencies, and cultural healing traditions. Built by Deciwa.',
  metadataBase: new URL('https://sonic.deciwa.com'),
  openGraph: {
    title: 'Sonic Therapy — Personalized Music Therapy Powered by AI',
    description:
      'Personalized AI music therapy — binaural beats, Solfeggio frequencies, RAG-augmented prompt engineering, multi-model orchestration.',
    siteName: 'Sonic Therapy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonic Therapy — Personalized Music Therapy Powered by AI',
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
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
