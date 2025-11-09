
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
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f4f4f5" media="(prefers-color-scheme: light)" />
        {/* Force unregister any stuck service workers */}
        <Script id="service-worker-unregister" strategy="beforeInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                  console.log('Service Worker unregistered: ', registration);
                }
              });
            }
          `}
        </Script>
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
