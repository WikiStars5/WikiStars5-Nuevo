
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import StreakAnimationOverlay from '@/components/streaks/StreakAnimationOverlay';

const logoUrl = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6";

export const metadata: Metadata = {
  title: 'WikiStars5',
  description: 'Explore, rate, and discuss public figures.',
  manifest: '/manifest.json',
  icons: {
    icon: {
      url: logoUrl,
      type: 'image/png',
    },
    shortcut: {
      url: logoUrl,
      type: 'image/png',
    },
    apple: {
      url: logoUrl,
      type: 'image/png',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f4f4f5" media="(prefers-color-scheme: light)" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased')}>
        <Providers>
          {children}
          <Toaster />
          <StreakAnimationOverlay />
        </Providers>
      </body>
    </html>
  );
}
