import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import StreakAnimationOverlay from '@/components/streaks/StreakAnimationOverlay';

export const metadata: Metadata = {
  title: 'WikiStars5',
  description: 'Explore, rate, and discuss public figures.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro&display=swap"
          rel="stylesheet"
        />
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
