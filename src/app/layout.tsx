
import type { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ThemeProvider } from 'next-themes';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { StreakAnimationProvider } from '@/context/StreakAnimationContext';
import StreakAnimationOverlay from '@/components/streaks/StreakAnimationOverlay';
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const sourceCodePro = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-source-code-pro',
});


export const metadata: Metadata = {
  title: 'WikiStars5',
  description: 'Explore, rate, and discuss public figures.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f4f4f5" media="(prefers-color-scheme: light)" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased', inter.variable, sourceCodePro.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <StreakAnimationProvider>
              {children}
              <Toaster />
              <StreakAnimationOverlay />
            </StreakAnimationProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
